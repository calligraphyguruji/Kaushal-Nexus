from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ==============================================================================
# 1. Data Quality Analysis DTOs
# ==============================================================================

class FeatureQualityStatsDTO(BaseModel):
    name: str
    count: int
    missing_count: int
    missing_pct: float
    mean: float
    std: float
    min: float
    p25: float
    p50: float
    p75: float
    max: float
    outlier_count_iqr: int
    is_zero_variance: bool
    correlation_with_target: float


class DataQualityReportDTO(BaseModel):
    total_records: int
    total_features: int
    positive_records: int
    negative_records: int
    positive_rate: float
    imbalance_ratio: float  # negative / positive
    earliest_cutoff: Optional[str] = None
    latest_cutoff: Optional[str] = None
    features_quality: List[FeatureQualityStatsDTO]
    outlier_summary: Dict[str, int]
    low_variance_features: List[str]
    temporal_distribution: Dict[str, int]
    health_status: str  # "EXCELLENT", "HEALTHY", "NEEDS_ATTENTION"
    generated_at: str


# ==============================================================================
# 2. Model Metrics & Evaluation Comparison DTOs
# ==============================================================================

class ModelMetricsDTO(BaseModel):
    roc_auc: float
    pr_auc: float
    brier_score: float
    log_loss: float
    ece: float  # Expected Calibration Error
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    best_threshold: float = 0.5
    confusion_matrix: Dict[str, int] = Field(
        default_factory=lambda: {"tp": 0, "fp": 0, "tn": 0, "fn": 0}
    )


class ModelComparisonRowDTO(BaseModel):
    model_name: str
    model_type: str
    description: str
    metrics: ModelMetricsDTO
    is_active_candidate: bool = False


class CalibrationCurveBinDTO(BaseModel):
    bin_index: int
    mean_predicted_prob: float
    fraction_of_positives: float
    sample_count: int


class CalibrationCurveDTO(BaseModel):
    pre_calibration_brier: float
    post_calibration_brier: float
    pre_calibration_ece: float
    post_calibration_ece: float
    calibration_method: str
    bins: List[CalibrationCurveBinDTO]


class FeatureImportanceItemDTO(BaseModel):
    feature_name: str
    importance_score: float
    importance_type: str  # "gain", "weight", "permutation"
    rank: int


# ==============================================================================
# 3. Model Training & Registry DTOs
# ==============================================================================

class TrainMLRequestDTO(BaseModel):
    feature_version: str = "v1"
    label_type: str = "INTERNSHIP_ACCEPTED"
    horizon_days: int = Field(90, ge=1, le=365)
    tune_hyperparameters: bool = True
    calibration_method: str = Field("isotonic", description="'isotonic' or 'sigmoid'")
    sample_size: Optional[int] = Field(None, ge=100, le=10000)
    use_synthetic_cohort: bool = Field(
        True,
        description="Include realistic historical cohort to establish statistically significant benchmark",
    )


class TrainMLResponseDTO(BaseModel):
    model_version: str
    training_timestamp: str
    dataset_size: int
    temporal_splits: Dict[str, Any]
    models_comparison: List[ModelComparisonRowDTO]
    selected_model: str
    tuned_hyperparameters: Dict[str, Any]
    calibration_curve: CalibrationCurveDTO
    top_feature_importances: List[FeatureImportanceItemDTO]
    status: str = "SUCCESS"


class ActiveModelMetadataDTO(BaseModel):
    model_version: str
    algorithm: str
    trained_at: str
    dataset_records: int
    temporal_splits: Dict[str, Any]
    metrics: ModelMetricsDTO
    hyperparameters: Dict[str, Any]
    calibration: CalibrationCurveDTO
    feature_importances: List[FeatureImportanceItemDTO]
    is_active: bool = True


# ==============================================================================
# 4. Local Explainability & Learner Prediction DTOs
# ==============================================================================

class LocalDriverDTO(BaseModel):
    feature_name: str
    feature_value: float
    contribution_delta: float
    contribution_pct: float
    description: str
    is_positive: bool


class ActionableRecommendationDTO(BaseModel):
    category: str
    title: str
    description: str
    potential_probability_boost: float
    priority: str  # "HIGH", "MEDIUM", "LOW"


class LearnerPlacementPredictionDTO(BaseModel):
    learner_id: str
    placement_probability: float  # 0.0 to 1.0
    placement_probability_pct: float  # 0.0 to 100.0%
    readiness_tier: str  # "HIGH_READINESS", "MODERATE_READINESS", "DEVELOPING"
    confidence_score: float
    percentile_rank: float
    model_version: str
    prediction_date: str
    horizon_days: int
    top_positive_drivers: List[LocalDriverDTO]
    top_risk_factors: List[LocalDriverDTO]
    actionable_recommendations: List[ActionableRecommendationDTO]
    feature_snapshot: Dict[str, float]
    disclaimer: str
