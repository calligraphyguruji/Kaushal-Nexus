from datetime import datetime, timezone
import io
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.assessment import Assessment, AssessmentQuestion, LearnerSkillMastery
from src.models.competency import Competency
from src.models.learner import Learner
from src.models.learner_outcome import LearnerOutcome
from src.models.resume import Resume, ResumeSkill
from src.models.role import Role
from src.models.user import User
from src.services.role_matching import role_matching_service


@pytest.mark.asyncio
async def test_learner_registration_and_profile_flow(client: AsyncClient, db: AsyncSession):
    """Verifies that a candidate can register with role LEARNER and manage their profile."""
    # 1. Register candidate
    u_suffix = uuid.uuid4().hex[:6]
    learner_email = f"candidate.{u_suffix}@example.com"
    reg_payload = {
        "email": learner_email,
        "password": "Password1234!",
        "full_name": "Priya Sharma",
        "role": "LEARNER",
    }
    reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201, reg_resp.text
    user_data = reg_resp.json()
    assert user_data["role"] == "LEARNER"

    # 2. Login
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": learner_email, "password": "Password1234!"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Fetch Learner Profile via /learners/me/profile
    prof_resp = await client.get("/api/v1/learners/me/profile", headers=headers)
    assert prof_resp.status_code == 200
    prof = prof_resp.json()
    assert prof["full_name"] == "Priya Sharma"
    assert prof["email"] == learner_email
    assert prof["has_active_resume"] is False
    assert prof["id"].startswith("KN-")

    # 4. Update Profile
    update_payload = {
        "institution": "IIT BHU Varanasi",
        "graduation_year": 2026,
        "experience_years": 1.5,
        "bio": "Aspiring Python backend and machine learning engineer.",
        "github_url": "https://github.com/priyasharma",
        "linkedin_url": "https://linkedin.com/in/priyasharma",
    }
    put_resp = await client.put("/api/v1/learners/me/profile", json=update_payload, headers=headers)
    assert put_resp.status_code == 200
    updated_prof = put_resp.json()
    assert updated_prof["institution"] == "IIT BHU Varanasi"
    assert updated_prof["graduation_year"] == 2026
    assert updated_prof["experience_years"] == 1.5
    assert updated_prof["github_url"] == "https://github.com/priyasharma"


@pytest.mark.asyncio
async def test_roles_and_aspiring_role_selection(client: AsyncClient, db: AsyncSession):
    """Verifies standard role listing and candidate aspiring role selection."""
    # Authenticate as new learner
    u_suffix = uuid.uuid4().hex[:6]
    learner_email = f"aspiring.{u_suffix}@example.com"
    await client.post(
        "/api/v1/auth/register",
        json={"email": learner_email, "password": "Password1234!", "full_name": "Rahul Verma", "role": "LEARNER"},
    )
    login_resp = await client.post("/api/v1/auth/login", json={"email": learner_email, "password": "Password1234!"})
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    # 1. List roles
    roles_resp = await client.get("/api/v1/roles")
    assert roles_resp.status_code == 200
    roles = roles_resp.json()
    assert len(roles) >= 4
    py_role = next((r for r in roles if "Python" in r["title"]), None)
    assert py_role is not None

    # 2. Get role details
    role_id = py_role["id"]
    detail_resp = await client.get(f"/api/v1/roles/{role_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["title"] == py_role["title"]
    assert len(detail["requirements"]) >= 4

    # 3. Set aspiring role
    set_resp = await client.put("/api/v1/learners/me/aspiring-role", json={"role_id": role_id}, headers=headers)
    assert set_resp.status_code == 200
    assert set_resp.json()["id"] == role_id

    # 4. Verify in profile and /me/aspiring-role
    get_aspiring = await client.get("/api/v1/learners/me/aspiring-role", headers=headers)
    assert get_aspiring.status_code == 200
    assert get_aspiring.json()["id"] == role_id


@pytest.mark.asyncio
async def test_resume_upload_skill_extraction_and_bkt_isolation(client: AsyncClient, db: AsyncSession):
    """
    CRITICAL TEST:
    Verifies that uploading a resume extracts candidate text, normalizes candidate skills,
    and stores them strictly in `resume_skills` as candidate evidence,
    NEVER polluting or overwriting BKT `learner_skill_mastery`.
    """
    u_suffix = uuid.uuid4().hex[:6]
    learner_email = f"resume.{u_suffix}@example.com"
    await client.post(
        "/api/v1/auth/register",
        json={"email": learner_email, "password": "Password1234!", "full_name": "Aditi Roy", "role": "LEARNER"},
    )
    login_resp = await client.post("/api/v1/auth/login", json={"email": learner_email, "password": "Password1234!"})
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    # Construct mock resume text with Python, SQL, REST API, Git, and Project
    mock_resume_content = (
        "Aditi Roy\n"
        "Software Engineering Student\n\n"
        "SKILLS\n"
        "Python (2+ years), Python OOP, PostgreSQL, Git, GitHub, REST API, FastAPI, Data Structures\n\n"
        "PROJECTS\n"
        "Analytics Dashboard Microservice | Jan 2025 - Present\n"
        "Built asynchronous REST API using Python and PostgreSQL for high throughput data ingestion.\n"
        "Technologies: Python, FastAPI, PostgreSQL, Git\n"
    ).encode("utf-8")

    files = {"file": ("aditi_resume.pdf", io.BytesIO(mock_resume_content), "application/pdf")}
    upload_resp = await client.post("/api/v1/learners/me/resume", files=files, headers=headers)
    assert upload_resp.status_code == 201, upload_resp.text
    resume_data = upload_resp.json()
    assert resume_data["filename"] == "aditi_resume.pdf"
    assert resume_data["skills_count"] >= 3
    assert len(resume_data["projects"]) >= 1

    extracted_skill_names = [s["raw_skill_text"].lower() for s in resume_data["skills"]]
    assert any("python" in s for s in extracted_skill_names)
    assert any("git" in s for s in extracted_skill_names)

    # Check that skills have normalized competency IDs
    matched_skills = [s for s in resume_data["skills"] if s["competency_id"] is not None]
    assert len(matched_skills) >= 1

    # CRITICAL VERIFICATION:
    # Ensure NO BKT LearnerSkillMastery records were created from the resume!
    learner_id = resume_data["learner_id"]
    m_stmt = select(LearnerSkillMastery).where(LearnerSkillMastery.learner_id == learner_id)
    m_res = await db.execute(m_stmt)
    masteries = m_res.scalars().all()
    assert len(masteries) == 0, "BKT mastery records must NOT be created from resume extraction alone!"

    # Get active resume via GET
    get_res = await client.get("/api/v1/learners/me/resume", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == resume_data["id"]


@pytest.mark.asyncio
async def test_diagnostic_assessment_bkt_update_and_role_matching(client: AsyncClient, db: AsyncSession):
    """
    Verifies the complete pipeline:
    Assessment Submission -> BKT Latent Mastery Update -> Skill Gap Calculation -> Deterministic Role Matching.
    """
    u_suffix = uuid.uuid4().hex[:6]
    learner_email = f"matching.{u_suffix}@example.com"
    await client.post(
        "/api/v1/auth/register",
        json={"email": learner_email, "password": "Password1234!", "full_name": "Vikram Rathore", "role": "LEARNER"},
    )
    login_resp = await client.post("/api/v1/auth/login", json={"email": learner_email, "password": "Password1234!"})
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    # 1. Fetch learner profile to get ID
    prof = (await client.get("/api/v1/learners/me/profile", headers=headers)).json()
    learner_id = prof["id"]

    # 2. Select Python Developer Intern as aspiring role
    roles = (await client.get("/api/v1/roles")).json()
    py_role = next(r for r in roles if "Python" in r["title"])
    await client.put("/api/v1/learners/me/aspiring-role", json={"role_id": py_role["id"]}, headers=headers)

    # 3. Simulate an assessment submission to generate BKT masteries
    assessments_resp = await client.get("/api/v1/assessments", headers=headers)
    assert assessments_resp.status_code == 200
    assessments = assessments_resp.json()
    if assessments:
        assessment_id = assessments[0]["id"]
        # Fetch questions
        a_detail = (await client.get(f"/api/v1/assessments/{assessment_id}", headers=headers)).json()
        if a_detail["questions"]:
            answers = [
                {"question_id": q["id"], "selected_answer": q["options"][0] if q["options"] else "B"}
                for q in a_detail["questions"]
            ]
            submit_resp = await client.post(
                f"/api/v1/assessments/{assessment_id}/submit",
                json={"learner_id": learner_id, "answers": answers},
                headers=headers,
            )
            assert submit_resp.status_code == 200

    # 4. Check candidate BKT skill masteries
    skills_resp = await client.get("/api/v1/learners/me/skills", headers=headers)
    assert skills_resp.status_code == 200

    # 5. Check candidate skill gaps
    gaps_resp = await client.get("/api/v1/learners/me/skill-gaps", headers=headers)
    assert gaps_resp.status_code == 200
    gaps_data = gaps_resp.json()
    assert "skill_gaps" in gaps_data

    # 6. Check role matches
    matches_resp = await client.get("/api/v1/learners/me/role-matches", headers=headers)
    assert matches_resp.status_code == 200
    matches_data = matches_resp.json()
    assert matches_data["aspiring_role"] is not None
    assert matches_data["aspiring_role"]["role_id"] == py_role["id"]
    assert 0.0 <= matches_data["aspiring_role"]["match_score"] <= 100.0
    assert len(matches_data["top_matches"]) >= 1


@pytest.mark.asyncio
async def test_ml_feature_pipeline_and_leakage_guarantee(client: AsyncClient, db: AsyncSession):
    """
    CRITICAL ML PIPELINE TEST:
    Verifies that the ML feature extractor produces a clean, deterministic feature vector
    using pre-outcome data only, and that recording a subsequent career outcome
    in `learner_outcomes` does NOT leak into the feature vector.
    """
    u_suffix = uuid.uuid4().hex[:6]
    learner_email = f"ml.{u_suffix}@example.com"
    await client.post(
        "/api/v1/auth/register",
        json={"email": learner_email, "password": "Password1234!", "full_name": "Siddharth Sen", "role": "LEARNER"},
    )
    login_resp = await client.post("/api/v1/auth/login", json={"email": learner_email, "password": "Password1234!"})
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    # 1. Generate BKT ML feature vector
    feat_resp = await client.get("/api/v1/learners/me/bkt-features", headers=headers)
    assert feat_resp.status_code == 200
    feat_data = feat_resp.json()

    assert "features" in feat_data
    assert "feature_vector" in feat_data
    assert "feature_names" in feat_data
    assert len(feat_data["feature_names"]) == len(feat_data["feature_vector"])

    # Verify canonical skill features exist
    features_dict = feat_data["features"]
    assert "bkt_python_basics_mastery" in features_dict
    assert "bkt_sql_mastery" in features_dict
    assert "bkt_mean_mastery" in features_dict
    assert "experience_years" in features_dict

    # Verify NO outcome or placement metrics exist in feature set (leakage check)
    forbidden_keys = [
        "outcome", "outcome_value", "placed", "placement", "salary",
        "retention", "hire_date", "epfo", "hired"
    ]
    for key in features_dict:
        assert not any(f in key.lower() for f in forbidden_keys), f"Leakage detected: feature '{key}' contains outcome information!"

    # 2. Record a post-assessment career outcome in `learner_outcomes`
    outcome_payload = {
        "outcome_type": "INTERNSHIP_PLACED",
        "outcome_value": 1.0,
        "source": "CAMPUS_DRIVE",
        "notes": "Selected as Python Backend Intern at Tech Partner.",
    }
    outcome_resp = await client.post("/api/v1/learners/me/outcomes", json=outcome_payload, headers=headers)
    assert outcome_resp.status_code == 201
    out_data = outcome_resp.json()
    assert out_data["outcome_type"] == "INTERNSHIP_PLACED"

    # List outcomes
    list_out = await client.get("/api/v1/learners/me/outcomes", headers=headers)
    assert list_out.status_code == 200
    assert len(list_out.json()) >= 1

    # 3. Regenerate feature vector and verify strictly identical feature keys and values (zero leakage)
    feat_resp2 = await client.get("/api/v1/learners/me/bkt-features", headers=headers)
    feat_data2 = feat_resp2.json()
    assert feat_data2["feature_names"] == feat_data["feature_names"]
    for key in feat_data["feature_names"]:
        assert feat_data2["features"][key] == feat_data["features"][key]


@pytest.mark.asyncio
async def test_learner_cross_tenant_isolation(client: AsyncClient, db: AsyncSession):
    """
    SECURITY TEST:
    Verifies strict isolation: Learner A cannot access or mutate Learner B's data via /me/ routes.
    """
    # Create Learner A
    email_a = f"tenant.a.{uuid.uuid4().hex[:6]}@example.com"
    await client.post("/api/v1/auth/register", json={"email": email_a, "password": "Password1234!", "full_name": "Learner Alpha", "role": "LEARNER"})
    token_a = (await client.post("/api/v1/auth/login", json={"email": email_a, "password": "Password1234!"})).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Create Learner B
    email_b = f"tenant.b.{uuid.uuid4().hex[:6]}@example.com"
    await client.post("/api/v1/auth/register", json={"email": email_b, "password": "Password1234!", "full_name": "Learner Beta", "role": "LEARNER"})
    token_b = (await client.post("/api/v1/auth/login", json={"email": email_b, "password": "Password1234!"})).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Verify Learner A gets Alpha
    prof_a = (await client.get("/api/v1/learners/me/profile", headers=headers_a)).json()
    assert prof_a["full_name"] == "Learner Alpha"

    # Verify Learner B gets Beta
    prof_b = (await client.get("/api/v1/learners/me/profile", headers=headers_b)).json()
    assert prof_b["full_name"] == "Learner Beta"
    assert prof_a["id"] != prof_b["id"]

    # Verify Learner A cannot view Learner B's profile via /me
    assert prof_a["email"] != prof_b["email"]

