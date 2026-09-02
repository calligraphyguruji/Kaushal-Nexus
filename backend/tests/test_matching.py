import json
import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient

from src.core.database import AsyncSessionLocal
from src.models.competency import Competency, LearnerSkill
from src.models.district import District
from src.models.employer import Employer, HiringMandate
from src.models.learner import Learner
from src.services.matching_engine import MatchingEngine


def test_matching_engine_formulas():
    """Verify explainable score formula and location fit weighting."""
    # Location fit tests
    assert MatchingEngine.compute_location_fit("UP-VARANASI", "Uttar Pradesh", "UP-VARANASI", "Uttar Pradesh") == 1.0
    assert MatchingEngine.compute_location_fit("UP-VARANASI", "Uttar Pradesh", "UP-LUCKNOW", "Uttar Pradesh") == 0.7
    assert MatchingEngine.compute_location_fit("UP-VARANASI", "Uttar Pradesh", "MH-MUMBAI", "Maharashtra") == 0.4

    # Score calculation test: 0.50 * 1.0 + 0.30 * 1.0 + 0.20 * 1.0 = 100%
    assert MatchingEngine.calculate_match_score(1.0, 1.0, 1.0) == 100.0
    
    # 0.50 * 0.8 + 0.30 * 0.7 + 0.20 * 0.9 = 0.40 + 0.21 + 0.18 = 0.79 = 79.0%
    assert MatchingEngine.calculate_match_score(0.8, 0.7, 0.9) == 79.0


@pytest.fixture(scope="session")
async def seeded_matching_data():
    """Seed district, employer, mandate, and scored learner for matching tests."""
    async with AsyncSessionLocal() as session:
        district_id = f"UP-MATCH-{uuid.uuid4().hex[:6]}"
        district = District(
            id=district_id,
            name="Varanasi Tech Zone",
            state="Uttar Pradesh",
            region="Eastern UP",
            tier="Tier 1",
        )
        session.add(district)
        await session.flush()

        comp = Competency(
            code=f"COMP-CLOUD-{uuid.uuid4().hex[:6]}",
            name="Cloud DevOps Engineering",
            sector="IT-ITeS",
        )
        session.add(comp)
        await session.flush()

        learner_id = f"KN-MATCH-{uuid.uuid4().hex[:6]}"
        learner = Learner(
            id=learner_id,
            full_name="Pooja Sharma",
            district_id=district.id,
            employment_readiness_score=90,
            overall_progress=95,
            status="In Training",
        )
        session.add(learner)
        await session.flush()

        skill = LearnerSkill(
            learner_id=learner.id,
            competency_id=comp.id,
            score_percentage=92,
            is_verified=True,
            assessed_at=datetime.now(timezone.utc),
        )
        session.add(skill)

        # Employer & Mandate in same district
        employer = Employer(
            company_name="Apex Global Cloud Services",
            industry_sector="IT-ITeS",
            tier="Enterprise",
            contact_email="hiring@apexcloud.in",
        )
        session.add(employer)
        await session.flush()

        mandate = HiringMandate(
            employer_id=employer.id,
            job_title="Associate Cloud Systems Engineer",
            sector="IT-ITeS",
            district_id=district.id,
            state="Uttar Pradesh",
            openings_count=10,
            min_nsqf_level="NSQF Level 5",
            required_competencies_json=json.dumps(["Cloud DevOps Engineering"]),
            salary_min_lpa=4.2,
            salary_max_lpa=6.0,
            is_active=True,
        )
        session.add(mandate)
        await session.commit()

        return {
            "district_id": district.id,
            "learner_id": learner.id,
            "mandate_id": str(mandate.id),
            "employer_name": employer.company_name,
        }


@pytest.mark.asyncio
async def test_list_hiring_mandates_endpoint(
    client: AsyncClient, auth_headers: dict, seeded_matching_data: dict
):
    """Test GET /api/v1/matching/mandates returns active job listings."""
    resp = await client.get("/api/v1/matching/mandates", headers=auth_headers)
    assert resp.status_code == 200
    mandates = resp.json()
    assert isinstance(mandates, list)
    assert len(mandates) >= 1
    
    first = mandates[0]
    assert "job_title" in first
    assert "employer_name" in first
    assert "salary_range" in first
    assert "openings_count" in first
    assert "required_competencies" in first


@pytest.mark.asyncio
async def test_calculate_learner_matches_endpoint(
    client: AsyncClient, auth_headers: dict, seeded_matching_data: dict
):
    """Test GET /api/v1/matching/calculate/{learner_id} computes match breakdown."""
    learner_id = seeded_matching_data["learner_id"]

    resp = await client.get(
        f"/api/v1/matching/calculate/{learner_id}?top_n=5",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["learner_id"] == learner_id
    assert data["readiness_score"] == 90
    assert data["total_active_jobs_evaluated"] >= 1
    assert len(data["top_matches"]) >= 1

    top = data["top_matches"][0]
    assert top["match_score"] > 70.0
    assert top["skill_alignment"] > 0
    assert top["location_fit"] == 100.0  # Same district
    assert top["readiness"] == 90.0
    assert "salary_range" in top
    assert isinstance(top["matched_skills"], list)
    assert top["fit_verdict"] in ["Strong Match", "Good Match", "Moderate Match"]


@pytest.mark.asyncio
async def test_dispatch_batch_endpoint(
    client: AsyncClient, auth_headers: dict, seeded_matching_data: dict
):
    """Test POST /api/v1/matching/dispatch-batch dispatches candidate shortlist."""
    mandate_id = seeded_matching_data["mandate_id"]
    learner_id = seeded_matching_data["learner_id"]

    payload = {
        "mandate_id": mandate_id,
        "learner_ids": [learner_id],
        "dispatch_notes": "Batch 01 - Top Scored Cloud Candidates",
    }

    resp = await client.post(
        "/api/v1/matching/dispatch-batch",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "DISPATCHED"
    assert data["candidates_dispatched_count"] == 1
    assert learner_id in data["dispatched_learner_ids"]
    assert "batch_id" in data
    assert "dispatched_at" in data
