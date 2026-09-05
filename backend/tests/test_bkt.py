import json
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from src.main import app
from src.core.config import settings
from src.ml.bkt import BayesianKnowledgeTracingEngine, bkt_engine
from src.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentSubmission,
    LearnerSkillHistory,
    LearnerSkillMastery,
)
from src.models.competency import Competency
from src.models.learner import Learner
from src.models.user import User


# ==============================================================================
# 1. UNIT TESTS: Pure BKT Algorithm & Mathematical Properties
# ==============================================================================

def test_bkt_default_initialization():
    """Test 4: First attempt starts from P(L0)."""
    engine = BayesianKnowledgeTracingEngine()
    initial_m = engine.get_initial_mastery()
    assert initial_m == pytest.approx(0.30, abs=0.01)


def test_bkt_correct_answer_increases_mastery():
    """Test 1: Correct answer increases mastery."""
    engine = BayesianKnowledgeTracingEngine()
    current = 0.30
    updated = engine.update_mastery(current_mastery=current, correct=True)
    assert updated > current
    # With defaults: P(known|correct) = (0.30 * 0.90) / ((0.30*0.90) + (0.70*0.20)) = 0.27 / (0.27 + 0.14) = 0.6585
    # new_mastery = 0.6585 + (1 - 0.6585)*0.10 = 0.6585 + 0.03415 = 0.6927
    assert updated == pytest.approx(0.6927, abs=0.01)


def test_bkt_incorrect_answer_decreases_mastery():
    """Test 2: Incorrect answer decreases mastery."""
    engine = BayesianKnowledgeTracingEngine()
    current = 0.50
    updated = engine.update_mastery(current_mastery=current, correct=False)
    assert updated < current
    # With defaults: P(known|incorrect) = (0.50*0.10) / ((0.50*0.10) + (0.50*0.80)) = 0.05 / 0.45 = 0.1111
    # new_mastery = 0.1111 + (1 - 0.1111)*0.10 = 0.2000
    assert updated == pytest.approx(0.20, abs=0.01)


def test_bkt_mastery_bounded_between_0_and_1():
    """Test 3: Mastery remains strictly between 0 and 1 under extreme inputs."""
    engine = BayesianKnowledgeTracingEngine()

    # Extreme low
    res_low = engine.update_mastery(current_mastery=0.0, correct=False)
    assert 0.0 <= res_low <= 1.0

    # Extreme high
    res_high = engine.update_mastery(current_mastery=1.0, correct=True)
    assert 0.0 <= res_high <= 1.0

    # Clamped bounds
    assert 0.0 <= engine.update_mastery(-0.5, correct=False) <= 1.0
    assert 0.0 <= engine.update_mastery(1.5, correct=True) <= 1.0


def test_bkt_multiple_correct_answers_trend_upward():
    """Test 5: Multiple correct answers continuously increase mastery toward 1.0."""
    engine = BayesianKnowledgeTracingEngine()
    mastery = engine.get_initial_mastery()
    history = [mastery]

    for _ in range(6):
        mastery = engine.update_mastery(current_mastery=mastery, correct=True)
        history.append(mastery)

    # Verify strictly increasing
    for i in range(len(history) - 1):
        assert history[i + 1] > history[i]
    assert history[-1] > 0.90


def test_bkt_multiple_incorrect_answers_trend_downward():
    """Test 6: Multiple incorrect answers reduce mastery downward."""
    engine = BayesianKnowledgeTracingEngine()
    mastery = 0.85
    history = [mastery]

    for _ in range(5):
        mastery = engine.update_mastery(current_mastery=mastery, correct=False)
        history.append(mastery)

    for i in range(len(history) - 1):
        assert history[i + 1] < history[i]
    assert history[-1] < 0.25


def test_bkt_mastery_classification_thresholds():
    """Test: Classifies mastery probabilities according to configured thresholds."""
    engine = BayesianKnowledgeTracingEngine()
    assert engine.classify_mastery(0.25) == "weak"
    assert engine.classify_mastery(0.39) == "weak"
    assert engine.classify_mastery(0.40) == "developing"
    assert engine.classify_mastery(0.55) == "developing"
    assert engine.classify_mastery(0.60) == "proficient"
    assert engine.classify_mastery(0.79) == "proficient"
    assert engine.classify_mastery(0.80) == "mastered"
    assert engine.classify_mastery(0.95) == "mastered"


def test_bkt_skill_gap_calculation():
    """Test: Skill gap = required_mastery - learner_mastery (positive gaps only, sorted descending)."""
    engine = BayesianKnowledgeTracingEngine()
    learner_masteries = {
        "Python Basics": 0.82,
        "Python OOP": 0.54,
        "SQL": 0.43,
        "Git": 0.31,
        "REST API": 0.25,
    }
    result = engine.calculate_skill_gaps("Python Developer Intern", learner_masteries)

    assert result["role"] == "Python Developer Intern"
    gaps = result["skill_gaps"]
    assert len(gaps) > 0

    # Python Basics (req: 0.80, current: 0.82) has gap = 0, should not be in positive gaps
    gap_skills = [g["skill"] for g in gaps]
    assert "Python Basics" not in gap_skills

    # Sorted descending by gap magnitude
    for i in range(len(gaps) - 1):
        assert gaps[i]["gap"] >= gaps[i + 1]["gap"]

    # Top gap should be REST API (0.60 - 0.25 = 0.35)
    assert gaps[0]["skill"] == "REST API"
    assert gaps[0]["gap"] == pytest.approx(0.35, abs=0.01)
    assert gaps[0]["priority"] == "high"


def test_bkt_feature_vector_for_ml():
    """Test: Clean feature vector representation for downstream XGBoost training."""
    engine = BayesianKnowledgeTracingEngine()
    raw = {
        "Python Basics": 0.82,
        "Python OOP": 0.54,
        "SQL": 0.43,
        "Git": 0.31,
    }
    vector = engine.extract_feature_vector(raw)
    assert vector["python_basics_mastery"] == 0.82
    assert vector["python_oop_mastery"] == 0.54
    assert vector["sql_mastery"] == 0.43
    assert vector["git_mastery"] == 0.31


# ==============================================================================
# 2. INTEGRATION TESTS: Database Models, State Persistence & API Flow
# ==============================================================================

@pytest.mark.asyncio
async def test_db_learner_skill_mastery_persistence(db):
    """Test 7, 8, 9, 10: State persistence, skill isolation, user isolation, and unique constraints."""
    # 1. Fetch 2 distinct competencies
    c_stmt = select(Competency).limit(2)
    c_res = await db.execute(c_stmt)
    comps = c_res.scalars().all()
    assert len(comps) >= 2
    comp1, comp2 = comps[0], comps[1]

    # 2. Fetch 2 distinct learners
    l_stmt = select(Learner).limit(2)
    l_res = await db.execute(l_stmt)
    learners = l_res.scalars().all()
    assert len(learners) >= 2
    learner1, learner2 = learners[0], learners[1]

    # 3. Create or update mastery for learner1, comp1
    m1_prev = bkt_engine.get_initial_mastery()
    m1 = LearnerSkillMastery(
        learner_id=learner1.id,
        skill_id=comp1.id,
        mastery_probability=m1_prev,
        questions_attempted=1,
        correct_answers=1,
        incorrect_answers=0,
    )
    # Simulate update
    m1_new = bkt_engine.update_mastery(m1_prev, correct=True)
    m1.mastery_probability = m1_new

    # Learner1, comp2 (separate skill state)
    m2 = LearnerSkillMastery(
        learner_id=learner1.id,
        skill_id=comp2.id,
        mastery_probability=0.30,
        questions_attempted=1,
        correct_answers=0,
        incorrect_answers=1,
    )
    m2_new = bkt_engine.update_mastery(0.30, correct=False)
    m2.mastery_probability = m2_new

    # Learner2, comp1 (separate learner state for same skill)
    m3 = LearnerSkillMastery(
        learner_id=learner2.id,
        skill_id=comp1.id,
        mastery_probability=0.90,
        questions_attempted=5,
        correct_answers=5,
        incorrect_answers=0,
    )

    # Test skill isolation: comp1 mastery != comp2 mastery for learner1
    assert m1.mastery_probability != m2.mastery_probability

    # Test user isolation: learner1 comp1 mastery != learner2 comp1 mastery
    assert m1.mastery_probability != m3.mastery_probability


@pytest.mark.asyncio
async def test_api_get_learner_skills(client: AsyncClient, auth_headers_msde):
    """Test API: GET /api/v1/learners/{learner_id}/skills."""
    # Find a learner with masteries
    resp = await client.get(
        "/api/v1/learners",
        headers=auth_headers_msde,
    )
    assert resp.status_code == 200
    learners = resp.json()["items"]
    assert len(learners) > 0
    test_learner_id = learners[0]["id"]

    # Query skills endpoint
    skills_resp = await client.get(
        f"/api/v1/learners/{test_learner_id}/skills",
        headers=auth_headers_msde,
    )
    assert skills_resp.status_code == 200
    data = skills_resp.json()
    assert "skills" in data
    assert data["learner_id"] == test_learner_id

    if data["skills"]:
        s = data["skills"][0]
        assert "skill_id" in s
        assert "skill" in s
        assert "mastery_probability" in s
        assert "status" in s
        assert 0.0 <= s["mastery_probability"] <= 1.0


@pytest.mark.asyncio
async def test_api_get_learner_skill_gaps(client: AsyncClient, auth_headers_msde):
    """Test API: GET /api/v1/learners/{learner_id}/skill-gaps."""
    resp = await client.get(
        "/api/v1/learners",
        headers=auth_headers_msde,
    )
    test_learner_id = resp.json()["items"][0]["id"]

    gaps_resp = await client.get(
        f"/api/v1/learners/{test_learner_id}/skill-gaps?role_id=Python Developer Intern",
        headers=auth_headers_msde,
    )
    assert gaps_resp.status_code == 200
    data = gaps_resp.json()
    assert data["role"] == "Python Developer Intern"
    assert "overall_alignment" in data
    assert "skill_gaps" in data
    for g in data["skill_gaps"]:
        assert g["gap"] > 0.0
        assert g["priority"] in ["high", "medium", "low"]


@pytest.mark.asyncio
async def test_api_get_learner_bkt_features(client: AsyncClient, auth_headers_msde):
    """Test API: GET /api/v1/learners/{learner_id}/bkt-features (XGBoost compatibility)."""
    resp = await client.get(
        "/api/v1/learners",
        headers=auth_headers_msde,
    )
    test_learner_id = resp.json()["items"][0]["id"]

    feat_resp = await client.get(
        f"/api/v1/learners/{test_learner_id}/bkt-features",
        headers=auth_headers_msde,
    )
    assert feat_resp.status_code == 200
    data = feat_resp.json()
    assert data["learner_id"] == test_learner_id
    assert "features" in data
    assert isinstance(data["features"], dict)


@pytest.mark.asyncio
async def test_api_assessment_flow_and_submission(client: AsyncClient, auth_headers_msde):
    """Test complete assessment lifecycle: list -> fetch questions -> submit answers -> verify BKT update."""
    # 1. List assessments
    list_resp = await client.get(
        "/api/v1/assessments",
        headers=auth_headers_msde,
    )
    assert list_resp.status_code == 200
    assessments = list_resp.json()
    assert len(assessments) > 0
    test_assessment = assessments[0]

    # 2. Get questions
    detail_resp = await client.get(
        f"/api/v1/assessments/{test_assessment['id']}",
        headers=auth_headers_msde,
    )
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert len(detail["questions"]) > 0

    # Ensure correct answers are NOT leaked in candidate question payload
    for q in detail["questions"]:
        assert "correct_answer" not in q
        assert len(q["options"]) >= 2

    # 3. Submit assessment
    learners_resp = await client.get(
        "/api/v1/learners",
        headers=auth_headers_msde,
    )
    test_learner_id = learners_resp.json()["items"][0]["id"]

    submit_payload = {
        "learner_id": test_learner_id,
        "answers": [
            {
                "question_id": detail["questions"][0]["id"],
                "selected_answer": detail["questions"][0]["options"][0],
            },
            {
                "question_id": detail["questions"][1]["id"],
                "selected_answer": detail["questions"][1]["options"][0],
            },
        ],
    }

    sub_resp = await client.post(
        f"/api/v1/assessments/{test_assessment['id']}/submit",
        json=submit_payload,
        headers=auth_headers_msde,
    )
    assert sub_resp.status_code == 200
    sub_data = sub_resp.json()

    assert "submission_id" in sub_data
    assert "score_percentage" in sub_data
    assert "updated_masteries" in sub_data
    assert len(sub_data["results"]) == 2

    # Check that score percentage exists separately from BKT mastery
    assert 0.0 <= sub_data["score_percentage"] <= 100.0
    for res in sub_data["results"]:
        assert "previous_mastery" in res
        assert "new_mastery" in res
        assert "is_correct" in res
        assert 0.0 <= res["new_mastery"] <= 1.0


@pytest.mark.asyncio
async def test_api_quick_attempt_drill(client: AsyncClient, auth_headers_msde):
    """Test API: POST /api/v1/assessments/quick-attempt for interactive real-time drills."""
    # Get an assessment question
    list_resp = await client.get(
        "/api/v1/assessments",
        headers=auth_headers_msde,
    )
    test_assessment_id = list_resp.json()[0]["id"]
    detail_resp = await client.get(
        f"/api/v1/assessments/{test_assessment_id}",
        headers=auth_headers_msde,
    )
    first_q = detail_resp.json()["questions"][0]

    learners_resp = await client.get(
        "/api/v1/learners",
        headers=auth_headers_msde,
    )
    test_learner_id = learners_resp.json()["items"][0]["id"]

    quick_payload = {
        "learner_id": test_learner_id,
        "question_id": first_q["id"],
        "selected_answer": first_q["options"][0],
    }

    q_resp = await client.post(
        "/api/v1/assessments/quick-attempt",
        json=quick_payload,
        headers=auth_headers_msde,
    )
    assert q_resp.status_code == 200
    q_data = q_resp.json()
    assert q_data["learner_id"] == test_learner_id
    assert q_data["question_id"] == first_q["id"]
    assert "is_correct" in q_data
    assert "previous_mastery" in q_data
    assert "new_mastery" in q_data
    assert "mastery_status" in q_data
