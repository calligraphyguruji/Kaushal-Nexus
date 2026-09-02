import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient

from src.core.database import AsyncSessionLocal
from src.models.competency import Competency
from src.models.district import District
from src.models.skill_gap import SkillGapAnalytic, SkillGapIntervention
from src.services.skill_gap_engine import SkillGapEngine


@pytest.fixture(scope="session")
async def seeded_skill_gap_data():
    """Seeds district, competency, and skill gap analytics."""
    async with AsyncSessionLocal() as session:
        district_id = f"UP-SG-{uuid.uuid4().hex[:6]}"
        district = District(
            id=district_id,
            name="Varanasi SkillGap District",
            state="Uttar Pradesh",
            region="Eastern UP",
            tier="Tier 1",
        )
        session.add(district)
        await session.flush()

        comp = Competency(
            code=f"COMP-AI-{uuid.uuid4().hex[:6]}",
            name="Applied Machine Learning & Vision",
            sector="IT-ITeS",
        )
        session.add(comp)
        await session.flush()

        # Seed pre-calculated skill gap analytic
        analytic = SkillGapAnalytic(
            district_id=district.id,
            competency_id=comp.id,
            employer_demand_pct=88.0,
            workforce_supply_pct=34.0,
            deficit_pct=54.0,
            severity="Critical",
            learners_affected=42,
            priority_rank=1,
            suggested_action="Deploy 60-hour Deep Learning Sandbox & GPU Workstation Lab",
        )
        session.add(analytic)
        await session.commit()

        return {
            "district_id": district.id,
            "competency_id": comp.id,
            "competency_code": comp.code,
        }


def test_severity_classification_logic():
    """Test deterministic deficit-to-severity formula."""
    assert SkillGapEngine.classify_severity(45.0) == "Critical"
    assert SkillGapEngine.classify_severity(35.0) == "Critical"
    assert SkillGapEngine.classify_severity(34.9) == "High"
    assert SkillGapEngine.classify_severity(20.0) == "High"
    assert SkillGapEngine.classify_severity(19.9) == "Moderate"
    assert SkillGapEngine.classify_severity(5.0) == "Moderate"
    assert SkillGapEngine.classify_severity(4.9) == "Aligned"
    assert SkillGapEngine.classify_severity(-10.0) == "Aligned"


@pytest.mark.asyncio
async def test_get_priority_skill_gaps_endpoint(
    client: AsyncClient, auth_headers: dict, seeded_skill_gap_data: dict
):
    """Test GET /api/v1/skill-gaps/priority returns ranked deficits."""
    district_id = seeded_skill_gap_data["district_id"]

    resp = await client.get(
        f"/api/v1/skill-gaps/priority?district_id={district_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    gaps = resp.json()
    assert isinstance(gaps, list)
    assert len(gaps) >= 1
    
    first = gaps[0]
    assert first["district_id"] == district_id
    assert first["employer_demand_pct"] == 88.0
    assert first["workforce_supply_pct"] == 34.0
    assert first["deficit_pct"] == 54.0
    assert first["severity"] == "Critical"
    assert first["learners_affected"] == 42
    assert "suggested_action" in first


@pytest.mark.asyncio
async def test_get_skill_gap_distribution_endpoint(
    client: AsyncClient, auth_headers: dict, seeded_skill_gap_data: dict
):
    """Test GET /api/v1/skill-gaps/distribution returns summary distributions."""
    district_id = seeded_skill_gap_data["district_id"]

    resp = await client.get(
        f"/api/v1/skill-gaps/distribution?district_id={district_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "severity_counts" in data
    assert data["severity_counts"]["Critical"] >= 1
    assert "avg_deficit_pct" in data
    assert "sector_distribution" in data
    assert "district_rankings" in data


@pytest.mark.asyncio
async def test_deploy_intervention_endpoint(
    client: AsyncClient, auth_headers: dict, seeded_skill_gap_data: dict
):
    """Test POST /api/v1/skill-gaps/deploy-intervention creates intervention record."""
    district_id = seeded_skill_gap_data["district_id"]
    comp_id = str(seeded_skill_gap_data["competency_id"])

    payload = {
        "district_id": district_id,
        "competency_id": comp_id,
        "intervention_type": "BRIDGE_COURSE",
        "target_capacity": 60,
        "budget_allocated_inr": 250000.0,
        "target_completion_weeks": 6,
        "notes": "State mission priority bridge course for AI systems",
    }

    resp = await client.post(
        "/api/v1/skill-gaps/deploy-intervention",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "DEPLOYED"
    assert data["district_id"] == district_id
    assert data["target_capacity"] == 60
    assert data["budget_allocated_inr"] == 250000.0
    assert data["projected_deficit_reduction_pct"] > 0
    assert "intervention_id" in data
