from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ==============================================================================
# 1. Next-Best-Action & Readiness DTOs
# ==============================================================================

class ActionType(str, Enum):
    PRACTICE_DRILL = "PRACTICE_DRILL"
    LEARN_SKILL = "LEARN_SKILL"
    REASSESS = "REASSESS"
    COMPLETE_PROJECT = "COMPLETE_PROJECT"
    IMPROVE_PROJECT = "IMPROVE_PROJECT"
    UPDATE_RESUME = "UPDATE_RESUME"
    IMPROVE_ROLE_ALIGNMENT = "IMPROVE_ROLE_ALIGNMENT"
    APPLY_TO_ROLE = "APPLY_TO_ROLE"
    PREPARE_INTERVIEW = "PREPARE_INTERVIEW"
    CONTINUE_APPLICATIONS = "CONTINUE_APPLICATIONS"


class NextBestActionDTO(BaseModel):
    action_type: ActionType
    priority: float = Field(..., ge=0.0, le=1.0, description="Priority weight [0.0, 1.0]")
    title: str
    reason: str
    related_skill: Optional[str] = None
    related_role: Optional[str] = None
    estimated_effort_hours: float
    evidence: Dict[str, Any] = Field(default_factory=dict)


class ReadinessComponentDTO(BaseModel):
    component: str
    score: float
    weight: float
    weighted_score: float
    description: str


class ReadinessEvaluationDTO(BaseModel):
    overall_readiness: float
    readiness_tier: str  # "NOT_READY", "DEVELOPING", "CAREER_READY", "STRONG_READINESS"
    components: List[ReadinessComponentDTO]
    formula: str


class StrengthItemDTO(BaseModel):
    title: str
    description: str
    evidence: Dict[str, Any] = Field(default_factory=dict)


class RiskItemDTO(BaseModel):
    title: str
    description: str
    severity: str  # "CRITICAL", "MODERATE", "LOW"
    evidence: Dict[str, Any] = Field(default_factory=dict)


class CareerRecommendationDTO(BaseModel):
    recommendation_type: str
    title: str
    reason: str
    priority: float
    target_role: Optional[str] = None
    alternative_role: Optional[str] = None
    evidence: Dict[str, Any] = Field(default_factory=dict)


class CareerIntelligenceResponseDTO(BaseModel):
    learner_id: str
    overall_readiness: float
    readiness_tier: str
    readiness_breakdown: ReadinessEvaluationDTO
    placement_probability: float
    placement_readiness_tier: str
    priority_areas: List[str]
    strengths: List[StrengthItemDTO]
    risks: List[RiskItemDTO]
    next_best_actions: List[NextBestActionDTO]
    career_recommendations: List[CareerRecommendationDTO]
    learning_recommendations: List[NextBestActionDTO]
    application_recommendations: List[NextBestActionDTO]
    model_version: str
    feature_version: str
    generated_at: str
    disclaimer: str


# ==============================================================================
# 2. Model Monitoring, Drift, and Retraining DTOs
# ==============================================================================

class DriftMetricDTO(BaseModel):
    feature_name: str
    baseline_mean: float
    current_mean: float
    mean_shift: float
    baseline_std: float
    current_std: float
    psi_estimate: float
    status: str  # "NORMAL", "WARNING", "CRITICAL"


class ModelMonitoringResponseDTO(BaseModel):
    active_model: str
    prediction_count: int
    mean_probability: float
    median_probability: float
    positive_prediction_rate: float
    monitoring_status: str  # "HEALTHY", "LIMITED_DATA", "DEGRADED"
    drift_status: str  # "NORMAL", "WARNING", "CRITICAL"
    calibration_status: str  # "MONITORING", "ALIGNED", "DECALIBRATED"
    performance_metrics: Optional[Dict[str, Any]] = None
    calibration_buckets: List[Dict[str, Any]]
    drift_metrics: List[DriftMetricDTO]
    warnings: List[str]
    last_evaluated_at: str


class RetrainCandidateRequestDTO(BaseModel):
    horizon_days: int = Field(90, ge=1, le=365)
    tune_hyperparameters: bool = True
    min_records: int = Field(300, ge=50, le=10000)


class RetrainCandidateResponseDTO(BaseModel):
    candidate_model_id: str
    active_model_id: str
    candidate_metrics: Dict[str, Any]
    active_metrics: Dict[str, Any]
    quality_gates: Dict[str, bool]
    recommendation: str
    status: str
    evaluated_at: str


class ModelActivationRequestDTO(BaseModel):
    reason: str = Field(..., min_length=5, description="Auditable justification for model promotion or rollback")


class ModelActivationResponseDTO(BaseModel):
    model_id: str
    previous_model_id: Optional[str] = None
    status: str
    activated_at: str
    message: str


# ==============================================================================
# 3. Cohort Intelligence & Skill-Gap Heatmap DTOs
# ==============================================================================

class SkillGapHeatmapItemDTO(BaseModel):
    skill_name: str
    average_gap: float
    learners_affected_count: int
    learners_affected_pct: float
    severity: str  # "CRITICAL", "MODERATE", "LOW"


class CohortInterventionDTO(BaseModel):
    priority: str  # "HIGH", "MEDIUM", "LOW"
    intervention_title: str
    recommended_action: str
    affected_learner_count: int
    target_skill: Optional[str] = None


class CohortIntelligenceResponseDTO(BaseModel):
    total_learners: int
    active_learners: int
    average_mastery: float
    average_role_alignment: float
    average_learning_completion: float
    average_placement_probability: float
    verified_placement_rate: float
    skill_gap_heatmap: List[SkillGapHeatmapItemDTO]
    prioritized_interventions: List[CohortInterventionDTO]
    generated_at: str
