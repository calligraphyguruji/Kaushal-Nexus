import re
import pytest
from httpx import AsyncClient
from npmai import Ollama, Memory, Rag

from src.models.learner import Learner
from src.schemas.ai_dto import CandidateSkillInputDTO, SkillGapAnalysisRequestDTO
from src.services.ai_service import ai_service


def test_npmai_package_imports():
    """Verifies that NPMAI ecosystem (Ollama, Memory, Rag) imports successfully."""
    assert Ollama is not None
    assert Memory is not None
    assert Rag is not None

    llm = ai_service._get_llm_instance()
    assert llm.model == ai_service.model_name
    assert llm.change is True


@pytest.mark.asyncio
async def test_npmai_skill_gap_analysis_authenticated(
    client: AsyncClient, auth_headers: dict
):
    """Verifies that an authenticated user can generate a skill gap roadmap."""
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
    assert "job_readiness" in data
    assert "is_ai_generated" in data
    assert "model_used" in data

    # Verify skill gap item fields
    first_gap = data["skill_gaps"][0]
    assert "skill" in first_gap
    assert "priority" in first_gap
    assert "reason" in first_gap


@pytest.mark.asyncio
async def test_factual_grounding_no_unsupported_hiring_percentages(
    client: AsyncClient, auth_headers: dict
):
    """
    Audit test: Ensures the response does NOT contain fabricated hiring percentages
    (e.g., '92% of enterprise hiring mandates require...').
    """
    payload = {
        "full_name": "Aman Verma",
        "target_occupation": "Data Engineer",
        "current_skills": [
            {"name": "SQL & PostgreSQL", "sector": "IT-ITeS", "score_percentage": 88, "is_verified": True},
        ],
    }

    resp = await client.post(
        "/api/v1/ai/skill-gap-analysis",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()

    # Pattern for unsupported statistical claims
    pattern = re.compile(r"\b\d{1,3}%\s+(?:of\s+)?(?:enterprise|active|employer|hiring)", re.IGNORECASE)

    assert not pattern.search(data["summary"]), f"Found unsupported stat in summary: {data['summary']}"

    for gap in data.get("skill_gaps", []):
        assert not pattern.search(gap["reason"]), f"Found unsupported stat in gap reason: {gap['reason']}"


@pytest.mark.asyncio
async def test_deterministic_fallback_engine_attributes():
    """
    Audit test: When deterministic fallback is generated,
    is_ai_generated MUST be False and model_used must clearly indicate the fallback engine.
    """
    req = SkillGapAnalysisRequestDTO(
        learner_id="KN-GROUND-01",
        full_name="Vikram Seth",
        target_occupation="Full Stack Developer",
        current_skills=[
            CandidateSkillInputDTO(name="React.js", sector="IT-ITeS", score_percentage=85, is_verified=True),
        ],
        employment_readiness_score=78,
    )

    sanitized = ai_service._sanitize_learner_payload(req)
    res = ai_service._generate_deterministic_analysis(sanitized)

    assert res.is_ai_generated is False, "Deterministic fallback must have is_ai_generated=False"
    assert "Deterministic" in res.model_used, "model_used must indicate deterministic fallback"
    assert "95%" not in res.summary, "Must not predict ungrounded future target scores like 95%"
    assert res.learner_id == "KN-GROUND-01"
    assert res.full_name == "Vikram Seth"


def test_sanitize_unsupported_claims_helper():
    """Verifies that regex sanitizer safely strips fabricated hiring percentage statistics."""
    sample_text = "92% of enterprise hiring mandates require candidates to know Docker."
    sanitized = ai_service._sanitize_unsupported_claims(sample_text)
    assert "92% of enterprise" not in sanitized
    assert "Target employers actively require" in sanitized


def test_grounding_prompt_contains_reliability_rules():
    """Verifies that prompt instructions contain strict grounding rules against hallucinations."""
    data = {
        "learner_id": "KN-001",
        "full_name": "Test User",
        "target_occupation": "Cloud Engineer",
        "current_skills": [{"name": "Linux", "score_percentage": 90, "is_verified": True}],
        "nsqf_level": "NSQF Level 5",
        "education_level": "B.Tech",
        "district_name": "Noida",
        "employment_readiness_score": 80,
        "overall_progress": 85,
    }
    prompt = ai_service._build_diagnostic_prompt(data)
    assert "DO NOT invent" in prompt
    assert "CRITICAL FACTUAL GROUNDING" in prompt
    assert "evidence-safe" in prompt


@pytest.mark.asyncio
async def test_npmai_skill_gap_analysis_with_learner_enrichment(
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
async def test_npmai_skill_gap_analysis_unauthenticated(client: AsyncClient):
    """Verifies that unauthenticated calls are rejected with 401."""
    payload = {
        "full_name": "Anonymous Candidate",
        "target_occupation": "Electric Vehicle Technician",
    }
    resp = await client.post("/api/v1/ai/skill-gap-analysis", json=payload)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_npmai_skill_gap_analysis_validation_error(
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
async def test_npmai_service_unit_logic():
    """Unit test for npmai_service data sanitization, prompt construction, and response parsing."""
    req = SkillGapAnalysisRequestDTO(
        learner_id="KN-UNIT-01",
        full_name="Priya <script>alert(1)</script> Singh",
        target_occupation="Data Scientist & AI Specialist",
        current_skills=[
            CandidateSkillInputDTO(name="Python 3.12", sector="IT", score_percentage=95, is_verified=True),
        ],
        employment_readiness_score=88,
    )

    sanitized = ai_service._sanitize_learner_payload(req)
    assert "<script>" not in sanitized["full_name"]
    assert "Priya alert1 Singh" in sanitized["full_name"] or "Priya" in sanitized["full_name"]

    res = await ai_service.generate_skill_gap_roadmap(req)
    assert res.full_name
    assert len(res.roadmap) >= 3
    assert len(res.projects) >= 2
