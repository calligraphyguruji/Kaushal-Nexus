from datetime import datetime, timezone
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.assessment import LearnerSkillHistory, LearnerSkillMastery
from src.models.competency import Competency
from src.models.learner import Learner
from src.models.learning_plan import LearningActivity, LearningPlan, LearningPlanModule
from src.schemas.impact_dto import LearnerImpactDTO, ProgramScorecardDTO
from src.services.impact_measurement_service import impact_measurement_service


@pytest.mark.asyncio
async def test_learner_baseline_and_followup_delta_calculation(
    client: AsyncClient,
    db: AsyncSession,
):
    """
    Verify point-in-time baseline vs follow-up impact calculation:
    - Earliest recorded mastery in LearnerSkillHistory serves as baseline (t_0)
    - Current mastery in LearnerSkillMastery serves as follow-up (t_now)
    - Mastery delta = current - baseline
    - No unsupported causal claims made
    """
    unique_id = uuid.uuid4().hex[:8]
    email = f"learner.p7.{unique_id}@example.com"

    # Register learner
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password1234!",
            "full_name": f"Impact Learner {unique_id}",
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

    # Fetch profile to get learner_id
    me_res = await client.get("/api/v1/learners/me/profile", headers=headers)
    assert me_res.status_code == 200
    learner_id = me_res.json()["id"]

    # Seed a competency, baseline history, and current mastery
    comp = Competency(
        name=f"Impact Skill {unique_id}",
        code=f"IMP-{unique_id[:6].upper()}",
        sector="IT-ITeS",
    )
    db.add(comp)
    await db.flush()

    # Baseline history record (t_0)
    history = LearnerSkillHistory(
        learner_id=learner_id,
        skill_id=comp.id,
        previous_mastery=0.32,
        is_correct=True,
        new_mastery=0.45,
    )
    # Current mastery record (t_now)
    current = LearnerSkillMastery(
        learner_id=learner_id,
        skill_id=comp.id,
        mastery_probability=0.74,
        questions_attempted=4,
        correct_answers=3,
        incorrect_answers=1,
    )
    # Learning activity
    activity = LearningActivity(
        learner_id=learner_id,
        activity_type="PRACTICE_COMPLETED",
        time_spent_minutes=90,
    )
    db.add_all([history, current, activity])
    await db.commit()

    # Query via API
    res = await client.get("/api/v1/learners/me/impact", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["learner_id"] == learner_id
    assert data["initial_mastery"] == pytest.approx(0.32, abs=1e-2)
    assert data["current_mastery"] == pytest.approx(0.74, abs=1e-2)
    assert data["mastery_delta"] == pytest.approx(0.42, abs=1e-2)
    assert data["learning_hours"] == pytest.approx(1.5, abs=1e-1)
    assert "disclaimer" in data
    assert "observed individual learner progress" in data["disclaimer"]
    assert isinstance(data["timeline_events"], list)
    assert len(data["timeline_events"]) >= 2


@pytest.mark.asyncio
async def test_program_scorecard_and_career_funnel(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_admin: dict,
):
    """
    Verify institutional scorecard and longitudinal career funnel APIs:
    - GET /api/v1/ml/impact/program
    - GET /api/v1/ml/impact/funnel
    """
    # 1. Program Scorecard
    scorecard_res = await client.get("/api/v1/ml/impact/program", headers=auth_headers_admin)
    assert scorecard_res.status_code == 200
    sc_data = scorecard_res.json()

    assert "learners_served" in sc_data
    assert "assessment_completion_pct" in sc_data
    assert "learning_completion_pct" in sc_data
    assert "average_mastery_gain" in sc_data
    assert "verified_placement_pct" in sc_data
    assert "causal_disclaimer" in sc_data
    assert "Observational associations should not be interpreted as causal effects" in sc_data["causal_disclaimer"]

    # 2. Career Funnel
    funnel_res = await client.get("/api/v1/ml/impact/funnel", headers=auth_headers_admin)
    assert funnel_res.status_code == 200
    funnel_data = funnel_res.json()

    assert "stages" in funnel_data
    assert len(funnel_data["stages"]) == 10
    assert "total_cohort_size" in funnel_data
    assert "largest_dropoff_stage" in funnel_data
    assert "largest_dropoff_pct" in funnel_data

    # Check stage ordering
    stages = [s["stage"] for s in funnel_data["stages"]]
    assert stages[0] == "LEARNERS"
    assert stages[-1] == "VERIFIED_PLACEMENT"
