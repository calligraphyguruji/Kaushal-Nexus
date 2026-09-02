from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CoordinatesDTO(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DistrictIntelligenceItemDTO(BaseModel):
    district_id: str
    name: str
    state: str
    region: str
    tier: str
    coordinates: CoordinatesDTO
    
    # Skilling & Employment Performance Metrics
    total_enrolled: int
    total_trained: int
    total_certified: int
    total_placed: int
    training_completion_rate: float
    placement_rate: float
    retention_rate: float
    
    # Regional Demand-Supply Divergence
    employer_demand_index: float
    workforce_supply_index: float
    divergence_score: float  # demand - supply
    dominant_skill_gaps: List[str]
    
    # Infrastructure & Risk Indicators
    active_training_centers_count: int
    vulnerability_index: float  # 0-100 composite risk index
    priority_level: str         # "Critical", "Elevated", "Stable"

    model_config = ConfigDict(from_attributes=True)


class StateAggregateDTO(BaseModel):
    state: str
    districts_count: int
    total_enrolled: int
    avg_placement_rate: float
    avg_retention_rate: float
    avg_divergence_score: float
    critical_districts_count: int


class RegionalClusterItemDTO(BaseModel):
    region: str
    state: str
    districts_count: int
    total_enrolled: int
    divergence_score: float
    risk_level: str  # "High Risk", "Moderate Risk", "Balanced"
    primary_deficit_sectors: List[str]
    recommended_policy_action: str


class RegionalDivergenceResponseDTO(BaseModel):
    summary: Dict[str, Any]
    high_divergence_districts: List[DistrictIntelligenceItemDTO]
    aligned_districts: List[DistrictIntelligenceItemDTO]
    state_aggregates: List[StateAggregateDTO]
    regional_clusters: List[RegionalClusterItemDTO]

    model_config = ConfigDict(from_attributes=True)


class PriorityClusterItemDTO(BaseModel):
    rank: int
    district_id: str
    district_name: str
    state: str
    region: str
    tier: str
    composite_priority_score: float  # 0-100
    divergence_score: float
    learners_at_risk: int
    key_bottlenecks: List[str]
    recommended_interventions: List[str]

    model_config = ConfigDict(from_attributes=True)
