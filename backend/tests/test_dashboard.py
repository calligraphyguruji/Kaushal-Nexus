import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient

from src.core.database import AsyncSessionLocal
from src.models.competency import Competency, LearnerSkill
from src.models.district import District
from src.models.learner import Learner
from src.models.training_center import TrainingCenter


@pytest.fixture(scope="session")
async def seeded_dashboard_data():
    """Seeds rich cohort data to test dashboard aggregations."""
    async with AsyncSessionLocal() as session:
        district_id = f"UP-DASH-{uuid.uuid4().hex[:6]}"
        district = District(
            id=district_id,
            name="Varanasi Dashboard District",
            state="Uttar Pradesh",
            region="Eastern UP",
            tier="Tier 1",
        )
        session.add(district)
        await session.flush()

        center = TrainingCenter(
            center_code=f"PMKK-DASH-{uuid.uuid4().hex[:6]}",
            name="Varanasi Executive Skill Center",
            district_id=district.id,
        )
        session.add(center)
        await session.flush()

        # Competencies across 2 sectors
        comp_tech = Competency(
            code=f"COMP-TECH-{uuid.uuid4().hex[:6]}",
            name="Cloud Engineering",
            sector="IT-ITeS",
        )
        comp_mfg = Competency(
            code=f"COMP-MFG-{uuid.uuid4().hex[:6]}",
            name="CNC Precision Machining",
            sector="Smart Manufacturing",
        )
        session.add_all([comp_tech, comp_mfg])
        await session.flush()

        # 5 Learners with different pipeline stages
        learners_data = [
            ("L1", "In Training", 40, 65, None),
            ("L2", "Assessment Passed", 85, 78, "NCVET-001"),
            ("L3", "Interview Ready", 90, 84, "NCVET-002"),
            ("L4", "Placed & Verified", 100, 92, "NCVET-003"),
            ("L5", "Retained (180-Day)", 100, 95, "NCVET-004"),
        ]

        created_learners = []
        for name, status, prog, read, ncv in learners_data:
            l_id = f"KN-DASH-{uuid.uuid4().hex[:6]}"
            learner = Learner(
                id=l_id,
                full_name=f"Candidate {name}",
                district_id=district.id,
                training_center_id=center.id,
                overall_progress=prog,
                employment_readiness_score=read,
                ncvet_credential_id=ncv,
                status=status,
                nsqf_level="NSQF Level 5",
            )
            session.add(learner)
            created_learners.append(learner)

        await session.flush()

        # Attach skills
        for idx, l in enumerate(created_learners):
            comp = comp_tech if idx % 2 == 0 else comp_mfg
            skill = LearnerSkill(
                learner_id=l.id,
                competency_id=comp.id,
                score_percentage=85,
                is_verified=True,
                assessed_at=datetime.now(timezone.utc),
            )
            session.add(skill)

        await session.commit()

        return {
            "district_id": district.id,
            "center_id": center.id,
            "tech_comp_id": comp_tech.id,
            "mfg_comp_id": comp_mfg.id,
        }


@pytest.mark.asyncio
async def test_dashboard_summary_endpoint(
    client: AsyncClient, auth_headers: dict, seeded_dashboard_data: dict
):
    """Verify GET /api/v1/dashboard/summary calculates correct KPI numbers."""
    district_id = seeded_dashboard_data["district_id"]

    # Filtered by seeded district
    resp = await client.get(
        f"/api/v1/dashboard/summary?district_id={district_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_enrolled"] == 5
    assert data["total_trained"] == 4     # 4 learners with progress >= 70
    assert data["total_certified"] == 4   # 4 learners certified
    assert data["total_placed"] == 2      # Placed & Verified + Retained
    assert data["retention_verified_count"] == 1
    assert data["placement_percentage"] == 50.0  # 2 / 4 = 50%
    assert data["avg_readiness_score"] > 0
    assert "deltas" in data


@pytest.mark.asyncio
async def test_dashboard_employment_trend_endpoint(
    client: AsyncClient, auth_headers: dict, seeded_dashboard_data: dict
):
    """Verify GET /api/v1/dashboard/employment-trend returns time series points."""
    district_id = seeded_dashboard_data["district_id"]

    resp = await client.get(
        f"/api/v1/dashboard/employment-trend?district_id={district_id}&months=6",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    trend_points = resp.json()
    assert isinstance(trend_points, list)
    assert len(trend_points) >= 1
    point = trend_points[0]
    assert "month" in point
    assert "enrolled" in point
    assert "placed" in point
    assert "retained" in point


@pytest.mark.asyncio
async def test_dashboard_funnel_endpoint(
    client: AsyncClient, auth_headers: dict, seeded_dashboard_data: dict
):
    """Verify GET /api/v1/dashboard/funnel returns 5-stage conversion pipeline."""
    district_id = seeded_dashboard_data["district_id"]

    resp = await client.get(
        f"/api/v1/dashboard/funnel?district_id={district_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    funnel = resp.json()
    assert len(funnel) == 5
    
    stages = [f["stage"] for f in funnel]
    assert stages == ["Enrollment", "Training", "Certified", "Placed", "Retained"]
    
    enrollment = funnel[0]
    assert enrollment["count"] == 5
    assert enrollment["percentage"] == 100.0
    assert "fill" in enrollment


@pytest.mark.asyncio
async def test_dashboard_sector_matrix_endpoint(
    client: AsyncClient, auth_headers: dict, seeded_dashboard_data: dict
):
    """Verify GET /api/v1/dashboard/sector-matrix aggregates cross-sector data."""
    district_id = seeded_dashboard_data["district_id"]

    resp = await client.get(
        f"/api/v1/dashboard/sector-matrix?district_id={district_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    matrix = resp.json()
    assert isinstance(matrix, list)
    assert len(matrix) >= 2  # IT-ITeS & Smart Manufacturing
    
    sectors = {m["sector"] for m in matrix}
    assert "IT-ITeS" in sectors
    assert "Smart Manufacturing" in sectors
    
    item = matrix[0]
    assert "placement_rate" in item
    assert "avg_readiness_score" in item
    assert "demand_gap_score" in item
