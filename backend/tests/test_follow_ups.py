from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.consent import Consent
from src.models.learner import Learner
from src.services.follow_up_service import follow_up_service


@pytest.mark.asyncio
async def test_follow_up_scheduling_and_duplicate_prevention(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_msde: dict,
    seed_district,
    seed_training_center,
):
    """Verifies follow-up scheduling and duplicate prevention logic."""
    learner_id = f"KN-TEST-FU-{seed_district.id[-4:]}"
    learner = Learner(
        id=learner_id,
        full_name="Priya Followup Test",
        email=f"priya.{seed_district.id[-4:].lower()}@example.com",
        district_id=seed_district.id,
        training_center_id=seed_training_center.id,
        status="In Training",
        employment_readiness_score=80,
        overall_progress=85,
    )
    db.add(learner)
    await db.commit()

    due_time = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    # 1. Schedule a 30_DAY follow-up
    resp1 = await client.post(
        f"/api/v1/learners/{learner_id}/follow-ups",
        headers=auth_headers_msde,
        json={
            "follow_up_type": "30_DAY",
            "scheduled_at": due_time,
            "channel": "IN_APP",
            "notes": "30-day post-training placement status query",
        },
    )
    assert resp1.status_code == 201
    fu_data = resp1.json()
    assert fu_data["follow_up_type"] == "30_DAY"
    assert fu_data["status"] == "SCHEDULED"

    # 2. Attempt duplicate schedule for same window -> Must return 400
    resp_dup = await client.post(
        f"/api/v1/learners/{learner_id}/follow-ups",
        headers=auth_headers_msde,
        json={
            "follow_up_type": "30_DAY",
            "scheduled_at": due_time,
            "channel": "IN_APP",
            "notes": "Duplicate request",
        },
    )
    assert resp_dup.status_code == 400


@pytest.mark.asyncio
async def test_follow_up_consent_enforcement_and_completion(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_msde: dict,
    seed_district,
    seed_training_center,
):
    """
    Verifies that follow-up batch processing:
    1. Skips outreach if active FOLLOW_UP_COMMUNICATION consent is not present
    2. Sends outreach if consent is granted
    3. Successfully records response and updates candidate outcome
    """
    learner_id = f"KN-TEST-ENFORCE-{seed_district.id[-4:]}"
    learner = Learner(
        id=learner_id,
        full_name="Vikram Enforcement Test",
        email=f"vikram.{seed_district.id[-4:].lower()}@example.com",
        district_id=seed_district.id,
        training_center_id=seed_training_center.id,
        status="In Training",
        employment_readiness_score=78,
        overall_progress=90,
    )
    db.add(learner)
    await db.commit()

    past_due = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()

    # 1. Schedule follow-up due in past without granting consent
    resp_fu = await client.post(
        f"/api/v1/learners/{learner_id}/follow-ups",
        headers=auth_headers_msde,
        json={
            "follow_up_type": "POST_TRAINING",
            "scheduled_at": past_due,
            "channel": "SMS",
            "notes": "Immediate outreach check",
        },
    )
    assert resp_fu.status_code == 201
    fu_id = resp_fu.json()["id"]

    # 2. Run batch processing without consent -> Should be SKIPPED
    res_batch_no_consent = await follow_up_service.process_due_follow_ups(db)
    assert res_batch_no_consent["skipped_no_consent"] >= 1

    # Check status of this follow-up: should be SKIPPED
    fu_records = await follow_up_service.get_learner_follow_ups(db, learner_id)
    skipped_fu = next(f for f in fu_records if str(f.id) == fu_id)
    assert skipped_fu.status == "SKIPPED"

    # 3. Now grant FOLLOW_UP_COMMUNICATION consent
    consent = Consent(
        learner_id=learner_id,
        consent_type="FOLLOW_UP_COMMUNICATION",
        purpose="Outreach",
        granted=True,
        granted_at=datetime.now(timezone.utc),
        version="v1.0",
        source="TEST",
    )
    db.add(consent)
    await db.commit()

    # 4. Schedule another due follow-up (90_DAY)
    past_due_2 = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
    resp_fu2 = await client.post(
        f"/api/v1/learners/{learner_id}/follow-ups",
        headers=auth_headers_msde,
        json={
            "follow_up_type": "90_DAY",
            "scheduled_at": past_due_2,
            "channel": "IN_APP",
            "notes": "90-day post-training check",
        },
    )
    fu2_id = resp_fu2.json()["id"]

    # 5. Run batch processing with consent -> Should be SENT
    res_batch_with_consent = await follow_up_service.process_due_follow_ups(db)
    assert res_batch_with_consent["sent"] >= 1

    fu_records_after = await follow_up_service.get_learner_follow_ups(db, learner_id)
    sent_fu = next(f for f in fu_records_after if str(f.id) == fu2_id)
    assert sent_fu.status == "SENT"
    assert sent_fu.sent_at is not None

    # 6. Record response from learner
    resp_record = await client.post(
        f"/api/v1/learners/{learner_id}/follow-ups/{fu2_id}/respond",
        headers=auth_headers_msde,
        json={
            "response_status": "SELF_EMPLOYED",
            "notes": "Started independent micro-enterprise in solar installations",
        },
    )
    assert resp_record.status_code == 200
    completed_fu = resp_record.json()
    assert completed_fu["status"] == "COMPLETED"
    assert completed_fu["response_status"] == "SELF_EMPLOYED"

    # Learner cohort status should now be updated to Self-Employed
    await db.refresh(learner)
    assert learner.status == "Self-Employed"
