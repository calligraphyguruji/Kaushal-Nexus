from datetime import datetime, timezone
import uuid
import pytest

from src.schemas.career_intelligence_dto import ActionType, NextBestActionDTO
from src.schemas.learner_intelligence_dto import (
    RoleMatchResultDTO,
    RoleMatchSkillDetailDTO,
)
from src.services.career_action_service import career_action_service
from src.services.career_recommendation_service import career_recommendation_service


def test_career_action_prioritization_logic():
    """Verify Next-Best Action prioritization ranks interview urgency, critical gaps, projects, and applications."""
    role_id = uuid.uuid4()
    mock_skills = [
        RoleMatchSkillDetailDTO(
            competency_code="COMP-PY-CORE",
            skill_name="Python Core",
            current_mastery=0.40,
            required_mastery=0.80,
            gap=0.40,
            importance="CRITICAL",
            weight=2.0,
            status="critical_gap",
        ),
        RoleMatchSkillDetailDTO(
            competency_code="COMP-SQL-CORE",
            skill_name="SQL Queries",
            current_mastery=0.75,
            required_mastery=0.70,
            gap=0.0,
            importance="IMPORTANT",
            weight=1.5,
            status="mastered",
        ),
    ]
    mock_role_match = RoleMatchResultDTO(
        role_id=role_id,
        role_code="ROLE-DEV",
        role_title="Junior Developer",
        sector="IT",
        match_score=55.0,
        strong_skills=["SQL Queries"],
        development_skills=[],
        critical_gaps=["Python Core"],
        skill_details=mock_skills,
        is_aspiring_role=True,
    )

    # 1. Action ranking when interview is scheduled
    class MockApp:
        def __init__(self, status, org="Acme"):
            self.status = status
            self.organization_name = org
            self.job_title = "Junior Developer"
            self.applied_at = datetime.now(timezone.utc)

    actions = career_action_service.prioritize_actions(
        role_match=mock_role_match,
        readiness_score=0.62,
        readiness_tier="CAREER_READY",
        placement_probability=0.65,
        projects=[],
        applications=[MockApp("INTERVIEW_SCHEDULED")],
        learning_progress=None,
        recent_practice_count=1,
    )

    assert len(actions) > 0
    # Top action must be PREPARE_INTERVIEW due to scheduled interview
    top_action = actions[0]
    assert top_action.action_type == ActionType.PREPARE_INTERVIEW
    assert top_action.priority >= 0.95
    assert "Acme" in top_action.title

    # Second action should address critical gap in Python Core
    gap_action = next(a for a in actions if a.action_type == ActionType.PRACTICE_DRILL)
    assert gap_action.related_skill == "Python Core"
    assert gap_action.priority > 0.75

    # Should also recommend COMPLETE_PROJECT because projects list is empty
    proj_action = next(a for a in actions if a.action_type == ActionType.COMPLETE_PROJECT)
    assert proj_action is not None
    assert proj_action.priority > 0.80

    # Categorization filters
    learning_recs = career_action_service.filter_learning_recommendations(actions)
    app_recs = career_action_service.filter_application_recommendations(actions)
    assert any(a.action_type == ActionType.PRACTICE_DRILL for a in learning_recs)
    assert any(a.action_type == ActionType.PREPARE_INTERVIEW for a in app_recs)


def test_career_recommendations_and_non_coercive_alternative_role():
    """Verify strategic recommendations suggest adjacent opportunities non-coercively."""
    target_role_id = uuid.uuid4()
    alt_role_id = uuid.uuid4()

    target_match = RoleMatchResultDTO(
        role_id=target_role_id,
        role_code="ROLE-TARGET",
        role_title="Cloud Engineer",
        sector="IT",
        match_score=45.0,
        strong_skills=["Linux Basics"],
        development_skills=["Docker"],
        critical_gaps=["Kubernetes Orchestration"],
        skill_details=[],
        is_aspiring_role=True,
    )

    alt_match = RoleMatchResultDTO(
        role_id=alt_role_id,
        role_code="ROLE-ALT",
        role_title="DevOps Junior",
        sector="IT",
        match_score=78.0,  # 33% higher than Cloud Engineer!
        strong_skills=["Linux Basics", "Docker", "Git"],
        development_skills=[],
        critical_gaps=[],
        skill_details=[],
        is_aspiring_role=False,
    )

    recs = career_recommendation_service.generate_career_recommendations(
        role_match=target_match,
        all_role_matches=[target_match, alt_match],
        readiness_score=0.52,
        projects=[],
    )

    alt_rec = next((r for r in recs if r.recommendation_type == "ALTERNATIVE_ROLE_SUGGESTION"), None)
    assert alt_rec is not None
    assert "DevOps Junior" in alt_rec.title
    assert alt_rec.alternative_role == "DevOps Junior"
    assert alt_rec.target_role == "Cloud Engineer"
    assert "disclaimer" in alt_rec.evidence
    assert "candidate control" in alt_rec.evidence["disclaimer"] or "Advisory" in alt_rec.evidence["disclaimer"]


def test_strengths_and_risks_extraction():
    """Verify strengths and risks extraction with auditable evidence."""
    role_id = uuid.uuid4()
    role_match = RoleMatchResultDTO(
        role_id=role_id,
        role_code="ROLE-PY",
        role_title="Python Developer",
        sector="IT",
        match_score=72.0,
        strong_skills=["Python", "FastAPI"],
        development_skills=[],
        critical_gaps=["PostgreSQL Performance"],
        skill_details=[],
        is_aspiring_role=True,
    )

    class MockProj:
        def __init__(self, status="VERIFIED"):
            self.title = "FastAPI Microservices Platform"
            self.verification_status = status
            self.github_url = "https://github.com/test/repo"
            self.live_url = "https://demo.example.com"

    strengths = career_recommendation_service.extract_strengths(
        role_match=role_match,
        readiness_score=0.74,
        placement_probability=0.72,
        projects=[MockProj("VERIFIED")],
        applications=[],
    )
    assert len(strengths) >= 2
    assert any("Core Competency" in s.title for s in strengths)
    assert any("Verified Technical Portfolio" in s.title for s in strengths)

    risks = career_recommendation_service.extract_risks(
        role_match=role_match,
        readiness_score=0.74,
        placement_probability=0.72,
        projects=[],  # Zero projects triggers critical proof risk
        applications=[],
    )
    assert len(risks) >= 2
    assert any(r.severity == "CRITICAL" for r in risks)
    assert any("PostgreSQL Performance" in r.title for r in risks)
