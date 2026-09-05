from datetime import datetime, timezone
from typing import Dict, Optional
import uuid
from fastapi import APIRouter, Depends, Path, Query, Response, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, require_role
from src.core.database import get_db
from src.core.exceptions import NotFoundException
from src.ml.embeddings import skill_embedding_service
from src.ml.wage_predictor import wage_prediction_service
from src.models.learner import Learner
from src.models.user import User
from src.schemas.career_outcome_dto import (
    MLDatasetExportResponseDTO,
    MLFeatureSnapshotResponseDTO,
)
from src.schemas.ml_dto import (
    MLModelsRegistryResponseDTO,
    ModelMetadataDTO,
    SkillSimilarityRequestDTO,
    SkillSimilarityResponseDTO,
    WagePredictionRequestDTO,
    WagePredictionResponseDTO,
)
from src.schemas.placement_ml_dto import (
    ActiveModelMetadataDTO,
    DataQualityReportDTO,
    TrainMLRequestDTO,
    TrainMLResponseDTO,
)
from src.schemas.career_intelligence_dto import (
    CohortIntelligenceResponseDTO,
    ModelActivationRequestDTO,
    ModelActivationResponseDTO,
    ModelMonitoringResponseDTO,
    RetrainCandidateRequestDTO,
    RetrainCandidateResponseDTO,
)
from src.schemas.user import UserRole
from src.services.ml_feature_snapshot_service import ml_feature_snapshot_service
from src.services.outcome_label_service import outcome_label_service
from src.ml.model_registry import model_registry
from src.services.placement_prediction_service import placement_prediction_service
from src.services.model_monitoring_service import model_monitoring_service
from src.services.cohort_intelligence_service import cohort_intelligence_service

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


@router.get(
    "/dataset",
    status_code=status.HTTP_200_OK,
    summary="Export Leakage-Free Supervised ML Dataset (Staff / Admin Only)",
    description="Constructs historical point-in-time feature snapshots paired with future forward-window career outcome labels for XGBoost training.",
)
async def export_ml_dataset(
    feature_version: str = Query("v1", description="Feature engineering version"),
    label_type: str = Query("INTERNSHIP_ACCEPTED", description="Target milestone label type"),
    horizon_days: int = Query(90, ge=1, le=365, description="Forward observation horizon in days"),
    format: str = Query("json", description="'json' or 'csv'"),
    date_from: Optional[datetime] = Query(None, description="Start date filter for snapshots"),
    date_to: Optional[datetime] = Query(None, description="End date filter for snapshots"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ML_METADATA_ROLES)),
):
    """Exports ML supervised training dataset without data leakage."""
    if format.lower() == "csv":
        csv_data = await outcome_label_service.export_dataset_csv(
            db=db,
            feature_version=feature_version,
            label_type=label_type,
            horizon_days=horizon_days,
        )
        return PlainTextResponse(content=csv_data, media_type="text/csv")

    return await outcome_label_service.build_ml_dataset(
        db=db,
        feature_version=feature_version,
        label_type=label_type,
        horizon_days=horizon_days,
        date_from=date_from,
        date_to=date_to,
    )


@router.post(
    "/snapshots/generate",
    response_model=MLFeatureSnapshotResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Admin Generate Historical Feature Snapshot",
    description="Freezes point-in-time features for any candidate strictly respecting historical cutoff T.",
)
async def generate_learner_snapshot_admin(
    learner_id: str = Query(..., description="Candidate beneficiary identifier"),
    prediction_cutoff: Optional[datetime] = Query(None, description="Historical cutoff timestamp T"),
    feature_version: str = Query("v1", description="Feature version"),
    role_id: Optional[uuid.UUID] = Query(None, description="Target role identifier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ML_METADATA_ROLES)),
) -> MLFeatureSnapshotResponseDTO:
    """Generates and freezes a historical feature snapshot for ML training."""
    learner = await db.get(Learner, learner_id)
    if not learner:
        raise NotFoundException(f"Candidate '{learner_id}' not found.")

    return await ml_feature_snapshot_service.create_historical_snapshot(
        db=db,
        learner=learner,
        cutoff=prediction_cutoff,
        role_id=role_id,
        feature_version=feature_version,
    )


# ==============================================================================
# Phase 5: Calibrated XGBoost Placement Prediction Endpoints
# ==============================================================================

@router.post(
    "/placement/train",
    response_model=TrainMLResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Train, Tune & Calibrate XGBoost Placement Model",
    description="Executes the full Phase 5 ML pipeline: temporal split, baseline comparisons, XGBoost tuning, probability calibration, and registry versioning.",
)
async def train_placement_model_endpoint(
    req: TrainMLRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ML_METADATA_ROLES)),
) -> TrainMLResponseDTO:
    """Trains and calibrates XGBoost placement prediction model."""
    return await placement_prediction_service.run_training_pipeline(db=db, req=req)


@router.get(
    "/placement/data-quality",
    response_model=DataQualityReportDTO,
    status_code=status.HTTP_200_OK,
    summary="Analyze Placement ML Dataset Quality",
    description="Audits missing rates, IQR outliers, near-zero variance, target correlations, and temporal distributions.",
)
async def get_placement_data_quality_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ML_METADATA_ROLES)),
) -> DataQualityReportDTO:
    """Returns dataset quality metrics and feature health indicators."""
    return await placement_prediction_service.get_data_quality_report(db=db)


@router.get(
    "/placement/model",
    response_model=ActiveModelMetadataDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Active Placement Model Metadata & Metrics",
    description="Retrieves active model version, test metrics, temporal split cutoffs, calibration curve, and feature importances.",
)
async def get_active_placement_model_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ML_INFERENCE_ROLES)),
) -> ActiveModelMetadataDTO:
    """Returns metadata for the currently active calibrated placement model."""
    meta = model_registry.get_metadata()
    if not meta:
        await placement_prediction_service.run_training_pipeline(db=db)
        meta = model_registry.get_metadata()
    if not meta:
        raise NotFoundException("Active placement model not available.")
    return meta


@router.get(
    "/placement/runs",
    status_code=status.HTTP_200_OK,
    summary="List Historical Placement Model Training Runs",
    description="Lists chronological training runs, versions, and evaluation metrics for audit compliance.",
)
async def list_placement_training_runs_endpoint(
    current_user: User = Depends(require_role(*ML_METADATA_ROLES)),
):
    """Returns historical training runs and metric evaluations."""
    return model_registry.get_training_history()


# ==============================================================================
# Phase 6: Model Monitoring, Drift, Retraining & Cohort Intelligence Endpoints
# ==============================================================================

@router.get(
    "/placement/monitoring",
    response_model=ModelMonitoringResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Monitor Placement Model Health, Calibration & Feature Drift",
    description="Analyzes longitudinal prediction logs, calibration deciles, and feature drift metrics.",
)
async def get_placement_monitoring_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ML_INFERENCE_ROLES)),
) -> ModelMonitoringResponseDTO:
    """Returns longitudinal model health, calibration quality, and feature drift status."""
    return await model_monitoring_service.get_monitoring_report(db=db)


@router.post(
    "/placement/retrain",
    response_model=RetrainCandidateResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Retrain Candidate Placement Model & Evaluate Quality Gates",
    description="Trains candidate model without overwriting active model, checking discrimination and calibration gates.",
)
async def retrain_placement_candidate_endpoint(
    req: RetrainCandidateRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ML_METADATA_ROLES)),
) -> RetrainCandidateResponseDTO:
    """Trains candidate placement model and checks promotion criteria."""
    return await model_monitoring_service.retrain_candidate_model(db=db, req=req)


@router.post(
    "/placement/models/{model_id}/activate",
    response_model=ModelActivationResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Promote or Rollback Production Placement Model",
    description="Promotes candidate or archived model version to ACTIVE, recording an auditable promotion event.",
)
async def activate_placement_model_endpoint(
    model_id: str = Path(..., description="Model version identifier"),
    req: ModelActivationRequestDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ML_METADATA_ROLES)),
) -> ModelActivationResponseDTO:
    """Promotes candidate model to active production inference."""
    return await model_monitoring_service.activate_candidate_model(
        db=db,
        model_id=model_id,
        actor_id=current_user.email,
        reason=req.reason,
    )


@router.get(
    "/career-intelligence/cohort",
    response_model=CohortIntelligenceResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Institutional Cohort Intelligence & Skill-Gap Heatmap",
    description="Aggregates population mastery curves, competency gap heatmap, and prioritized institutional interventions.",
)
async def get_cohort_intelligence_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ML_INFERENCE_ROLES)),
) -> CohortIntelligenceResponseDTO:
    """Returns cohort analytics, skill-gap heatmap, and institutional intervention recommendations."""
    return await cohort_intelligence_service.get_cohort_intelligence(db=db)

