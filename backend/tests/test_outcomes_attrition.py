from datetime import date
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.employer import Employer
from src.models.learner import Learner
from src.models.placement import Placement, RetentionCheckpoint


@pytest.mark.asyncio
async def test_non_placement_reason_tracking(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_msde: dict,
    seed_district,
    seed_training_center,
):
    """Verifies documenting non-placement diagnostic bottlenecks."""
    learner_id = f"KN-TEST-NONPLC-{seed_district.id[-4:]}"
    learner = Learner(
        id=learner_id,
        full_name="Kavita Non-Placement Test",
        email=f"kavita.{seed_district.id[-4:].lower()}@example.com",
        district_id=seed_district.id,
        training_center_id=seed_training_center.id,
        status="Assessment Passed",
        employment_readiness_score=68,
        overall_progress=80,
    )
    db.add(learner)
    await db.commit()

    # Record non-placement reason: SKILL_GAP
    resp_create = await client.post(
        f"/api/v1/learners/{learner_id}/non-placement-reasons",
        headers=auth_headers_msde,
        json={
            "reason": "SKILL_GAP",
            "source": "TRAINING_PROVIDER",
            "notes": "Candidate struggled in technical coding round with dynamic arrays and cloud deployment.",
            "associated_skill_code": "COMP-GENAI-01",
        },
    )
    assert resp_create.status_code == 201
    created_data = resp_create.json()
    assert created_data["reason"] == "SKILL_GAP"
    assert created_data["associated_skill_code"] == "COMP-GENAI-01"

    # Query list of reasons
    resp_list = await client.get(
        f"/api/v1/learners/{learner_id}/non-placement-reasons",
        headers=auth_headers_msde,
    )
    assert resp_list.status_code == 200
    reasons = resp_list.json()
    assert len(reasons) >= 1
    assert reasons[0]["reason"] == "SKILL_GAP"


@pytest.mark.asyncio
async def test_placement_separation_attrition_tracking(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_msde: dict,
    seed_district,
    seed_training_center,
):
    """
    Verifies recording employee job departure / separation,
    updating placement status to 'Separated', and marking retention checkpoints.
    """
    # 1. Create Learner & Employer
    learner_id = f"KN-TEST-SEP-{seed_district.id[-4:]}"
    learner = Learner(
        id=learner_id,
        full_name="Anil Separation Test",
        email=f"anil.{seed_district.id[-4:].lower()}@example.com",
        district_id=seed_district.id,
        training_center_id=seed_training_center.id,
        status="Placed & Verified",
        employment_readiness_score=88,
        overall_progress=100,
    )
    db.add(learner)

    employer = Employer(
        company_name="Apex Engineering Corp",
        industry_sector="Smart Manufacturing",
        contact_email=f"hr.{seed_district.id[-4:].lower()}@apex.example.com",
    )
    db.add(employer)
    await db.commit()

    # 2. Create Placement
    placement = Placement(
        learner_id=learner_id,
        employer_id=employer.id,
        job_title="Junior Automation Technician",
        joined_date=date(2026, 1, 15),
        starting_ctc_lpa=4.2,
        current_ctc_lpa=4.2,
        employment_type="Full-Time",
        status="Active",
    )
    db.add(placement)
    await db.flush()

    # Checkpoint for 3M
    checkpoint_3m = RetentionCheckpoint(
        placement_id=placement.id,
        checkpoint_type="3M",
        milestone_months=3,
        checkpoint_date=date(2026, 4, 15),
        is_active_at_checkpoint=True,
        epfo_verified=True,
        current_ctc_lpa=4.2,
        wage_increment_percentage=0.0,
        verification_status="VERIFIED",
    )
    db.add(checkpoint_3m)
    await db.commit()

    # 3. Record separation event
    resp_sep = await client.post(
        f"/api/v1/placements/{placement.id}/separations",
        headers=auth_headers_msde,
        json={
            "checkpoint_id": str(checkpoint_3m.id),
            "reason": "BETTER_OPPORTUNITY",
            "separation_date": "2026-04-10",
            "source": "EMPLOYER",
            "notes": "Candidate transitioned to higher-paying OEM supplier in Pune.",
        },
    )
    assert resp_sep.status_code == 201
    sep_data = resp_sep.json()
    assert sep_data["reason"] == "BETTER_OPPORTUNITY"

    # 4. Verify Placement is now Separated
    await db.refresh(placement)
    assert placement.status == "Separated"

    # 5. Verify Checkpoint is now marked Inactive / Separated
    await db.refresh(checkpoint_3m)
    assert checkpoint_3m.is_active_at_checkpoint is False
    assert checkpoint_3m.verification_status == "SEPARATED"

    # 6. List separations for placement
    resp_list = await client.get(
        f"/api/v1/placements/{placement.id}/separations",
        headers=auth_headers_msde,
    )
    assert resp_list.status_code == 200
    separations = resp_list.json()
    assert len(separations) >= 1
    assert separations[0]["reason"] == "BETTER_OPPORTUNITY"
