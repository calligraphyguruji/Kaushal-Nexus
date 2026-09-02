from datetime import date, datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from src.models.outcomes import (
    AttritionReasonType,
    NonPlacementReasonType,
    OutcomeSource,
)


class NonPlacementReasonCreateDTO(BaseModel):
    reason: NonPlacementReasonType = Field(
        ...,
        description="Bottleneck reason: SKILL_GAP | NO_SUITABLE_VACANCY | INTERVIEW_FAILURE | LOCATION_CONSTRAINT | SALARY_EXPECTATION | DOCUMENTATION_ISSUE | CANDIDATE_WITHDREW | COMMUNICATION_ISSUE | PERSONAL_REASON | OTHER",
    )
    source: OutcomeSource = Field(
        OutcomeSource.TRAINING_PROVIDER,
        description="Source of bottleneck observation: LEARNER | TRAINING_PROVIDER | EMPLOYER | ADMIN | SYSTEM",
    )
    notes: Optional[str] = Field(None, max_length=500, description="Context notes / feedback")
    associated_skill_code: Optional[str] = Field(None, max_length=50, description="Competency deficit code e.g. 'COMP-GENAI-01'")


class NonPlacementReasonResponseDTO(BaseModel):
    id: uuid.UUID
    learner_id: str
    reason: NonPlacementReasonType
    source: OutcomeSource
    recorded_at: datetime
    recorded_by: Optional[str] = None
    notes: Optional[str] = None
    associated_skill_code: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlacementSeparationCreateDTO(BaseModel):
    checkpoint_id: Optional[uuid.UUID] = Field(None, description="Optional associated retention milestone UUID (3M/6M/12M)")
    reason: AttritionReasonType = Field(
        ...,
        description="Driver for job departure: BETTER_OPPORTUNITY | LOW_SALARY | RELOCATION | WORK_ENVIRONMENT | SKILL_MISMATCH | EMPLOYER_TERMINATION | CONTRACT_ENDED | HEALTH_OR_FAMILY_REASON | FURTHER_EDUCATION | OTHER",
    )
    separation_date: date = Field(..., description="Effective date employment ceased (YYYY-MM-DD)")
    source: OutcomeSource = Field(OutcomeSource.EMPLOYER, description="Reporting party: LEARNER | EMPLOYER | TRAINING_PROVIDER | ADMIN")
    notes: Optional[str] = Field(None, max_length=500, description="Exit interview or employer documentation")
    associated_skill_gap: Optional[str] = Field(None, max_length=100, description="Skill deficit driving departure if reason is SKILL_MISMATCH")


class PlacementSeparationResponseDTO(BaseModel):
    id: uuid.UUID
    placement_id: uuid.UUID
    checkpoint_id: Optional[uuid.UUID] = None
    reason: AttritionReasonType
    separation_date: date
    source: OutcomeSource
    recorded_by: Optional[str] = None
    notes: Optional[str] = None
    associated_skill_gap: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
