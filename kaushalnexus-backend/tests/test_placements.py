from datetime import date, datetime, timedelta, timezone
import uuid
import pytest
from httpx import AsyncClient

from src.core.database import AsyncSessionLocal
from src.models.district import District
from src.models.employer import Employer, HiringMandate
from src.models.learner import Learner
from src.models.placement import Placement, RetentionCheckpoint
from src.services.epfo_service import (
    EPFOVerificationResult,
    IEPFOVerificationProvider,
    MockEPFOVerificationService,
    epfo_service,
)
from src.services.placement_service import PlacementService


# ==============================================================================
# Unit Tests: Mathematical & Analytical Retention Calculations
# ==============================================================================

def test_wage_increment_calculations():
    """Verify mathematical accuracy of wage growth percentage calculations."""
    # Zero increment (same wage)
    assert PlacementService.calculate_wage_increment(4.0, 4.0) == 0.0

    # Positive wage growth: 3.0 -> 3.6 LPA (+20.0%)
    assert PlacementService.calculate_wage_increment(3.0, 3.6) == 20.0

    # 4.5 -> 5.4 LPA (+20.0%)
    assert PlacementService.calculate_wage_increment(4.5, 5.4) == 20.0

    # 5.0 -> 6.25 LPA (+25.0%)
    assert PlacementService.calculate_wage_increment(5.0, 6.25) == 25.0

    # Precision rounding: 3.0 -> 3.35 LPA (+11.67%)
    assert PlacementService.calculate_wage_increment(3.0, 3.35) == 11.67

    # Edge case: zero base CTC
    assert PlacementService.calculate_wage_increment(0.0, 4.0) == 0.0


def test_checkpoint_milestone_dates():
    """Verify milestone calendar intervals for 3M, 6M, and 12M checkpoints."""
    join_date = date(2026, 1, 15)

    cp_3m = PlacementService.calculate_checkpoint_date(join_date, 3)
    assert cp_3m == join_date + timedelta(days=90)
    assert cp_3m == date(2026, 4, 15)

    cp_6m = PlacementService.calculate_checkpoint_date(join_date, 6)
    assert cp_6m == join_date + timedelta(days=180)
    assert cp_6m == date(2026, 7, 14)

    cp_12m = PlacementService.calculate_checkpoint_date(join_date, 12)
    assert cp_12m == join_date + timedelta(days=365)
    assert cp_12m == date(2027, 1, 15)


def test_retention_milestone_evaluation():
    """Verify milestone status classification based on active checkpoints."""
    dummy_placement_id = uuid.uuid4()
    today = date.today()

    # Case 1: 3M active
    cps_3m = [
        RetentionCheckpoint(
            placement_id=dummy_placement_id,
            checkpoint_type="3M",
            milestone_months=3,
            checkpoint_date=today,
            is_active_at_checkpoint=True,
            current_ctc_lpa=4.0,
        )
    ]
    assert PlacementService.evaluate_retention_milestone_status(cps_3m) == "3M Retained"

    # Case 2: 6M active
    cps_6m = [
        RetentionCheckpoint(
            placement_id=dummy_placement_id,
            checkpoint_type="3M",
            milestone_months=3,
            checkpoint_date=today,
            is_active_at_checkpoint=True,
            current_ctc_lpa=4.0,
        ),
        RetentionCheckpoint(
            placement_id=dummy_placement_id,
            checkpoint_type="6M",
            milestone_months=6,
            checkpoint_date=today,
            is_active_at_checkpoint=True,
            current_ctc_lpa=4.5,
        ),
    ]
    assert PlacementService.evaluate_retention_milestone_status(cps_6m) == "6M Retained"

    # Case 3: Separation occurred
    cps_sep = [
        RetentionCheckpoint(
            placement_id=dummy_placement_id,
            checkpoint_type="3M",
            milestone_months=3,
            checkpoint_date=today,
            is_active_at_checkpoint=True,
            current_ctc_lpa=4.0,
        ),
        RetentionCheckpoint(
            placement_id=dummy_placement_id,
            checkpoint_type="6M",
            milestone_months=6,
            checkpoint_date=today,
            is_active_at_checkpoint=False,
            current_ctc_lpa=4.0,
        ),
    ]
    assert PlacementService.evaluate_retention_milestone_status(cps_sep) == "Separated"


# ==============================================================================
# Unit Tests: Mock EPFO Verification Provider Interface
# ==============================================================================

@pytest.mark.asyncio
async def test_mock_epfo_service_interface():
    """Verify IEPFOVerificationProvider adherence and mock response generation."""
    provider: IEPFOVerificationProvider = MockEPFOVerificationService()

    # 1. Successful employment verification
    res = await provider.verify_employment(
        uan="101987654321",
        employer_name="Infosys BPM India",
        joined_date=date(2026, 2, 1),
        starting_ctc_lpa=4.2,
    )
    assert isinstance(res, EPFOVerificationResult)
    assert res.is_valid is True
    assert res.status == "VERIFIED"
    assert res.uan == "101987654321"
    assert "Infosys BPM India" in res.establishment_name
    assert res.active_contributing is True
    assert len(res.contributions) >= 1
    assert res.contributions[0].epf_employee_share > 0

    # 2. Milestone continuous contribution verification
    ret_res = await provider.verify_milestone_retention(
        uan="101987654321",
        employer_name="Infosys BPM India",
        milestone_months=6,
        checkpoint_date=date(2026, 8, 1),
        expected_ctc_lpa=4.8,
    )
    assert ret_res.is_valid is True
    assert ret_res.status == "VERIFIED"
    assert ret_res.verified_months_count == 6
    assert len(ret_res.contributions) == 6

    # 3. Invalid UAN handling
    invalid_res = await provider.verify_employment(
        uan="INVALID-UAN-000",
        employer_name="Unknown Corp",
        joined_date=date(2026, 2, 1),
        starting_ctc_lpa=3.5,
    )
    assert invalid_res.is_valid is False
    assert invalid_res.status == "FAILED"


# ==============================================================================
# API Integration Test Fixtures
# ==============================================================================

@pytest.fixture(scope="session")
async def seeded_placement_test_data():
    """Seed prerequisite District, Employer, Mandate, Learner, and Placement for placement tests."""
    async with AsyncSessionLocal() as session:
        district_id = f"UP-PLC-{uuid.uuid4().hex[:6]}"
        district = District(
            id=district_id,
            name="Noida Skilling Hub",
            state="Uttar Pradesh",
            region="Western UP",
            tier="Tier 1",
        )
        session.add(district)
        await session.flush()

        employer = Employer(
            company_name="Tata Consultancy Engineering",
            industry_sector="IT-ITeS",
            tier="Enterprise",
            contact_email="talent@tataconsultancy.in",
            contact_person="Vikram Malhotra",
        )
        session.add(employer)
        await session.flush()

        mandate = HiringMandate(
            employer_id=employer.id,
            job_title="Associate Cloud Systems Administrator",
            sector="IT-ITeS",
            district_id=district.id,
            state="Uttar Pradesh",
            openings_count=25,
            salary_min_lpa=3.8,
            salary_max_lpa=5.5,
            is_active=True,
        )
        session.add(mandate)
        await session.flush()

        learner_id = f"KN-PLC-{uuid.uuid4().hex[:6]}"
        learner = Learner(
            id=learner_id,
            full_name="Aarav Rathi",
            district_id=district.id,
            employment_readiness_score=92,
            overall_progress=100,
            status="Interview Ready",
        )
        session.add(learner)
        await session.flush()

        # Base Placement
        join_dt = date(2026, 1, 15)
        placement = Placement(
            learner_id=learner.id,
            employer_id=employer.id,
            hiring_mandate_id=mandate.id,
            job_title=mandate.job_title,
            joined_date=join_dt,
            starting_ctc_lpa=4.5,
            current_ctc_lpa=4.5,
            employment_type="Full-Time",
            status="Active",
            uan="101998877665",
            epfo_verification_status="VERIFIED",
            epfo_last_verified_at=datetime.now(timezone.utc),
            epfo_transaction_ref="EPFO-INIT-TST001",
        )
        session.add(placement)
        await session.flush()

        # Checkpoints (3M, 6M, 12M)
        cp_3m = RetentionCheckpoint(
            placement_id=placement.id,
            checkpoint_type="3M",
            milestone_months=3,
            checkpoint_date=join_dt + timedelta(days=90),
            is_active_at_checkpoint=True,
            epfo_verified=True,
            current_ctc_lpa=4.5,
            wage_increment_percentage=0.0,
            epfo_contribution_months=3,
            verification_status="VERIFIED",
            remarks="Initial 3M checkpoint verified.",
            evaluated_at=datetime.now(timezone.utc),
        )
        cp_6m = RetentionCheckpoint(
            placement_id=placement.id,
            checkpoint_type="6M",
            milestone_months=6,
            checkpoint_date=join_dt + timedelta(days=180),
            is_active_at_checkpoint=True,
            epfo_verified=True,
            current_ctc_lpa=4.5,
            wage_increment_percentage=0.0,
            epfo_contribution_months=6,
            verification_status="VERIFIED",
            remarks="6M checkpoint initialized.",
            evaluated_at=datetime.now(timezone.utc),
        )
        cp_12m = RetentionCheckpoint(
            placement_id=placement.id,
            checkpoint_type="12M",
            milestone_months=12,
            checkpoint_date=join_dt + timedelta(days=365),
            is_active_at_checkpoint=True,
            epfo_verified=True,
            current_ctc_lpa=4.5,
            wage_increment_percentage=0.0,
            epfo_contribution_months=12,
            verification_status="VERIFIED",
            remarks="12M checkpoint initialized.",
            evaluated_at=datetime.now(timezone.utc),
        )
        session.add_all([cp_3m, cp_6m, cp_12m])
        await session.commit()

        return {
            "district_id": district.id,
            "employer_id": str(employer.id),
            "employer_name": employer.company_name,
            "mandate_id": str(mandate.id),
            "learner_id": learner.id,
            "learner_name": learner.full_name,
            "placement_id": str(placement.id),
        }


# ==============================================================================
# End-to-End API Integration Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_create_placement_api(
    client: AsyncClient, auth_headers: dict, seeded_placement_test_data: dict
):
    """Test POST /api/v1/placements creates placement, runs mock EPFO, and sets 3M/6M/12M checkpoints."""
    # Create another fresh learner for testing new creation
    payload = {
        "learner_id": seeded_placement_test_data["learner_id"],
        "employer_id": seeded_placement_test_data["employer_id"],
        "hiring_mandate_id": seeded_placement_test_data["mandate_id"],
        "job_title": "Associate Cloud Systems Administrator",
        "joined_date": "2026-03-01",
        "starting_ctc_lpa": 4.5,
        "uan": "101998877665",
        "auto_verify_epfo": True,
    }

    resp = await client.post(
        "/api/v1/placements",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()

    assert data["learner_id"] == seeded_placement_test_data["learner_id"]
    assert data["employer_name"] == seeded_placement_test_data["employer_name"]
    assert data["starting_ctc_lpa"] == 4.5
    assert data["current_ctc_lpa"] == 4.5
    assert data["status"] == "Active"
    assert data["epfo_verification_status"] == "VERIFIED"
    assert data["uan"] == "101998877665"
    assert "epfo_last_verified_at" in data

    # Verify 3 standard checkpoints (3M, 6M, 12M) created automatically
    checkpoints = data["checkpoints"]
    assert len(checkpoints) == 3
    cp_types = [cp["checkpoint_type"] for cp in checkpoints]
    assert "3M" in cp_types
    assert "6M" in cp_types
    assert "12M" in cp_types

    # 3M checkpoint validation
    cp_3m = next(cp for cp in checkpoints if cp["checkpoint_type"] == "3M")
    assert cp_3m["milestone_months"] == 3
    assert cp_3m["checkpoint_date"] == "2026-05-30"  # 2026-03-01 + 90 days
    assert cp_3m["is_active_at_checkpoint"] is True
    assert cp_3m["epfo_verified"] is True
    assert cp_3m["wage_increment_percentage"] == 0.0


@pytest.mark.asyncio
async def test_get_learner_placements_api(
    client: AsyncClient, auth_headers: dict, seeded_placement_test_data: dict
):
    """Test GET /api/v1/placements/{learner_id} returns all candidate placement dossiers."""
    learner_id = seeded_placement_test_data["learner_id"]

    resp = await client.get(
        f"/api/v1/placements/{learner_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    placements = resp.json()
    assert isinstance(placements, list)
    assert len(placements) >= 1

    first = placements[0]
    assert first["learner_id"] == learner_id
    assert first["employer_name"] == seeded_placement_test_data["employer_name"]
    assert first["starting_ctc_lpa"] == 4.5
    assert first["epfo_verification_status"] == "VERIFIED"
    assert first["checkpoints_count"] == 3


@pytest.mark.asyncio
async def test_get_placement_retention_audit_api(
    client: AsyncClient, auth_headers: dict, seeded_placement_test_data: dict
):
    """Test GET /api/v1/placements/{placement_id}/retention returns longitudinal breakdown."""
    placement_id = seeded_placement_test_data["placement_id"]
    learner_id = seeded_placement_test_data["learner_id"]

    # Fetch retention audit
    resp = await client.get(
        f"/api/v1/placements/{placement_id}/retention",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    audit = resp.json()

    assert audit["placement_id"] == placement_id
    assert audit["learner_id"] == learner_id
    assert audit["employer_name"] == seeded_placement_test_data["employer_name"]
    assert audit["starting_ctc_lpa"] == 4.5
    assert audit["total_wage_increment_percentage"] == 0.0
    assert audit["epfo_verification_status"] == "VERIFIED"
    assert len(audit["checkpoints"]) == 3


@pytest.mark.asyncio
async def test_update_retention_checkpoint_and_wage_growth(
    client: AsyncClient, auth_headers: dict, seeded_placement_test_data: dict
):
    """Test PUT /api/v1/placements/{id}/retention/6M updates CTC, calculates +20% wage growth, and sets 180-day retention."""
    placement_id = seeded_placement_test_data["placement_id"]

    # Update 6M checkpoint: starting CTC was 4.5 LPA, incrementing to 5.4 LPA (+20.0%)
    update_payload = {
        "is_active_at_checkpoint": True,
        "current_ctc_lpa": 5.4,
        "remarks": "Promoted to Cloud Systems Engineer II with 20% appraisal.",
    }

    resp = await client.put(
        f"/api/v1/placements/{placement_id}/retention/6M",
        json=update_payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    cp_data = resp.json()

    assert cp_data["checkpoint_type"] == "6M"
    assert cp_data["current_ctc_lpa"] == 5.4
    assert cp_data["wage_increment_percentage"] == 20.0  # ((5.4 - 4.5) / 4.5) * 100 = 20.0%
    assert cp_data["is_active_at_checkpoint"] is True

    # Re-verify retention audit endpoint
    audit_resp = await client.get(
        f"/api/v1/placements/{placement_id}/retention",
        headers=auth_headers,
    )
    assert audit_resp.status_code == 200
    audit = audit_resp.json()
    assert audit["current_ctc_lpa"] == 5.4
    assert audit["total_wage_increment_percentage"] == 20.0
    assert audit["retention_milestone_achieved"] == "6M Retained"


@pytest.mark.asyncio
async def test_placement_validation_errors(
    client: AsyncClient, auth_headers: dict
):
    """Test error handling for non-existent candidate or employer IDs."""
    # Invalid candidate
    resp1 = await client.post(
        "/api/v1/placements",
        json={
            "learner_id": "KN-NONEXISTENT-999",
            "employer_id": str(uuid.uuid4()),
            "job_title": "Developer",
            "joined_date": "2026-03-01",
            "starting_ctc_lpa": 4.0,
        },
        headers=auth_headers,
    )
    assert resp1.status_code == 404
    data1 = resp1.json()
    assert data1["success"] is False
    assert data1["error"]["code"] == "RESOURCE_NOT_FOUND"

    # Invalid placement retention lookup
    resp2 = await client.get(
        f"/api/v1/placements/{uuid.uuid4()}/retention",
        headers=auth_headers,
    )
    assert resp2.status_code == 404
    data2 = resp2.json()
    assert data2["success"] is False
    assert data2["error"]["code"] == "RESOURCE_NOT_FOUND"
