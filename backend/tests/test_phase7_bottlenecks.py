import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.competency import Competency
from src.services.skill_bottleneck_service import skill_bottleneck_service


@pytest.mark.asyncio
async def test_skill_bottlenecks_ranking_and_curriculum_optimization(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_admin: dict,
):
    """
    Test GET /api/v1/ml/impact/skills:
    - Ranks competency bottlenecks by composite deficit & failure rate
    - Generates evidence-backed curriculum optimization recommendations
    """
    res = await client.get("/api/v1/ml/impact/skills?limit=5", headers=auth_headers_admin)
    assert res.status_code == 200
    data = res.json()

    assert "bottlenecks" in data
    assert "curriculum_recommendations" in data
    assert "disclaimer" in data

    bottlenecks = data["bottlenecks"]
    assert len(bottlenecks) <= 5

    if bottlenecks:
        top_bottleneck = bottlenecks[0]
        assert top_bottleneck["rank"] == 1
        assert "competency_name" in top_bottleneck
        assert "average_gap" in top_bottleneck
        assert "severity" in top_bottleneck
        assert top_bottleneck["severity"] in ("CRITICAL", "HIGH", "MODERATE")
        assert "recommended_curriculum_action" in top_bottleneck

    curriculum = data["curriculum_recommendations"]
    assert isinstance(curriculum, list)
    if curriculum:
        rec = curriculum[0]
        assert "competency_name" in rec
        assert "issue" in rec
        assert "recommended_action" in rec
        assert "priority" in rec
        assert rec["priority"] in ("CRITICAL", "HIGH", "MEDIUM")


@pytest.mark.asyncio
async def test_learning_resources_effectiveness_analysis(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_admin: dict,
):
    """
    Test GET /api/v1/ml/impact/resources:
    - Analyzes empirical engagement, completion rates, and abandonment rates
    """
    res = await client.get("/api/v1/ml/impact/resources?limit=10", headers=auth_headers_admin)
    assert res.status_code == 200
    resources = res.json()

    assert isinstance(resources, list)
    if resources:
        item = resources[0]
        assert "resource_title" in item
        assert "completion_rate" in item
        assert 0.0 <= item["completion_rate"] <= 1.0
        assert "abandonment_rate" in item
        assert "avg_time_spent_mins" in item
