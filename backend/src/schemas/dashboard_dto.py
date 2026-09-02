from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class StatDeltaDTO(BaseModel):
    value: str
    is_positive: bool = True
    context: str = "vs previous month"


class DashboardSummaryDTO(BaseModel):
    total_enrolled: int
    total_trained: int
    total_certified: int
    total_placed: int
    placement_percentage: float
    retention_percentage: float
    active_hiring_mandates: int
    avg_readiness_score: float
    retention_verified_count: int
    deltas: Optional[Dict[str, StatDeltaDTO]] = None

    model_config = ConfigDict(from_attributes=True)


class EmploymentTrendPointDTO(BaseModel):
    month: str           # e.g. "Jan", "Feb", "Mar 2026"
    enrolled: int
    trained: int
    certified: int
    placed: int
    retained: int

    model_config = ConfigDict(from_attributes=True)


class FunnelStageDTO(BaseModel):
    stage: str           # "Enrollment", "Training", "Certified", "Placed", "Retained"
    count: int
    percentage: float    # percentage relative to enrollment
    drop_off_rate: float # drop-off percentage from previous stage
    fill: Optional[str] = None  # Hex color for Recharts

    model_config = ConfigDict(from_attributes=True)


class SectorMatrixItemDTO(BaseModel):
    sector: str          # e.g. "IT-ITeS", "Smart Manufacturing", "Green Energy"
    enrolled: int
    certified: int
    placed: int
    placement_rate: float
    avg_readiness_score: float
    demand_gap_score: int

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Longitudinal Outcome & Impact Analytics DTOs
# ==============================================================================

class OutcomeDistributionDTO(BaseModel):
    total_candidates: int
    employed_count: int
    employed_rate: float
    self_employed_count: int
    self_employed_rate: float
    apprenticeship_count: int
    apprenticeship_rate: float
    unemployed_count: int
    unemployed_rate: float
    further_education_count: int
    further_education_rate: float
    other_count: int
    other_rate: float

    model_config = ConfigDict(from_attributes=True)


class FollowUpMetricsDTO(BaseModel):
    total_scheduled: int
    completed_count: int
    completion_rate: float
    pending_count: int
    overdue_count: int
    response_rate: float
    channel_breakdown: Dict[str, int]

    model_config = ConfigDict(from_attributes=True)


class ReasonBreakdownItemDTO(BaseModel):
    reason: str
    count: int
    percentage: float


class NonPlacementAnalyticsDTO(BaseModel):
    total_unplaced: int
    skill_gap_related_count: int
    skill_gap_percentage: float
    top_reasons: List[ReasonBreakdownItemDTO]
    district_breakdown: List[Dict[str, Any]]

    model_config = ConfigDict(from_attributes=True)


class AttritionAnalyticsDTO(BaseModel):
    total_separated: int
    attrition_rate: float
    three_month_retention_rate: float
    six_month_retention_rate: float
    twelve_month_retention_rate: float
    top_reasons: List[ReasonBreakdownItemDTO]
    checkpoint_breakdown: Dict[str, int]
    sector_breakdown: List[Dict[str, Any]]

    model_config = ConfigDict(from_attributes=True)


class SelfEmploymentAnalyticsDTO(BaseModel):
    total_self_employed: int
    self_employment_rate: float
    verified_count: int
    verification_rate: float
    sector_breakdown: List[Dict[str, Any]]
    district_breakdown: List[Dict[str, Any]]

    model_config = ConfigDict(from_attributes=True)


class WageProgressionMetricsDTO(BaseModel):
    avg_starting_ctc_lpa: float
    avg_current_ctc_lpa: float
    avg_wage_growth_pct: float
    median_wage_growth_pct: float
    placements_tracked: int

    model_config = ConfigDict(from_attributes=True)
