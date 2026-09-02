import pytest
from httpx import AsyncClient
import numpy as np

from src.ml.embeddings import (
    SkillEmbeddingService,
    TfidfSkillEmbeddingService,
    skill_embedding_service,
)
from src.ml.wage_predictor import (
    ScikitLearnWagePredictionService,
    WagePredictionResult,
    WagePredictionService,
    wage_prediction_service,
)
from src.models.competency import Competency, LearnerSkill
from src.services.matching_engine import MatchingEngine


# ==============================================================================
# SkillEmbeddingService Unit & Interface Tests
# ==============================================================================

def test_skill_embedding_service_interface_and_dimensions():
    """Verify SkillEmbeddingService interface compliance and TF-IDF matrix dimensions."""
    svc: SkillEmbeddingService = TfidfSkillEmbeddingService()
    assert isinstance(svc, SkillEmbeddingService)

    # Embed sample skills
    vec = svc.embed_skills(["Python for Data Analytics", "SQL Databases"])
    assert isinstance(vec, np.ndarray)
    assert vec.ndim == 2
    assert vec.shape[0] == 1
    assert vec.shape[1] > 20  # Feature vocabulary dimension

    # Empty list handling
    empty_vec = svc.embed_skills([])
    assert isinstance(empty_vec, np.ndarray)
    assert empty_vec.shape == (1, vec.shape[1])
    assert np.all(empty_vec == 0)


def test_skill_similarity_matching():
    """Verify semantic cosine similarity scores across related vs unrelated skills."""
    svc: SkillEmbeddingService = skill_embedding_service

    # Case 1: Closely related skills
    sim_high = svc.compute_similarity(
        candidate_skills=["Python Data Science", "SQL Relational Database", "Pandas"],
        required_skills=["Python for Data Analytics", "SQL Database Querying"],
    )
    assert sim_high >= 0.50

    # Case 2: Unrelated skills
    sim_low = svc.compute_similarity(
        candidate_skills=["Manual Arc Welding", "MIG Fabrication"],
        required_skills=["React.js Frontend UI", "TypeScript Backend"],
    )
    assert sim_low < 0.20

    # Case 3: Empty requirements return 1.0 (no unmet constraints)
    assert svc.compute_similarity(["Python"], []) == 1.0


def test_extract_matched_and_missing_skills():
    """Verify extraction of satisfied competencies vs missing skill gaps."""
    svc: SkillEmbeddingService = skill_embedding_service

    candidate = ["Python for Data Analytics", "SQL Databases", "Linux SysAdmin"]
    required = [
        "Python Data Science Stack",
        "SQL Database Management",
        "Power BI Dashboarding",
        "AWS Cloud Services",
    ]

    matched, missing, scores = svc.extract_matched_and_missing(
        candidate_skills=candidate,
        required_skills=required,
        threshold=0.35,
    )

    assert len(scores) == len(required)
    assert "Python Data Science Stack" in matched
    assert "SQL Database Management" in matched
    assert "Power BI Dashboarding" in missing
    assert "AWS Cloud Services" in missing


def test_skill_embedding_model_metadata_and_disclaimer():
    """Verify versioning metadata and non-production disclaimer."""
    meta = skill_embedding_service.get_metadata()
    assert meta["model_name"] == "KaushalNexus-SkillEmbedding-TFIDF"
    assert meta["version"] == "0.2.1-prototype"
    assert "TF-IDF" in meta["algorithm"]
    assert meta["is_production_ready"] is False
    assert "disclaimer" in meta
    assert "not certified" in meta["disclaimer"].lower()


# ==============================================================================
# WagePredictionService Unit & Interface Tests
# ==============================================================================

def test_wage_prediction_service_interface_and_training():
    """Verify WagePredictionService interface compliance and regression training metrics."""
    svc: WagePredictionService = ScikitLearnWagePredictionService()
    assert isinstance(svc, WagePredictionService)

    # Train model
    metrics = svc.train()
    assert "r2_score" in metrics
    assert "mae_lpa" in metrics
    assert metrics["r2_score"] > 0.60
    assert metrics["mae_lpa"] < 0.80


def test_wage_predictions_sensitivity_and_bounds():
    """Verify wage predictions vary with candidate readiness and maintain valid bounds."""
    svc: WagePredictionService = wage_prediction_service

    # Candidate 1: High readiness & higher NSQF
    res_high = svc.predict_wage(
        {
            "employment_readiness_score": 95,
            "nsqf_level": "NSQF Level 6",
            "training_hours": 400,
            "skill_alignment": 95.0,
            "district_tier": "Tier 1",
            "sector": "IT-ITeS",
        }
    )
    assert isinstance(res_high, WagePredictionResult)
    assert res_high.predicted_ctc_lpa >= 4.5
    assert res_high.min_expected_ctc_lpa <= res_high.predicted_ctc_lpa <= res_high.max_expected_ctc_lpa
    assert res_high.confidence_score >= 0.80

    # Candidate 2: Entry-level lower readiness
    res_low = svc.predict_wage(
        {
            "employment_readiness_score": 50,
            "nsqf_level": "NSQF Level 3",
            "training_hours": 150,
            "skill_alignment": 50.0,
            "district_tier": "Tier 3",
            "sector": "Logistics",
        }
    )
    assert res_low.predicted_ctc_lpa < res_high.predicted_ctc_lpa
    assert res_low.min_expected_ctc_lpa <= res_low.predicted_ctc_lpa <= res_low.max_expected_ctc_lpa


def test_wage_prediction_feature_contributions():
    """Verify explainable feature contributions are computed."""
    svc: WagePredictionService = wage_prediction_service
    res = svc.predict_wage(
        {
            "employment_readiness_score": 85,
            "nsqf_level": "NSQF Level 5",
            "training_hours": 300,
            "skill_alignment": 88.0,
            "district_tier": "Tier 1",
            "sector": "IT-ITeS",
        }
    )

    contrib = res.feature_contributions
    assert "readiness_score" in contrib
    assert "nsqf_level" in contrib
    assert "sector_weight" in contrib
    assert all(isinstance(v, float) for v in contrib.values())


def test_wage_prediction_model_metadata_and_disclaimer():
    """Verify versioning metadata and prototyping disclaimer."""
    meta = wage_prediction_service.get_metadata()
    assert meta["model_name"] == "KaushalNexus-WagePredictor-Ridge"
    assert meta["version"] == "0.3.0-demo"
    assert "Ridge" in meta["algorithm"]
    assert meta["is_production_ready"] is False
    assert "disclaimer" in meta
    assert "not certified" in meta["disclaimer"].lower()


# ==============================================================================
# Matching Engine Decoupled ML Integration Tests
# ==============================================================================

def test_matching_engine_integration_with_ml_embeddings():
    """Verify MatchingEngine successfully consumes ML embedding service without hard coupling."""
    comp1 = Competency(code="COMP-PY-01", name="Python for Data Analytics", sector="IT-ITeS")
    comp2 = Competency(code="COMP-SQL-01", name="SQL Database Query Optimization", sector="IT-ITeS")

    skills = [
        LearnerSkill(competency=comp1, score_percentage=90),
        LearnerSkill(competency=comp2, score_percentage=85),
    ]

    required = ["Python Data Science Stack", "SQL Relational Databases"]

    # Compute skill alignment using ML embedding service
    engine = MatchingEngine(embedding_service=skill_embedding_service)
    alignment, matched, missing = engine.compute_skill_alignment(skills, required)

    assert alignment >= 0.70
    assert len(matched) == 2
    assert len(missing) == 0


# ==============================================================================
# REST API Integration Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_get_ml_models_registry_endpoint(client: AsyncClient, auth_headers: dict):
    """Test GET /api/v1/ml/models returns registry with versioning metadata."""
    resp = await client.get("/api/v1/ml/models", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert "models" in data
    assert len(data["models"]) >= 2

    model_names = [m["model_name"] for m in data["models"]]
    assert "KaushalNexus-SkillEmbedding-TFIDF" in model_names
    assert "KaushalNexus-WagePredictor-Ridge" in model_names

    for m in data["models"]:
        assert m["is_production_ready"] is False
        assert "disclaimer" in m
        assert "not certified" in m["disclaimer"].lower()


@pytest.mark.asyncio
async def test_post_skill_similarity_endpoint(client: AsyncClient, auth_headers: dict):
    """Test POST /api/v1/ml/skill-similarity computes cosine similarity & matches."""
    payload = {
        "candidate_skills": ["Python for Data Analytics", "SQL Relational Databases", "Linux"],
        "required_skills": ["Python Data Science Stack", "SQL Query Optimization", "Power BI"],
        "threshold": 0.35,
    }

    resp = await client.post(
        "/api/v1/ml/skill-similarity",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()

    assert "overall_similarity_score" in data
    assert data["overall_similarity_score"] > 0.0
    assert isinstance(data["matched_skills"], list)
    assert isinstance(data["missing_skills"], list)
    assert "Power BI" in data["missing_skills"]
    assert "disclaimer" in data


@pytest.mark.asyncio
async def test_post_predict_wage_endpoint(client: AsyncClient, auth_headers: dict):
    """Test POST /api/v1/ml/predict-wage predicts starting compensation band."""
    payload = {
        "employment_readiness_score": 88,
        "nsqf_level": "NSQF Level 5",
        "training_hours": 300,
        "skill_alignment": 90.0,
        "district_tier": "Tier 1",
        "sector": "IT-ITeS",
    }

    resp = await client.post(
        "/api/v1/ml/predict-wage",
        json=payload,
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["predicted_ctc_lpa"] >= 4.0
    assert data["min_expected_ctc_lpa"] <= data["predicted_ctc_lpa"] <= data["max_expected_ctc_lpa"]
    assert data["confidence_score"] > 0.70
    assert isinstance(data["feature_contributions"], dict)
    assert "disclaimer" in data
