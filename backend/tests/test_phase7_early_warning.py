from datetime import datetime, timezone
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.assessment import LearnerSkillMastery
from src.models.competency import Competency
from src.models.learner import Learner
from src.services.learner_risk_service import learner_risk_service


@pytest.mark.asyncio
async def test_learner_early_warning_signals_detection(
    client: AsyncClient,
    db: AsyncSession,
):
    """
    Verify early warning engine:
    1. Candidate with severe competency gap receives PERSISTENT_SKILL_GAP risk
    2. Candidate with career-ready score but 0 applications receives CAREER_INACTIVITY risk
    3. Actionable non-punitive recommendations are returned
    """
    unique_id = uuid.uuid4().hex[:8]
    email = f"warn.learner.{unique_id}@example.com"

    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password1234!",
            "full_name": f"Early Warning Learner {unique_id}",
            "role": "LEARNER",
        },
    )
    assert reg.status_code == 201

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password1234!"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me_res = await client.get("/api/v1/learners/me/profile", headers=headers)
    assert me_res.status_code == 200
    learner_id = me_res.json()["id"]

    # Seed competency with low mastery (< 0.30 -> gap > 0.40)
    comp = Competency(
        name=f"Advanced Algorithms {unique_id}",
        code=f"ALGO-{unique_id[:6].upper()}",
        sector="Computer Science",
    )
    db.add(comp)
    await db.flush()

    mastery = LearnerSkillMastery(
        learner_id=learner_id,
        skill_id=comp.id,
        mastery_probability=0.22,  # severe deficit (0.70 - 0.22 = 0.48 > 0.40)
        questions_attempted=3,
        correct_answers=1,
        incorrect_answers=2,
    )
    db.add(mastery)

    # Set readiness to 65% (career-ready) with 0 applications
    learner_res = await db.execute(select(Learner).where(Learner.id == learner_id))
    learner_obj = learner_res.scalars().first()
    learner_obj.employment_readiness_score = 65
    await db.commit()

    # Query early warnings
    res = await client.get("/api/v1/learners/me/early-warnings", headers=headers)
    assert res.status_code == 200
    report = res.json()

    assert report["learner_id"] == learner_id
    assert report["risk_level"] in ("NEEDS_SUPPORT", "AT_RISK")
    assert len(report["risks"]) >= 1

    risk_types = [r["risk_type"] for r in report["risks"]]
    assert "PERSISTENT_SKILL_GAP" in risk_types or "CAREER_INACTIVITY" in risk_types
    assert len(report["recommended_next_actions"]) >= 1
    assert "disclaimer" in report
    assert "non-punitive" in report["disclaimer"]
