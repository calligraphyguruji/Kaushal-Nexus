from datetime import date
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.learner import Learner


@pytest.mark.asyncio
async def test_self_employment_creation_and_verification(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_msde: dict,
    auth_headers_evaluator: dict,
    seed_district,
    seed_training_center,
):
    """
    Verifies recording a candidate's self-employment enterprise,
    retrieving venture dossiers, and field verification by an evaluator.
    """
    learner_id = f"KN-TEST-SELFEMP-{seed_district.id[-4:]}"
    learner = Learner(
        id=learner_id,
        full_name="Rajesh Verma",
        email=f"rajesh.{seed_district.id[-4:].lower()}@example.com",
        district_id=seed_district.id,
        training_center_id=seed_training_center.id,
        status="Assessment Passed",
        employment_readiness_score=85,
        overall_progress=95,
    )
    db.add(learner)
    await db.commit()

    # 1. Candidate reports self-employment outcome
    resp_create = await client.post(
        f"/api/v1/learners/{learner_id}/self-employment",
        headers=auth_headers_msde,
        json={
            "enterprise_name": "Verma Electrical & Solar Services",
            "business_activity": "Commercial Wiring & Solar Panel Inverter Setup",
            "sector": "Power & Clean Energy",
            "district_id": seed_district.id,
            "start_date": date.today().isoformat(),
            "monthly_income_range": "₹20,000 - ₹35,000",
            "business_status": "Operational",
            "notes": "Acquired registered MSME Udyam registration",
        },
    )
    assert resp_create.status_code == 201
    created_data = resp_create.json()
    outcome_id = created_data["id"]
    assert created_data["enterprise_name"] == "Verma Electrical & Solar Services"
    assert created_data["verification_status"] == "SELF_REPORTED"

    # Learner cohort status should now be updated to Self-Employed
    await db.refresh(learner)
    assert learner.status == "Self-Employed"

    # 2. Query self-employment records for learner
    resp_list = await client.get(
        f"/api/v1/learners/{learner_id}/self-employment",
        headers=auth_headers_msde,
    )
    assert resp_list.status_code == 200
    outcomes = resp_list.json()
    assert len(outcomes) >= 1
    assert any(o["id"] == outcome_id for o in outcomes)

    # 3. Evaluator / Field Assessor verifies document and physical premise
    resp_verify = await client.patch(
        f"/api/v1/learners/{learner_id}/self-employment/{outcome_id}/verify",
        headers=auth_headers_evaluator,
        json={
            "verification_status": "DOCUMENT_VERIFIED",
            "notes": "Verified Udyam certificate UDYAM-UP-12345 and physical workshop premise.",
        },
    )
    assert resp_verify.status_code == 200
    verified_data = resp_verify.json()
    assert verified_data["verification_status"] == "DOCUMENT_VERIFIED"
    assert verified_data["verified_at"] is not None

    # Candidate cohort status updated to Self-Employed (Verified)
    await db.refresh(learner)
    assert learner.status == "Self-Employed (Verified)"
