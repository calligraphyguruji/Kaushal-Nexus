from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ModelMetadataDTO(BaseModel):
    model_name: str
    version: str
    algorithm: str
    disclaimer: str
    is_production_ready: bool = False
    details: Dict[str, Any] = {}


class MLModelsRegistryResponseDTO(BaseModel):
    models: List[ModelMetadataDTO]
    timestamp: str


class SkillSimilarityRequestDTO(BaseModel):
    candidate_skills: List[str] = Field(..., min_length=1, description="List of candidate acquired/verified skills")
    required_skills: List[str] = Field(..., min_length=1, description="List of target mandate required skills")
    threshold: Optional[float] = Field(0.35, ge=0.0, le=1.0, description="Similarity threshold for skill matching")


class SkillSimilarityResponseDTO(BaseModel):
    overall_similarity_score: float  # 0.0 to 1.0
    matched_skills: List[str]
    missing_skills: List[str]
    similarity_per_skill: Dict[str, float]
    model_version: str
    disclaimer: str


class WagePredictionRequestDTO(BaseModel):
    employment_readiness_score: int = Field(75, ge=0, le=100)
    nsqf_level: str = Field("NSQF Level 5", description="NSQF tier e.g. 'NSQF Level 4', 'NSQF Level 5'")
    training_hours: int = Field(240, ge=40, le=1200)
    skill_alignment: Optional[float] = Field(85.0, ge=0.0, le=100.0, description="Skill alignment percentage (0-100)")
    district_tier: Optional[str] = Field("Tier 1", description="'Tier 1' | 'Tier 2' | 'Tier 3'")
    sector: Optional[str] = Field("IT-ITeS", description="Target industry sector")


class WagePredictionResponseDTO(BaseModel):
    predicted_ctc_lpa: float
    min_expected_ctc_lpa: float
    max_expected_ctc_lpa: float
    confidence_score: float
    feature_contributions: Dict[str, float]
    model_version: str
    disclaimer: str
