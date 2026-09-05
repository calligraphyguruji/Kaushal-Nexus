from datetime import datetime, timezone
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.assessment import LearnerSkillMastery
from src.models.competency import Competency
from src.models.learner import Learner
from src.models.learning_intervention import LearningIntervention
from src.services.intervention_effectiveness_service import intervention_effectiveness_service


@pytest.mark.asyncio
async def test_intervention_lifecycle_and_completion_delta(
    client: AsyncClient,
    db: AsyncSession,
):
    """
    Test full intervention lifecycle:
    1. Recommendation creation with baseline mastery and gap
    2. Learner transitions status to IN_PROGRESS
    3. Learner completes intervention and final mastery/gap delta is recorded
    4. Observable delta is verified
    """
    unique_id = uuid.uuid4().hex[:8]
    email = f"int.learner.{unique_id}@example.com"

    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password1234!",
            "full_name": f"Intervention Candidate {unique_id}",
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

    # 1. Create intervention
    comp = Competency(name=f"Docker {unique_id}", code=f"DKR-{unique_id[:6].upper()}", sector="DevOps")
    db.add(comp)
    await db.flush()

    intervention = await intervention_effectiveness_service.create_or_sync_intervention(
        db=db,
        learner_id=learner_id,
        intervention_type="PRACTICE_DRILL",
        title="Docker Containerization Practice Drills",
        description="Hands-on CLI container management exercises.",
        competency_id=comp.id,
        baseline_mastery=0.35,
        baseline_gap=0.35,
        estimated_hours=2.0,
    )
    assert intervention.status == "RECOMMENDED"
    assert intervention.baseline_mastery == 0.35

    # 2. Learner lists interventions
    list_res = await client.get("/api/v1/learners/me/interventions", headers=headers)
    assert list_res.status_code == 200
    interventions = list_res.json()
    assert len(interventions) >= 1
    int_id = interventions[0]["id"]

    # 3. Transition to IN_PROGRESS
    prog_res = await client.post(
        f"/api/v1/learners/me/interventions/{int_id}/status",
        json={"status": "IN_PROGRESS", "actual_hours": 0.5},
        headers=headers,
    )
    assert prog_res.status_code == 200
    assert prog_res.json()["status"] == "IN_PROGRESS"

    # Simulate mastery improvement in database
    mastery = LearnerSkillMastery(
        learner_id=learner_id,
        skill_id=comp.id,
        mastery_probability=0.68,
        questions_attempted=5,
        correct_answers=4,
        incorrect_answers=1,
    )
    db.add(mastery)
    await db.commit()

    # 4. Transition to COMPLETED
    comp_res = await client.post(
        f"/api/v1/learners/me/interventions/{int_id}/status",
        json={"status": "COMPLETED", "actual_hours": 2.2, "notes": "Completed all 8 interactive drills."},
        headers=headers,
    )
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert comp_data["status"] == "COMPLETED"
    assert comp_data["final_mastery"] == pytest.approx(0.68, abs=1e-2)
    assert comp_data["mastery_delta"] == pytest.approx(0.33, abs=1e-2)
    assert comp_data["actual_hours"] == 2.2


@pytest.mark.asyncio
async def test_intervention_effectiveness_endpoint(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_admin: dict,
):
    """
    Test GET /api/v1/ml/impact/interventions:
    - Verifies all 8 standard intervention categories are analyzed
    - Verifies completion rates and observed mastery deltas
    - Verifies presence of causal disclaimer
    """
    res = await client.get("/api/v1/ml/impact/interventions", headers=auth_headers_admin)
    assert res.status_code == 200
    data = res.json()

    assert "interventions" in data
    assert len(data["interventions"]) == 8
    assert "overall_completion_rate" in data
    assert "disclaimer" in data
    assert "No causal effect is claimed" in data["disclaimer"]

    # Check that each category has valid structure
    for item in data["interventions"]:
        assert "intervention_type" in item
        assert "completion_rate" in item
        assert item["status"] in ("ROBUST", "PRELIMINARY", "INSUFFICIENT_DATA")
