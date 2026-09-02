import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.learner import Learner
from src.services.consent_service import consent_service


@pytest.mark.asyncio
async def test_consent_lifecycle_and_revocation(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_msde: dict,
    seed_district,
    seed_training_center,
):
    """
    Verifies full lifecycle of candidate privacy consent:
    Granting consent -> Active query -> Revocation -> check_active_consent enforcement.
    """
    # 1. Create a candidate
    learner_id = f"KN-TEST-CONSENT-{seed_district.id[-4:]}"
    learner = Learner(
        id=learner_id,
        full_name="Aarav Consent Test",
        email=f"aarav.{seed_district.id[-4:].lower()}@example.com",
        district_id=seed_district.id,
        training_center_id=seed_training_center.id,
        status="In Training",
        employment_readiness_score=75,
        overall_progress=60,
    )
    db.add(learner)
    await db.commit()

    # 2. Initially check active consent: should be False
    is_active_initial = await consent_service.check_active_consent(
        db, learner_id, "FOLLOW_UP_COMMUNICATION"
    )
    assert is_active_initial is False

    # 3. Grant Consent via API
    resp_grant = await client.post(
        f"/api/v1/learners/{learner_id}/consents",
        headers=auth_headers_msde,
        json={
            "consent_type": "FOLLOW_UP_COMMUNICATION",
            "purpose": "Allow longitudinal 30, 90, 180, and 365-day post-training outcome follow-ups",
            "granted": True,
            "version": "v1.0",
            "source": "LEARNER_PORTAL",
        },
    )
    assert resp_grant.status_code == 201
    grant_data = resp_grant.json()
    assert grant_data["consent_type"] == "FOLLOW_UP_COMMUNICATION"
    assert grant_data["granted"] is True
    assert grant_data["revoked_at"] is None
    consent_id = grant_data["id"]

    # 4. Check active consent in service: should now be True
    is_active_granted = await consent_service.check_active_consent(
        db, learner_id, "FOLLOW_UP_COMMUNICATION"
    )
    assert is_active_granted is True

    # 5. List consents for candidate
    resp_list = await client.get(
        f"/api/v1/learners/{learner_id}/consents",
        headers=auth_headers_msde,
    )
    assert resp_list.status_code == 200
    consents_list = resp_list.json()
    assert len(consents_list) >= 1
    assert any(c["id"] == consent_id for c in consents_list)

    # 6. Revoke Consent via DELETE / Revoke API
    resp_revoke = await client.delete(
        f"/api/v1/learners/{learner_id}/consents/{consent_id}",
        headers=auth_headers_msde,
    )
    assert resp_revoke.status_code == 200
    revoke_data = resp_revoke.json()
    assert revoke_data["granted"] is False
    assert revoke_data["revoked_at"] is not None

    # 7. Check active consent in service: MUST now be False (revocation respected)
    is_active_after_revoke = await consent_service.check_active_consent(
        db, learner_id, "FOLLOW_UP_COMMUNICATION"
    )
    assert is_active_after_revoke is False


@pytest.mark.asyncio
async def test_consent_unauthorized_access(
    client: AsyncClient,
    db: AsyncSession,
    seed_district,
):
    """Verifies that unauthenticated or invalid requests cannot access consent records."""
    resp = await client.get("/api/v1/learners/KN-NON-EXISTENT/consents")
    assert resp.status_code in (401, 403)
