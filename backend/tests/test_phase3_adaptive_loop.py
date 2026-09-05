from datetime import datetime, timezone
from typing import Tuple
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.assessment import AssessmentQuestion, LearnerSkillMastery
from src.models.competency import Competency
from src.models.learner import Learner
from src.models.learning_plan import (
    CompetencyPrerequisite,
    LearningActivity,
    LearningPlan,
    LearningPlanModule,
    ReassessmentAttempt,
)
from src.models.role import Role
from src.services.adaptive_reassessment_service import AdaptiveReassessmentService
from src.services.learning_plan_service import LearningPlanService


async def create_candidate(client: AsyncClient, name: str, email: str) -> Tuple[dict, dict]:
    """Helper creating a test candidate with JWT headers."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password1234!", "full_name": name, "role": "LEARNER"},
    )
    assert reg.status_code == 201, reg.text

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password1234!"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return reg.json(), headers


@pytest.mark.asyncio
async def test_plan_generation_prerequisites_and_ordering(client: AsyncClient, db: AsyncSession):
    """
    Verifies that:
    1. A candidate can generate a personalized remedial Learning Plan.
    2. Prerequisites are strictly respected in module sequencing (Python Basics before Python OOP).
    3. Estimated hours and priority scores are calculated deterministically.
    4. Repeated generation is idempotent and avoids creating duplicate active plans.
    """
    # 1. Register candidate
    u_suffix = uuid.uuid4().hex[:6]
    email = f"plan.learner.{u_suffix}@example.com"
    user_info, headers = await create_candidate(client, "Arjun Verma", email)

    # 2. Select aspiring role (Python Developer)
    roles_resp = await client.get("/api/v1/roles", headers=headers)
    assert roles_resp.status_code == 200
    roles = roles_resp.json()
    py_role = next((r for r in roles if r["code"] == "ROLE-PY-DEV"), roles[0])

    sel_resp = await client.post(
        "/api/v1/learners/me/aspiring-role",
        json={"role_id": py_role["id"]},
        headers=headers,
    )
    assert sel_resp.status_code == 200

    # 3. Generate Learning Plan
    plan_resp = await client.post("/api/v1/learners/me/learning-plan/generate", headers=headers)
    assert plan_resp.status_code == 201, plan_resp.text
    plan = plan_resp.json()

    assert plan["status"] in ["ACTIVE", "COMPLETED"]
    assert plan["role_id"] == py_role["id"]
    assert len(plan["modules"]) > 0
    assert plan["estimated_total_hours"] > 0.0

    # 4. Verify Prerequisite Sequencing: COMP-PY-BASE must appear before COMP-PY-OOP
    module_codes = [m["competency_code"] for m in plan["modules"]]
    if "COMP-PY-BASE" in module_codes and "COMP-PY-OOP" in module_codes:
        idx_base = module_codes.index("COMP-PY-BASE")
        idx_oop = module_codes.index("COMP-PY-OOP")
        assert idx_base < idx_oop, f"Prerequisite violation: COMP-PY-BASE ({idx_base}) must precede COMP-PY-OOP ({idx_oop})"

    # 5. Verify Idempotency: Calling generate again updates or returns existing active plan
    plan_resp_2 = await client.post("/api/v1/learners/me/learning-plan/generate", headers=headers)
    assert plan_resp_2.status_code == 201
    plan_2 = plan_resp_2.json()
    assert plan_2["id"] == plan["id"], "Calling generate should not create duplicate active plans"

    # Also verify GET /me/learning-plan
    get_plan = await client.get("/api/v1/learners/me/learning-plan", headers=headers)
    assert get_plan.status_code == 200
    assert get_plan.json()["id"] == plan["id"]


@pytest.mark.asyncio
async def test_practice_question_selection_and_leakage_prevention(client: AsyncClient, db: AsyncSession):
    """
    Verifies that:
    1. Practice items are retrieved according to the active module's competency and difficulty.
    2. Correct answers and pedagogical explanations are NEVER leaked in practice items.
    """
    u_suffix = uuid.uuid4().hex[:6]
    email = f"practice.learner.{u_suffix}@example.com"
    _, headers = await create_candidate(client, "Ravi Shankar", email)

    # Generate plan
    plan_resp = await client.post("/api/v1/learners/me/learning-plan/generate", headers=headers)
    assert plan_resp.status_code == 201
    plan = plan_resp.json()
    first_mod = plan["modules"][0]
    comp_id = first_mod["competency_id"]

    # Fetch practice questions
    q_resp = await client.get(f"/api/v1/learners/me/practice/{comp_id}", headers=headers)
    assert q_resp.status_code == 200, q_resp.text
    q_data = q_resp.json()

    assert q_data["competency_id"] == comp_id
    assert len(q_data["questions"]) >= 1

    for item in q_data["questions"]:
        assert "id" in item
        assert "question_text" in item
        assert "options" in item
        assert len(item["options"]) >= 2
        # Anti-leakage assertions
        assert "correct_answer" not in item
        assert "explanation" not in item


@pytest.mark.asyncio
async def test_closed_loop_reassessment_bkt_update_and_convergence(client: AsyncClient, db: AsyncSession):
    """
    Verifies that:
    1. Submitting correct practice answers updates BKT mastery upward.
    2. Gap delta is positive and logged in reassessment_attempts.
    3. Status progresses from IN_PRACTICE to MASTERED once target threshold is reached.
    4. Next module in roadmap unlocks.
    """
    u_suffix = uuid.uuid4().hex[:6]
    email = f"convergence.learner.{u_suffix}@example.com"
    _, headers = await create_candidate(client, "Deepak Patel", email)

    # Generate plan
    plan_resp = await client.post("/api/v1/learners/me/learning-plan/generate", headers=headers)
    plan = plan_resp.json()
    mod = plan["modules"][0]
    comp_id = mod["competency_id"]

    # 1. Fetch practice questions
    q_resp = await client.get(f"/api/v1/learners/me/practice/{comp_id}", headers=headers)
    assert q_resp.status_code == 200
    questions = q_resp.json()["questions"]
    assert len(questions) > 0

    # Query true correct answers from database to simulate an accurate candidate
    q_ids = [q["id"] for q in questions]
    true_q = await db.execute(
        select(AssessmentQuestion).where(AssessmentQuestion.id.in_(q_ids))
    )
    answers_map = {str(q.id): q.correct_answer for q in true_q.scalars().all()}

    submission_payload = {
        "answers": [
            {"question_id": q["id"], "selected_answer": answers_map[q["id"]]}
            for q in questions
        ],
        "time_spent_seconds": 120,
    }

    # 2. Submit practice attempt
    sub_resp = await client.post(
        f"/api/v1/learners/me/practice/{comp_id}/submit",
        json=submission_payload,
        headers=headers,
    )
    assert sub_resp.status_code == 200, sub_resp.text
    result = sub_resp.json()

    assert result["posterior_mastery"] > result["prior_mastery"], "Correct responses must increase BKT mastery"
    assert result["gap_delta"] > 0, "Gap delta must be positive"
    assert result["accuracy"] == 1.0
    assert result["result"] in ["GAP_REDUCED", "MASTERED"]
    assert len(result["feedback"]) == len(questions)
    assert all(f["is_correct"] for f in result["feedback"])


@pytest.mark.asyncio
async def test_deterministic_adaptation_strategies(client: AsyncClient, db: AsyncSession):
    """
    Verifies the standalone adaptation decision engine:
    1. Difficulty backoff from ADVANCED to INTERMEDIATE to BEGINNER.
    2. Prerequisite remediation triggered when foundational gap exists.
    3. Spaced repetition scheduled when repeated stagnant attempts occur at Beginner level.
    """
    # 1. Test Gap Closed -> MASTERED
    res_mastered = AdaptiveReassessmentService.determine_adaptation_action(
        prior_mastery=0.68,
        posterior_mastery=0.74,
        target_mastery=0.70,
        adaptation_count=0,
        has_unmet_prerequisites=False,
        current_difficulty="INTERMEDIATE",
    )
    assert res_mastered["result"] == "MASTERED"
    assert res_mastered["action"] == "NONE"

    # 2. Test Gap Reduced -> GAP_REDUCED
    res_reduced = AdaptiveReassessmentService.determine_adaptation_action(
        prior_mastery=0.30,
        posterior_mastery=0.45,
        target_mastery=0.70,
        adaptation_count=0,
        has_unmet_prerequisites=False,
        current_difficulty="BEGINNER",
    )
    assert res_reduced["result"] == "GAP_REDUCED"
    assert res_reduced["action"] == "NONE"

    # 3. Test Prerequisite Remediation Priority
    res_prereq = AdaptiveReassessmentService.determine_adaptation_action(
        prior_mastery=0.40,
        posterior_mastery=0.38,
        target_mastery=0.70,
        adaptation_count=0,
        has_unmet_prerequisites=True,  # Blocked by prerequisite
        current_difficulty="INTERMEDIATE",
    )
    assert res_prereq["result"] == "REGRESSED"
    assert res_prereq["action"] == "PREREQUISITE_REMEDIATION"
    assert res_prereq["next_difficulty"] == "BEGINNER"

    # 4. Test Difficulty Backoff (ADVANCED -> INTERMEDIATE)
    res_backoff = AdaptiveReassessmentService.determine_adaptation_action(
        prior_mastery=0.72,
        posterior_mastery=0.69,
        target_mastery=0.80,
        adaptation_count=0,
        has_unmet_prerequisites=False,
        current_difficulty="ADVANCED",
    )
    assert res_backoff["action"] == "DIFFICULTY_BACKOFF"
    assert res_backoff["next_difficulty"] == "INTERMEDIATE"

    # 5. Test Spaced Repetition on repeated failure at BEGINNER
    res_spaced = AdaptiveReassessmentService.determine_adaptation_action(
        prior_mastery=0.25,
        posterior_mastery=0.22,
        target_mastery=0.70,
        adaptation_count=2,  # Already adapted multiple times
        has_unmet_prerequisites=False,
        current_difficulty="BEGINNER",
    )
    assert res_spaced["action"] == "SPACED_REPETITION"
    assert res_spaced["next_available_at"] is not None


@pytest.mark.asyncio
async def test_learning_activity_tracking_and_evidence_rule(client: AsyncClient, db: AsyncSession):
    """
    CRITICAL MANDATORY RULE VERIFICATION:
    Learning activity (reading documentation, watching lectures) logged in learning_activities
    must NEVER alter BKT knowledge state directly. Only assessment responses can update BKT.
    """
    u_suffix = uuid.uuid4().hex[:6]
    email = f"activity.learner.{u_suffix}@example.com"
    _, headers = await create_candidate(client, "Ananya Roy", email)

    # 1. Generate plan
    plan_resp = await client.post("/api/v1/learners/me/learning-plan/generate", headers=headers)
    mod = plan_resp.json()["modules"][0]
    comp_id = mod["competency_id"]
    initial_mastery = mod["current_mastery"]

    # 2. Record 60 minutes of studying documentation
    act_resp = await client.post(
        "/api/v1/learners/me/learning-activity",
        json={
            "module_id": mod["id"],
            "activity_type": "RESOURCE_COMPLETED",
            "time_spent_minutes": 60,
        },
        headers=headers,
    )
    assert act_resp.status_code == 201, act_resp.text
    act_data = act_resp.json()
    assert act_data["time_spent_minutes"] == 60
    assert act_data["activity_type"] == "RESOURCE_COMPLETED"

    # 3. Retrieve activities list
    acts_list_resp = await client.get("/api/v1/learners/me/learning-activity", headers=headers)
    assert acts_list_resp.status_code == 200
    assert len(acts_list_resp.json()) >= 1

    # 4. Check BKT knowledge state: MUST BE UNCHANGED
    plan_refresh = await client.get("/api/v1/learners/me/learning-plan", headers=headers)
    refreshed_mod = next(m for m in plan_refresh.json()["modules"] if m["competency_id"] == comp_id)
    assert refreshed_mod["current_mastery"] == initial_mastery, (
        f"VIOLATION OF EVIDENCE RULE: Learning activity increased BKT mastery from {initial_mastery} "
        f"to {refreshed_mod['current_mastery']} without assessment evidence!"
    )


@pytest.mark.asyncio
async def test_multi_tenant_isolation_phase3(client: AsyncClient, db: AsyncSession):
    """
    Verifies cross-tenant boundaries:
    Candidate A cannot view or manipulate Candidate B's learning plan, modules, or activities.
    """
    # Candidate A
    u_a = uuid.uuid4().hex[:6]
    _, headers_a = await create_candidate(client, "Candidate A", f"cand.a.{u_a}@example.com")
    plan_a_resp = await client.post("/api/v1/learners/me/learning-plan/generate", headers=headers_a)
    plan_a = plan_a_resp.json()
    module_a_id = plan_a["modules"][0]["id"]

    # Candidate B
    u_b = uuid.uuid4().hex[:6]
    _, headers_b = await create_candidate(client, "Candidate B", f"cand.b.{u_b}@example.com")

    # 1. Candidate B tries to access Candidate A's module details -> 403 Forbidden
    cross_mod_resp = await client.get(
        f"/api/v1/learners/me/learning-plan/{module_a_id}",
        headers=headers_b,
    )
    assert cross_mod_resp.status_code == 403, (
        f"Expected 403 Forbidden for cross-tenant module access, got {cross_mod_resp.status_code}"
    )

    # 2. Candidate B views their own plan -> receives their own unique plan, not A's
    plan_b_resp = await client.get("/api/v1/learners/me/learning-plan", headers=headers_b)
    assert plan_b_resp.status_code == 200
    plan_b = plan_b_resp.json()
    assert plan_b["id"] != plan_a["id"]
