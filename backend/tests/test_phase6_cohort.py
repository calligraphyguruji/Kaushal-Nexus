from datetime import datetime, timezone
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.career_intelligence_dto import CohortIntelligenceResponseDTO
from src.services.cohort_intelligence_service import cohort_intelligence_service


@pytest.mark.asyncio
async def test_cohort_intelligence_and_heatmap_endpoint(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_admin: dict,
):
    """
    Test Phase 6 Institutional Cohort Intelligence:
    - GET /api/v1/ml/career-intelligence/cohort
    - Validates aggregate metrics, skill-gap heatmap structure, and prioritized interventions.
    """
    res = await client.get("/api/v1/ml/career-intelligence/cohort", headers=auth_headers_admin)
    assert res.status_code == 200
    cohort_data = res.json()

    assert "total_learners" in cohort_data
    assert "active_learners" in cohort_data
    assert "average_mastery" in cohort_data
    assert "verified_placement_rate" in cohort_data
    assert isinstance(cohort_data["skill_gap_heatmap"], list)
    assert isinstance(cohort_data["prioritized_interventions"], list)

    # Check heatmap items if present
    if len(cohort_data["skill_gap_heatmap"]) > 0:
        item = cohort_data["skill_gap_heatmap"][0]
        assert "skill_name" in item
        assert "average_gap" in item
        assert "severity" in item
        assert item["severity"] in ("CRITICAL", "MODERATE", "LOW")

    # Check interventions if present
    if len(cohort_data["prioritized_interventions"]) > 0:
        intv = cohort_data["prioritized_interventions"][0]
        assert "priority" in intv
        assert "intervention_title" in intv
        assert "recommended_action" in intv
        assert intv["affected_learner_count"] >= 0
