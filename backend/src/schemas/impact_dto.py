from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field


class LearnerImpactDTO(BaseModel):
    """Point-in-time baseline vs follow-up impact metrics for an individual learner."""
    learner_id: str
    initial_mastery: float = Field(..., ge=0.0, le=1.0)
    current_mastery: float = Field(..., ge=0.0, le=1.0)
    mastery_delta: float = Field(..., description="Observed mastery change: current - initial")
    initial_gap: float = Field(..., ge=0.0, le=1.0)
    current_gap: float = Field(..., ge=0.0, le=1.0)
    gap_reduction: float = Field(..., description="Observed gap reduction: initial - current")
    learning_hours: float = Field(..., ge=0.0)
    modules_completed: int = Field(..., ge=0)
    projects_completed: int = Field(..., ge=0)
    applications_submitted: int = Field(..., ge=0)
    interviews_scheduled: int = Field(..., ge=0)
    offers_received: int = Field(..., ge=0)
    placement_status: str = Field(..., description="'PLACED' | 'IN_PROCESS' | 'SEEKING'")
    observation_days: int = Field(..., ge=0)
    timeline_events: List[Dict[str, Any]] = Field(default_factory=list)
    disclaimer: str = (
        "Metrics reflect observed individual learner progress. Observed changes describe platform "
        "engagement and assessment progression rather than a guaranteed or causal employment outcome."
    )


class ConfidenceIntervalDTO(BaseModel):
    """Statistical uncertainty interval for aggregate proportion metrics."""
    lower: float = Field(..., ge=0.0, le=1.0)
    upper: float = Field(..., ge=0.0, le=1.0)
    confidence_level: float = 0.95
    sample_size: int


class CohortImpactDTO(BaseModel):
    """Aggregated cohort progression and employment conversion metrics."""
    cohort_name: str
    dimension_type: str = Field(..., description="'INSTITUTION' | 'STATE' | 'ROLE' | 'PROGRAM'")
    learner_count: int
    baseline_mastery: float
    current_mastery: float
    average_mastery_gain: float
    average_gap_reduction: float
    completion_rate: float
    reassessment_improvement_rate: float
    application_rate: float
    interview_rate: float
    offer_rate: float
    verified_placement_rate: float
    placement_rate_ci_95: Optional[ConfidenceIntervalDTO] = None
    is_suppressed: bool = False
    suppression_reason: Optional[str] = None


class ProgramScorecardDTO(BaseModel):
    """Concise executive scorecard of institutional skilling outcomes."""
    learners_served: int
    assessment_completion_pct: float
    learning_completion_pct: float
    average_mastery_gain: float
    critical_gap_reduction_pct: float
    project_completion_pct: float
    application_rate_pct: float
    interview_conversion_pct: float
    verified_placement_pct: float
    verified_placement_ci_95: Optional[ConfidenceIntervalDTO] = None
    observation_period: Dict[str, str]
    data_quality_score: float
    causal_disclaimer: str = (
        "Metrics describe observed platform activity and outcomes. Observational associations "
        "should not be interpreted as causal effects unless supported by an appropriate experimental "
        "or causal inference design. Verified placement rates depend on outcome reporting and verification coverage."
    )


class LearningInterventionDTO(BaseModel):
    """Individual intervention traceability and lifecycle record."""
    id: uuid.UUID
    learner_id: str
    competency_id: Optional[uuid.UUID] = None
    competency_name: Optional[str] = None
    role_id: Optional[uuid.UUID] = None
    role_title: Optional[str] = None
    intervention_type: str
    source: str
    title: str
    description: Optional[str] = None
    recommended_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str
    estimated_hours: float
    actual_hours: float
    baseline_mastery: Optional[float] = None
    final_mastery: Optional[float] = None
    mastery_delta: Optional[float] = None
    baseline_gap: Optional[float] = None
    final_gap: Optional[float] = None
    gap_delta: Optional[float] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)


class InterventionEffectivenessItemDTO(BaseModel):
    """Aggregate observed effectiveness by intervention type."""
    intervention_type: str
    learners_count: int
    started_count: int
    completed_count: int
    completion_rate: float
    avg_mastery_delta: Optional[float] = None
    avg_gap_reduction: Optional[float] = None
    reassessment_success_rate: Optional[float] = None
    status: str = Field(..., description="'ROBUST' | 'PRELIMINARY' | 'INSUFFICIENT_DATA'")


class InterventionEffectivenessReportDTO(BaseModel):
    """Comprehensive intervention effectiveness breakdown."""
    interventions: List[InterventionEffectivenessItemDTO]
    total_interventions: int
    overall_completion_rate: float
    disclaimer: str = (
        "Reported metrics represent observed associations among participating learners. "
        "Interventions with sample size < 5 are marked as INSUFFICIENT_DATA. No causal effect is claimed."
    )


class SkillBottleneckDTO(BaseModel):
    """Persistent competency bottleneck diagnosis."""
    rank: int
    competency_id: uuid.UUID
    competency_name: str
    category: str
    affected_learner_count: int
    affected_learner_pct: float
    average_mastery: float
    average_gap: float
    role_importance_score: float
    reassessment_failure_rate: float
    placement_association: Optional[float] = None
    severity: str = Field(..., description="'CRITICAL' | 'HIGH' | 'MODERATE'")
    recommended_curriculum_action: str


class CurriculumOptimizationItemDTO(BaseModel):
    """Evidence-backed curriculum action recommendation."""
    competency_name: str
    issue: str
    affected_learners: int
    recommended_action: str
    priority: str = Field(..., description="'CRITICAL' | 'HIGH' | 'MEDIUM'")
    evidence: Dict[str, Any] = Field(default_factory=dict)


class ResourceEffectivenessItemDTO(BaseModel):
    """Empirical analysis of learning resources."""
    resource_id: uuid.UUID
    resource_title: str
    provider: str
    difficulty: str
    starts: int
    completions: int
    completion_rate: float
    avg_time_spent_mins: float
    associated_mastery_change: Optional[float] = None
    reassessment_success_rate: Optional[float] = None
    abandonment_rate: float


class CareerOutcomeFunnelStageDTO(BaseModel):
    """Single milestone stage in the longitudinal career conversion funnel."""
    stage: str
    stage_name: str
    count: int
    stage_conversion_rate: float = Field(..., description="% of previous stage converted")
    overall_conversion_rate: float = Field(..., description="% of initial cohort converted")
    is_major_dropoff: bool = False


class CareerOutcomeFunnelDTO(BaseModel):
    """Longitudinal conversion funnel from registration to verified placement."""
    stages: List[CareerOutcomeFunnelStageDTO]
    total_cohort_size: int
    largest_dropoff_stage: str
    largest_dropoff_pct: float
    observation_period: Dict[str, str]
    disclaimer: str = (
        "Funnel metrics reflect observed longitudinal stage conversion within the platform. "
        "Drop-off percentages identify pipeline bottlenecks for institutional intervention."
    )


class LearnerRiskItemDTO(BaseModel):
    """Early warning risk signal based purely on observable platform behavior."""
    risk_type: str = Field(
        ...,
        description=(
            "'LEARNING_STAGNATION' | 'ENGAGEMENT_DECLINE' | "
            "'PERSISTENT_SKILL_GAP' | 'CAREER_INACTIVITY' | 'REPEATED_ASSESSMENT_FAILURE'"
        ),
    )
    severity: str = Field(..., description="'CRITICAL' | 'WARNING' | 'ADVISORY'")
    detected_at: datetime
    evidence: str
    recommended_intervention: str
    action_type: str


class LearnerRiskReportDTO(BaseModel):
    """Early warning diagnostic summary for an individual learner."""
    learner_id: str
    risks: List[LearnerRiskItemDTO]
    risk_level: str = Field(..., description="'HEALTHY' | 'NEEDS_SUPPORT' | 'AT_RISK'")
    recommended_next_actions: List[str]
    disclaimer: str = (
        "Early warning indicators are non-punitive, evidence-based alerts designed to trigger proactive "
        "academic and mentoring support. They do not evaluate psychological or personal attributes."
    )


class ImpactDataQualityDTO(BaseModel):
    """Data quality and integrity scorecard for institutional impact reporting."""
    overall_quality_score: float = Field(..., ge=0.0, le=100.0)
    profile_completeness_pct: float = Field(..., ge=0.0, le=100.0)
    outcome_verification_coverage_pct: float = Field(..., ge=0.0, le=100.0)
    temporal_completeness_pct: float = Field(..., ge=0.0, le=100.0)
    duplicate_record_rate_pct: float = Field(..., ge=0.0, le=100.0)
    stale_records_pct: float = Field(..., ge=0.0, le=100.0)
    cohort_size: int
    quality_grade: str = Field(..., description="'EXCELLENT' | 'GOOD' | 'MODERATE' | 'NEEDS_IMPROVEMENT'")
    calculation_version: str = "impact_v1"
    evaluated_at: datetime


class UpdateInterventionStatusRequestDTO(BaseModel):
    """Request payload to update intervention status."""
    status: str = Field(..., description="'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'SKIPPED'")
    actual_hours: Optional[float] = None
    notes: Optional[str] = None
