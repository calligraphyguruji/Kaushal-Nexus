import uuid
import pytest
from httpx import AsyncClient

from src.core.database import AsyncSessionLocal
from src.models.district import District
from src.models.learner import Learner
from src.models.training_center import TrainingCenter


@pytest.fixture(scope="session")
async def seeded_regional_districts():
    """Seeds test districts across multiple tiers and regions."""
    async with AsyncSessionLocal() as session:
        # District 1: Varanasi (Tier 1)
        d1_id = f"UP-REG-VAR-{uuid.uuid4().hex[:6]}"
        d1 = District(
            id=d1_id,
            name="Varanasi Regional Test",
            state="Uttar Pradesh",
            region="Eastern UP",
            tier="Tier 1",
            latitude=25.3176,
            longitude=82.9739,
        )
        # District 2: Gorakhpur (Tier 2)
        d2_id = f"UP-REG-GOR-{uuid.uuid4().hex[:6]}"
        d2 = District(
            id=d2_id,
            name="Gorakhpur Regional Test",
            state="Uttar Pradesh",
            region="Eastern UP",
            tier="Tier 2",
            latitude=26.7606,
            longitude=83.3732,
        )
        # District 3: Patna (Tier 1, Bihar)
        d3_id = f"BR-REG-PAT-{uuid.uuid4().hex[:6]}"
        d3 = District(
            id=d3_id,
            name="Patna Regional Test",
            state="Bihar",
            region="Central Bihar",
            tier="Tier 1",
            latitude=25.5941,
            longitude=85.1376,
        )
        session.add_all([d1, d2, d3])
        await session.flush()

        # Training centers
        tc1 = TrainingCenter(
            center_code=f"PMKK-REG-{uuid.uuid4().hex[:6]}",
            name="Varanasi Center of Excellence",
            district_id=d1.id,
        )
        session.add(tc1)
        await session.flush()

        # Learners
        for idx in range(3):
            l = Learner(
                id=f"KN-REG-{uuid.uuid4().hex[:6]}",
                full_name=f"Regional Candidate {idx}",
                district_id=d1.id,
                training_center_id=tc1.id,
                overall_progress=80,
                employment_readiness_score=85,
                status="Placed & Verified",
            )
            session.add(l)

        await session.commit()

        return {
            "d1_id": d1.id,
            "d2_id": d2.id,
            "d3_id": d3.id,
        }


@pytest.mark.asyncio
async def test_get_regional_districts_endpoint(
    client: AsyncClient, auth_headers: dict, seeded_regional_districts: dict
):
    """Test GET /api/v1/regional/districts returns district intelligence list."""
    resp = await client.get("/api/v1/regional/districts", headers=auth_headers)
    assert resp.status_code == 200
    districts = resp.json()
    assert isinstance(districts, list)
    assert len(districts) >= 3

    first = districts[0]
    assert "district_id" in first
    assert "name" in first
    assert "coordinates" in first
    assert "training_completion_rate" in first
    assert "placement_rate" in first
    assert "retention_rate" in first
    assert "divergence_score" in first
    assert "vulnerability_index" in first
    assert isinstance(first["dominant_skill_gaps"], list)


@pytest.mark.asyncio
async def test_get_regional_districts_with_filters(
    client: AsyncClient, auth_headers: dict, seeded_regional_districts: dict
):
    """Test filtering districts by state, region, and tier."""
    # Filter by state = Bihar
    resp_state = await client.get(
        "/api/v1/regional/districts?state=Bihar", headers=auth_headers
    )
    assert resp_state.status_code == 200
    bihar_districts = resp_state.json()
    assert len(bihar_districts) >= 1
    assert all(d["state"] == "Bihar" for d in bihar_districts)

    # Filter by tier = Tier 2
    resp_tier = await client.get(
        "/api/v1/regional/districts?tier=Tier 2", headers=auth_headers
    )
    assert resp_tier.status_code == 200
    tier2_districts = resp_tier.json()
    assert all("Tier 2" in d["tier"] for d in tier2_districts)


@pytest.mark.asyncio
async def test_get_regional_divergence_endpoint(
    client: AsyncClient, auth_headers: dict, seeded_regional_districts: dict
):
    """Test GET /api/v1/regional/divergence returns state aggregates and clusters."""
    resp = await client.get("/api/v1/regional/divergence", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "summary" in data
    assert "high_divergence_districts" in data
    assert "state_aggregates" in data
    assert "regional_clusters" in data
    assert len(data["state_aggregates"]) >= 1


@pytest.mark.asyncio
async def test_get_priority_clusters_endpoint(
    client: AsyncClient, auth_headers: dict, seeded_regional_districts: dict
):
    """Test GET /api/v1/regional/priority-clusters ranks intervention priorities."""
    resp = await client.get(
        "/api/v1/regional/priority-clusters?limit=5", headers=auth_headers
    )
    assert resp.status_code == 200
    clusters = resp.json()
    assert isinstance(clusters, list)
    assert len(clusters) >= 1

    top = clusters[0]
    assert top["rank"] == 1
    assert "composite_priority_score" in top
    assert "learners_at_risk" in top
    assert isinstance(top["key_bottlenecks"], list)
    assert isinstance(top["recommended_interventions"], list)
