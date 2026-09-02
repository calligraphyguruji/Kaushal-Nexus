from datetime import datetime, timezone
from typing import Dict
from fastapi import APIRouter, Depends, status

from src.api.deps import get_current_user, require_role
from src.ml.embeddings import skill_embedding_service
from src.ml.wage_predictor import wage_prediction_service
from src.models.user import User
from src.schemas.ml_dto import (
    MLModelsRegistryResponseDTO,
    ModelMetadataDTO,
    SkillSimilarityRequestDTO,
    SkillSimilarityResponseDTO,
    WagePredictionRequestDTO,
    WagePredictionResponseDTO,
)
from src.schemas.user import UserRole

router = APIRouter()

ML_METADATA_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.SYSTEM_ADMIN,
)
ML_INFERENCE_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.SYSTEM_ADMIN,
)


@router.get(
    "/models",
    response_model=MLModelsRegistryResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="List Active ML Models & Versioning Metadata",
    description="Retrieves active ML models, versions, training metrics, feature sets, and prototyping disclaimers.",
)
async def list_ml_models(
    current_user: User = Depends(require_role(*ML_METADATA_ROLES)),
) -> MLModelsRegistryResponseDTO:
    """Returns model versioning metadata and disclaimers."""
    embed_meta = skill_embedding_service.get_metadata()
    wage_meta = wage_prediction_service.get_metadata()

    models = [
        ModelMetadataDTO(
            model_name=embed_meta["model_name"],
            version=embed_meta["version"],
            algorithm=embed_meta["algorithm"],
            disclaimer=embed_meta["disclaimer"],
            is_production_ready=embed_meta.get("is_production_ready", False),
            details={"vocabulary_size": embed_meta.get("vocabulary_size")},
        ),
        ModelMetadataDTO(
            model_name=wage_meta["model_name"],
            version=wage_meta["version"],
            algorithm=wage_meta["algorithm"],
            disclaimer=wage_meta["disclaimer"],
            is_production_ready=wage_meta.get("is_production_ready", False),
            details={
                "features": wage_meta.get("feature_names"),
                "metrics": wage_meta.get("metrics"),
            },
        ),
    ]

    return MLModelsRegistryResponseDTO(
        models=models,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.post(
    "/skill-similarity",
    response_model=SkillSimilarityResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Compute Semantic Skill Similarity",
    description="Vectorizes candidate and job competency lists to compute TF-IDF cosine distance, matched competencies, and missing skills.",
)
async def compute_skill_similarity_endpoint(
    req: SkillSimilarityRequestDTO,
    current_user: User = Depends(require_role(*ML_INFERENCE_ROLES)),
) -> SkillSimilarityResponseDTO:
    """Calculates semantic vector similarity between skill sets."""
    overall_sim = skill_embedding_service.compute_similarity(
        candidate_skills=req.candidate_skills,
        required_skills=req.required_skills,
    )

    matched, missing, scores = skill_embedding_service.extract_matched_and_missing(
        candidate_skills=req.candidate_skills,
        required_skills=req.required_skills,
        threshold=req.threshold or 0.35,
    )

    score_dict: Dict[str, float] = {
        req_skill: score
        for req_skill, score in zip(req.required_skills, scores)
    }

    meta = skill_embedding_service.get_metadata()

    return SkillSimilarityResponseDTO(
        overall_similarity_score=overall_sim,
        matched_skills=matched,
        missing_skills=missing,
        similarity_per_skill=score_dict,
        model_version=meta["version"],
        disclaimer=meta["disclaimer"],
    )


@router.post(
    "/predict-wage",
    response_model=WagePredictionResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Predict Expected Starting Compensation Band",
    description="Estimates starting CTC (in LPA INR) using Ridge regression based on candidate readiness, NSQF level, sector, and district tier.",
)
async def predict_wage_endpoint(
    req: WagePredictionRequestDTO,
    current_user: User = Depends(require_role(*ML_INFERENCE_ROLES)),
) -> WagePredictionResponseDTO:
    """Predicts starting CTC and compensation interval."""
    features = req.model_dump()
    result = wage_prediction_service.predict_wage(features)

    return WagePredictionResponseDTO(
        predicted_ctc_lpa=result.predicted_ctc_lpa,
        min_expected_ctc_lpa=result.min_expected_ctc_lpa,
        max_expected_ctc_lpa=result.max_expected_ctc_lpa,
        confidence_score=result.confidence_score,
        feature_contributions=result.feature_contributions,
        model_version=result.model_version,
        disclaimer=result.disclaimer,
    )
