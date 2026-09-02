import pytest
from httpx import AsyncClient
from src.models.learner import Learner
from src.services.gemini_service import gemini_service
from src.schemas.ai_dto import SkillGapAnalysisRequestDTO, CandidateSkillInputDTO


@pytest.mark.asyncio
async def test_ai_skill_gap_analysis_authenticated(
    client: AsyncClient, auth_headers: dict
):
    """Verifies that an authenticated user can generate an AI skill gap roadmap."""
    payload = {
        "full_name": "Rahul Sharma",
        "target_occupation": "Cloud Infrastructure Engineer",
        "education_level": "B.Voc in Computer Systems",
        "district_name": "Lucknow, UP",
        "nsqf_level": "NSQF Level 5",
        "employment_readiness_score": 82,
        "overall_progress": 88,
        "current_skills": [
            {"name": "Linux Systems Administration", "sector": "IT-ITeS", "score_percentage": 85, "is_verified": True},
            {"name": "Python Scripting", "sector": "IT-ITeS", "score_percentage": 78, "is_verified": True},
        ],
        "completed_courses": ["Core Linux Administration", "Python Essentials"],
        "existing_gaps": ["Kubernetes Clustering", "Terraform Infrastructure as Code"],
    }

    resp = await client.post(
        "/api/v1/ai/skill-gap-analysis",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()

    # Validate structured schema fields
    assert "summary" in data and len(data["summary"]) > 10
    assert "strengths" in data and isinstance(data["strengths"], list)
    assert "skill_gaps" in data and len(data["skill_gaps"]) >= 1
    assert "priority_skill_gaps" in data
    assert "roadmap" in data and len(data["roadmap"]) >= 1
    assert "recommended_sequence" in data
    assert "projects" in data and len(data["projects"]) >= 1
    assert "is_ai_generated" in data
    assert "model_used" in data

    # Verify first skill gap item fields
    first_gap = data["skill_gaps"][0]
    assert "skill" in first_gap
    assert "priority" in first_gap
    assert "reason" in first_gap


@pytest.mark.asyncio
async def test_ai_skill_gap_analysis_with_learner_enrichment(
    client: AsyncClient, auth_headers: dict, seed_learner: Learner
):
    """Verifies that providing learner_id enriches candidate skills from the database."""
    payload = {
        "learner_id": seed_learner.id,
        "full_name": seed_learner.full_name,
        "target_occupation": "Python Software Engineer",
    }

    resp = await client.post(
        "/api/v1/ai/skill-gap-analysis",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["learner_id"] == seed_learner.id
    assert data["full_name"] == seed_learner.full_name
    assert len(data["roadmap"]) >= 3


@pytest.mark.asyncio
async def test_ai_skill_gap_analysis_unauthenticated(client: AsyncClient):
    """Verifies that unauthenticated calls are rejected with 401."""
    payload = {
        "full_name": "Anonymous Candidate",
        "target_occupation": "Electric Vehicle Technician",
    }
    resp = await client.post("/api/v1/ai/skill-gap-analysis", json=payload)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_ai_skill_gap_analysis_validation_error(
    client: AsyncClient, auth_headers: dict
):
    """Verifies that invalid payloads (e.g. empty full_name) trigger a 422 error."""
    payload = {
        "full_name": "A",  # min_length is 2
        "target_occupation": "Data Analyst",
    }
    resp = await client.post(
        "/api/v1/ai/skill-gap-analysis",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_direct_alias_api_ai_endpoint(
    client: AsyncClient, auth_headers: dict
):
    """Verifies that direct route /api/ai/skill-gap-analysis works identically."""
    payload = {
        "full_name": "Kavita Verma",
        "target_occupation": "Solar Microgrid Engineer",
        "current_skills": [
            {"name": "Solar PV Installation", "sector": "Green Energy & Renewables", "score_percentage": 90, "is_verified": True}
        ],
    }
    resp = await client.post(
        "/api/ai/skill-gap-analysis",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "Solar" in data["summary"] or len(data["strengths"]) > 0


@pytest.mark.asyncio
async def test_gemini_service_unit_logic():
    """Unit test for gemini_service data sanitization and deterministic fallback."""
    req = SkillGapAnalysisRequestDTO(
        learner_id="KN-UNIT-01",
        full_name="Priya <script>alert(1)</script> Singh",
        target_occupation="Data Scientist & AI Specialist",
        current_skills=[
            CandidateSkillInputDTO(name="Python 3.12", sector="IT", score_percentage=95, is_verified=True),
        ],
        employment_readiness_score=88,
    )

    sanitized = gemini_service._sanitize_learner_payload(req)
    assert "<script>" not in sanitized["full_name"]
    assert "Priya alert1 Singh" in sanitized["full_name"] or "Priya" in sanitized["full_name"]

    res = await gemini_service.generate_skill_gap_roadmap(req)
    assert res.full_name
    assert len(res.roadmap) >= 3
    assert len(res.projects) >= 2


@pytest.mark.asyncio
async def test_ai_skill_gap_analysis_cohort_profile(
    client: AsyncClient, auth_headers: dict
):
    """Verifies that analyzing a cohort/regional profile (with COHORT- prefix) succeeds without DB lookup."""
    payload = {
        "learner_id": "COHORT-COMP-CYBER-SEC",
        "full_name": "Regional Cyber Security Deficit Cohort",
        "target_occupation": "Full Stack Cloud Engineer",
        "district_name": "Varanasi, UP",
        "nsqf_level": "NSQF Level 5",
        "employment_readiness_score": 58,
        "overall_progress": 78,
        "current_skills": [
            {"name": "Network Security Protocols", "sector": "IT-ITeS", "score_percentage": 50, "is_verified": True},
        ],
        "existing_gaps": ["Cloud Infrastructure Security", "Kubernetes Hardening"],
    }

    resp = await client.post(
        "/api/v1/ai/skill-gap-analysis",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "roadmap" in data and len(data["roadmap"]) >= 1
    assert "skill_gaps" in data


@pytest.mark.asyncio
async def test_ai_skill_gap_analysis_nonexistent_learner(
    client: AsyncClient, auth_headers: dict
):
    """Verifies that querying a non-existent candidate returns a clean 404 error."""
    payload = {
        "learner_id": "KN-NONEXISTENT-99999",
        "full_name": "Nonexistent Candidate",
        "target_occupation": "Data Analyst",
    }
    resp = await client.post(
        "/api/v1/ai/skill-gap-analysis",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["error"]["message"].lower()
