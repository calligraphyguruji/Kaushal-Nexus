from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class LearnerSkillMasteryItemDTO(BaseModel):
    """BKT estimated mastery state for a single skill/competency."""
    skill_id: uuid.UUID = Field(..., description="Competency UUID")
    skill: str = Field(..., description="Competency name e.g. 'Python OOP'")
    sector: Optional[str] = Field(None, description="Industry sector")
    mastery_probability: float = Field(..., ge=0.0, le=1.0, description="BKT latent mastery probability [0.0, 1.0]")
    status: str = Field(..., description="'weak' | 'developing' | 'proficient' | 'mastered'")
    questions_attempted: int = Field(0, ge=0, description="Number of assessment items answered")
    correct_answers: int = Field(0, ge=0, description="Total correct answers")
    incorrect_answers: int = Field(0, ge=0, description="Total incorrect answers")
    last_assessed_at: Optional[datetime] = Field(None, description="Last assessment timestamp")

    model_config = ConfigDict(from_attributes=True)


class LearnerSkillsResponseDTO(BaseModel):
    """Collection of learner skill masteries."""
    learner_id: str = Field(..., description="Beneficiary candidate identifier")
    user_id: Optional[str] = Field(None, description="Alias for learner_id for API compatibility")
    skills: List[LearnerSkillMasteryItemDTO] = Field(default_factory=list)


class SkillGapItemDTO(BaseModel):
    """Calculated competency gap against benchmark requirement."""
    skill: str = Field(..., description="Competency name e.g. 'REST API'")
    current_mastery: float = Field(..., ge=0.0, le=1.0, description="Learner current BKT mastery")
    required_mastery: float = Field(..., ge=0.0, le=1.0, description="Target occupation required mastery")
    gap: float = Field(..., ge=0.0, le=1.0, description="required_mastery - current_mastery")
    priority: str = Field(..., description="'high' | 'medium' | 'low'")


class LearnerSkillGapsResponseDTO(BaseModel):
    """Overall skill gap breakdown against a target job role."""
    learner_id: str
    role: str = Field(..., description="Target role name e.g. 'Python Developer Intern'")
    overall_alignment: float = Field(..., ge=0.0, le=1.0, description="Ratio of required competency achieved")
    skill_gaps: List[SkillGapItemDTO] = Field(default_factory=list, description="Positive gaps sorted descending")


class BKTFeatureVectorResponseDTO(BaseModel):
    """Feature vector ready for downstream XGBoost / ML tabular models."""
    learner_id: str
    features: Dict[str, float] = Field(..., description="Normalized feature map e.g. {'python_mastery': 0.82}")
    total_skills_assessed: int = Field(..., ge=0)
    generated_at: str
