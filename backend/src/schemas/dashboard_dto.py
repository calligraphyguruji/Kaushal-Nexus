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
