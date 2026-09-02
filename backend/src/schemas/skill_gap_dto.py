from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class SeverityEnum(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MODERATE = "Moderate"
    ALIGNED = "Aligned"


class InterventionTypeEnum(str, Enum):
    BRIDGE_COURSE = "BRIDGE_COURSE"
    TRAINER_DEPLOYMENT = "TRAINER_DEPLOYMENT"
    LAB_EQUIPMENT_UPGRADE = "LAB_EQUIPMENT_UPGRADE"
    CURRICULUM_UPDATE = "CURRICULUM_UPDATE"


# ==============================================================================
# Skill Gap Priority & Breakdown DTOs
# ==============================================================================

class SkillGapPriorityItemDTO(BaseModel):
    id: Optional[uuid.UUID] = None
    competency_id: uuid.UUID
    competency_code: str
    competency_name: str
    sector: str
    district_id: str
    district_name: str
    state: str
    region: str
    employer_demand_pct: float
    workforce_supply_pct: float
    deficit_pct: float
    severity: str
    learners_affected: int
    priority_rank: int
    suggested_action: Optional[str] = None
    projected_timeline: Optional[str] = "30 Days"

    model_config = ConfigDict(from_attributes=True)


class SectorGapDistributionItemDTO(BaseModel):
    sector: str
    avg_deficit: float
    critical_gaps_count: int
    total_affected: int


class DistrictGapRankingItemDTO(BaseModel):
    district_id: str
    district_name: str
    max_deficit: float
    critical_count: int


class SkillGapDistributionDTO(BaseModel):
    severity_counts: Dict[str, int]
    avg_deficit_pct: float
    total_learners_affected: int
    sector_distribution: List[SectorGapDistributionItemDTO]
    district_rankings: List[DistrictGapRankingItemDTO]

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Intervention Request & Response DTOs
# ==============================================================================

class DeployInterventionRequestDTO(BaseModel):
    district_id: str = Field(..., description="District code e.g. 'UP-VARANASI'")
    competency_id: uuid.UUID = Field(..., description="Competency ID to target")
    intervention_type: InterventionTypeEnum = InterventionTypeEnum.BRIDGE_COURSE
    target_capacity: int = Field(..., ge=1, le=5000, description="Targeted candidate seats")
    budget_allocated_inr: float = Field(0.0, ge=0.0, description="Budget in INR")
    target_completion_weeks: int = Field(4, ge=1, le=52, description="Target timeline in weeks")
    notes: Optional[str] = None


class DeployInterventionResponseDTO(BaseModel):
    intervention_id: uuid.UUID
    district_id: str
    district_name: str
    competency_id: uuid.UUID
    competency_code: str
    competency_name: str
    intervention_type: str
    target_capacity: int
    budget_allocated_inr: float
    status: str
    projected_deficit_reduction_pct: float
    deployed_at: datetime
    message: str

    model_config = ConfigDict(from_attributes=True)
