import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.services.impact_data_quality_service import impact_data_quality_service


@pytest.mark.asyncio
async def test_cohort_analytics_and_dimensions(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_admin: dict,
):
    """
    Test GET /api/v1/ml/impact/cohort across dimensions:
    - PROGRAM
    - INSTITUTION
    """
    # 1. Program dimension
    prog_res = await client.get("/api/v1/ml/impact/cohort?dimension=PROGRAM", headers=auth_headers_admin)
    assert prog_res.status_code == 200
    prog_data = prog_res.json()
    assert prog_data["dimension_type"] == "PROGRAM"
    assert "learner_count" in prog_data
    assert "average_mastery_gain" in prog_data
    assert "verified_placement_rate" in prog_data

    # 2. Institution dimension
    inst_res = await client.get(
        "/api/v1/ml/impact/cohort?dimension=INSTITUTION&value=National+Skill+Institute",
        headers=auth_headers_admin,
    )
    assert inst_res.status_code == 200
    inst_data = inst_res.json()
    assert inst_data["dimension_type"] == "INSTITUTION"


@pytest.mark.asyncio
async def test_impact_data_quality_audit_endpoint(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_admin: dict,
):
    """
    Test GET /api/v1/ml/impact/data-quality:
    - Overall data quality index (0 - 100)
    - Profile completeness %
    - Verification coverage %
    - Temporal completeness %
    - Duplicate record rate %
    """
    res = await client.get("/api/v1/ml/impact/data-quality", headers=auth_headers_admin)
    assert res.status_code == 200
    dq = res.json()

    assert "overall_quality_score" in dq
    assert 0.0 <= dq["overall_quality_score"] <= 100.0
    assert "profile_completeness_pct" in dq
    assert "outcome_verification_coverage_pct" in dq
    assert "temporal_completeness_pct" in dq
    assert "quality_grade" in dq
    assert dq["quality_grade"] in ("EXCELLENT", "GOOD", "MODERATE", "NEEDS_IMPROVEMENT")
