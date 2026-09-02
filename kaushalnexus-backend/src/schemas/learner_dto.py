from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ==============================================================================
# Nested Sub-Schemas
# ==============================================================================

class LearnerSkillItemDTO(BaseModel):
    competency_id: uuid.UUID
    code: str
    name: str
    sector: str
    score_percentage: int
    verified_by: Optional[str] = None
    is_verified: bool = True
    assessed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LearnerSkillCreateDTO(BaseModel):
    competency_id: uuid.UUID
    score_percentage: int = Field(..., ge=0, le=100)
    verified_by: Optional[str] = "NCVET Accredited Agency"
    is_verified: bool = True


class DetectedSkillGapDTO(BaseModel):
    name: str
    level: str  # "Critical" | "High" | "Moderate"
    impact: str
    recommendation: Optional[str] = None


class CareerTimelineMilestoneDTO(BaseModel):
    title: str
    date: str
    status: str  # "completed" | "current" | "upcoming"
    note: Optional[str] = None


class TrainingInfoDTO(BaseModel):
    training_center_id: Optional[uuid.UUID] = None
    training_center_name: Optional[str] = None
    training_center_code: Optional[str] = None
    nsqf_level: Optional[str] = None
    overall_progress: int = 0
    modules_completed: int = 0
    training_hours: str = "0 hrs"


# ==============================================================================
# Learner Request & Response DTOs
# ==============================================================================

class LearnerCreateDTO(BaseModel):
    id: str = Field(..., min_length=3, max_length=50, description="Unique identifier e.g. 'KN-2026-00561'")
    full_name: str = Field(..., min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=25)
    education_level: Optional[str] = Field(None, max_length=100)
    district_id: str = Field(..., max_length=50, description="Foreign key to district code e.g. 'UP-VARANASI'")
    training_center_id: Optional[uuid.UUID] = None
    nsqf_level: Optional[str] = Field(None, max_length=30)
    employment_readiness_score: int = Field(0, ge=0, le=100)
    overall_progress: int = Field(0, ge=0, le=100)
    ncvet_credential_id: Optional[str] = Field(None, max_length=80)
    status: str = Field("In Training", max_length=50)
    skills: Optional[List[LearnerSkillCreateDTO]] = None


class LearnerUpdateDTO(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=25)
    education_level: Optional[str] = Field(None, max_length=100)
    district_id: Optional[str] = Field(None, max_length=50)
    training_center_id: Optional[uuid.UUID] = None
    nsqf_level: Optional[str] = Field(None, max_length=30)
    employment_readiness_score: Optional[int] = Field(None, ge=0, le=100)
    overall_progress: Optional[int] = Field(None, ge=0, le=100)
    ncvet_credential_id: Optional[str] = Field(None, max_length=80)
    status: Optional[str] = Field(None, max_length=50)


class LearnerListItemDTO(BaseModel):
    id: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    education_level: Optional[str] = None
    district_id: str
    district_name: Optional[str] = None
    region: Optional[str] = None
    nsqf_level: Optional[str] = None
    employment_readiness_score: int
    overall_progress: int
    status: str
    ncvet_credential_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Learner360ResponseDTO(BaseModel):
    # Basic Profile
    id: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    education_level: Optional[str] = None
    district_id: str
    district_name: Optional[str] = None
    state: Optional[str] = None
    region: Optional[str] = None
    
    # Training & Status
    status: str
    nsqf_level: Optional[str] = None
    employment_readiness_score: int
    overall_progress: int
    ncvet_credential_id: Optional[str] = None
    training_info: TrainingInfoDTO

    # Competencies & Deficits
    skills: List[LearnerSkillItemDTO]
    detected_gaps: List[DetectedSkillGapDTO]
    career_timeline: List[CareerTimelineMilestoneDTO]

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Action DTOs
# ==============================================================================

class CredentialVerificationRequestDTO(BaseModel):
    notes: Optional[str] = "Standard NCVET Verification Request"


class CredentialVerificationResponseDTO(BaseModel):
    success: bool
    learner_id: str
    credential_id: str
    is_authenticated: bool
    verification_agency: str
    verified_at: datetime
    message: str


class BridgeModuleAllocationRequestDTO(BaseModel):
    module_name: str = Field(..., min_length=2, max_length=150)
    duration_hours: int = Field(..., ge=1, le=200)
    target_competency_code: Optional[str] = None
    notes: Optional[str] = None


class BridgeModuleAllocationResponseDTO(BaseModel):
    success: bool
    learner_id: str
    module_name: str
    duration_hours: int
    readiness_increment: int
    new_readiness_score: int
    assigned_at: datetime
    message: str
