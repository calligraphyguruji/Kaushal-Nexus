from datetime import datetime, timezone
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.placement_prediction import PlacementPrediction
from src.schemas.career_intelligence_dto import (
    CareerIntelligenceResponseDTO,
    ReadinessEvaluationDTO,
)
from src.services.career_intelligence_service import (
    CareerIntelligenceService,
    career_intelligence_service,
)


def test_calculate_readiness_score_formula_and_weights():
    """Verify composite readiness score formula satisfies mathematical bounds and weights."""
    # Check weights sum to 1.0
    w = career_intelligence_service.WEIGHTS
    assert sum(w.values()) == pytest.approx(1.0, abs=1e-5)

    # 1. Zero readiness state -> NOT_READY
    zero_eval = career_intelligence_service.calculate_readiness_score(
        mean_bkt=0.0,
        role_match_ratio=0.0,
        gap_completeness=0.0,
        learning_ratio=0.0,
        project_ratio=0.0,
        velocity_ratio=0.0,
    )
    assert isinstance(zero_eval, ReadinessEvaluationDTO)
    assert zero_eval.overall_readiness == 0.0
    assert zero_eval.readiness_tier == "NOT_READY"
    assert len(zero_eval.components) == 6

    # 2. Intermediate developing state -> DEVELOPING
    dev_eval = career_intelligence_service.calculate_readiness_score(
        mean_bkt=0.50,
        role_match_ratio=0.50,
        gap_completeness=0.50,
        learning_ratio=0.40,
        project_ratio=0.40,
        velocity_ratio=0.40,
    )
    assert 0.40 <= dev_eval.overall_readiness < 0.60
    assert dev_eval.readiness_tier == "DEVELOPING"

    # 3. High readiness state -> CAREER_READY
    ready_eval = career_intelligence_service.calculate_readiness_score(
        mean_bkt=0.72,
        role_match_ratio=0.70,
        gap_completeness=0.75,
        learning_ratio=0.65,
        project_ratio=0.70,
        velocity_ratio=0.60,
    )
    assert 0.60 <= ready_eval.overall_readiness < 0.80
    assert ready_eval.readiness_tier == "CAREER_READY"

    # 4. Perfect readiness state -> STRONG_READINESS
    perf_eval = career_intelligence_service.calculate_readiness_score(
        mean_bkt=1.0,
        role_match_ratio=1.0,
        gap_completeness=1.0,
        learning_ratio=1.0,
        project_ratio=1.0,
        velocity_ratio=1.0,
    )
    assert perf_eval.overall_readiness == 1.0
    assert perf_eval.readiness_tier == "STRONG_READINESS"


@pytest.mark.asyncio
async def test_learner_career_intelligence_pipeline_and_audit(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_admin: dict,
):
    """
    Test Phase 6 end-to-end:
    - Learner registration & login
    - Candidate requests GET /api/v1/learners/me/career-intelligence
    - Verifies readiness breakdown, calibrated XGBoost probability, prioritized actions, disclaimers
    - Verifies persistence in placement_predictions audit table
    - Staff generates intelligence via POST /api/v1/learners/{id}/career-intelligence
    """
    unique_id = uuid.uuid4().hex[:8]
    email = f"candidate.p6.{unique_id}@example.com"

    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password1234!",
            "full_name": f"P6 Candidate {unique_id}",
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
    learner_headers = {"Authorization": f"Bearer {token}"}

    # 1. Candidate requests career intelligence
    ci_res = await client.get("/api/v1/learners/me/career-intelligence", headers=learner_headers)
    assert ci_res.status_code == 200
    ci_data = ci_res.json()
    learner_id = ci_data["learner_id"]
    assert learner_id is not None
    assert 0.0 <= ci_data["overall_readiness"] <= 1.0
    assert ci_data["readiness_tier"] in ("NOT_READY", "DEVELOPING", "CAREER_READY", "STRONG_READINESS")
    assert 0.0 <= ci_data["placement_probability"] <= 1.0
    assert len(ci_data["readiness_breakdown"]["components"]) == 6
    assert isinstance(ci_data["next_best_actions"], list)
    assert len(ci_data["next_best_actions"]) > 0
    assert "disclaimer" in ci_data
    assert "NOT guarantee" in ci_data["disclaimer"] or "decision-support" in ci_data["disclaimer"]

    # 2. Check persistence in placement_predictions audit table
    audit_stmt = (
        select(PlacementPrediction)
        .where(PlacementPrediction.learner_id == learner_id)
        .order_by(PlacementPrediction.prediction_timestamp.desc())
    )
    audit_res = await db.execute(audit_stmt)
    records = audit_res.scalars().all()
    assert len(records) >= 1
    latest_rec = records[0]
    assert latest_rec.probability == pytest.approx(ci_data["placement_probability"], abs=1e-4)
    assert latest_rec.readiness_score == pytest.approx(ci_data["overall_readiness"], abs=1e-4)
    assert latest_rec.target == "INTERNSHIP_ACCEPTED"
    assert "components" in latest_rec.prediction_context

    # 3. Staff evaluates candidate
    staff_res = await client.post(
        f"/api/v1/learners/{learner_id}/career-intelligence",
        headers=auth_headers_admin,
    )
    assert staff_res.status_code == 200
    staff_data = staff_res.json()
    assert staff_data["learner_id"] == learner_id
    assert staff_data["readiness_tier"] == ci_data["readiness_tier"]

    # 4. Unauthorized candidate cannot access other candidate's evaluation
    unauth_res = await client.post(
        f"/api/v1/learners/{learner_id}/career-intelligence",
        headers=learner_headers,
    )
    assert unauth_res.status_code == 403
