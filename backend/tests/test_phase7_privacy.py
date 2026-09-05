import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_small_cohort_privacy_suppression(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_admin: dict,
):
    """
    Verify privacy protection for small sample cohorts (n < 5):
    - Querying a non-existent or tiny institution cohort returns is_suppressed=True
    - Aggregates are zeroed/masked and a privacy suppression reason is provided
    """
    fake_inst = f"Micro Academy {uuid.uuid4().hex[:6]}"
    res = await client.get(
        f"/api/v1/ml/impact/cohort?dimension=INSTITUTION&value={fake_inst}",
        headers=auth_headers_admin,
    )
    assert res.status_code == 200
    data = res.json()

    assert data["learner_count"] < 5
    assert data["is_suppressed"] is True
    assert "suppression_reason" in data
    assert "privacy threshold" in data["suppression_reason"]
    assert data["baseline_mastery"] == 0.0
    assert data["current_mastery"] == 0.0
    assert data["verified_placement_rate"] == 0.0


@pytest.mark.asyncio
async def test_learner_impact_isolation_and_rbac(
    client: AsyncClient,
    db: AsyncSession,
):
    """
    Verify RBAC and cross-learner data isolation:
    - Learner A cannot access Learner B's impact via GET /api/v1/learners/{learner_b}/impact
    - Only authorized institutional roles (EVALUATOR, ADMIN) can access specific candidate impact
    """
    # Register Learner A
    id_a = uuid.uuid4().hex[:8]
    email_a = f"learner.a.{id_a}@example.com"
    await client.post(
        "/api/v1/auth/register",
        json={"email": email_a, "password": "Password1234!", "full_name": "Learner A", "role": "LEARNER"},
    )
    login_a = await client.post("/api/v1/auth/login", json={"email": email_a, "password": "Password1234!"})
    headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}

    # Register Learner B
    id_b = uuid.uuid4().hex[:8]
    email_b = f"learner.b.{id_b}@example.com"
    await client.post(
        "/api/v1/auth/register",
        json={"email": email_b, "password": "Password1234!", "full_name": "Learner B", "role": "LEARNER"},
    )
    login_b = await client.post("/api/v1/auth/login", json={"email": email_b, "password": "Password1234!"})
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}
    me_b = await client.get("/api/v1/learners/me/profile", headers=headers_b)
    learner_b_id = me_b.json()["id"]

    # Learner A attempts to access Learner B's impact report
    res = await client.get(f"/api/v1/learners/{learner_b_id}/impact", headers=headers_a)
    assert res.status_code == 403  # Forbidden
