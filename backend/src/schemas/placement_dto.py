from datetime import date, datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


# ==============================================================================
# Retention Checkpoint DTOs
# ==============================================================================

class RetentionCheckpointInputDTO(BaseModel):
    checkpoint_type: str = Field(..., description="'3M' | '6M' | '12M'")
    milestone_months: int = Field(..., description="3, 6, or 12")
    checkpoint_date: Optional[date] = None
    is_active_at_checkpoint: bool = True
    current_ctc_lpa: Optional[float] = None
    remarks: Optional[str] = None


class RetentionCheckpointDTO(BaseModel):
    id: uuid.UUID
    placement_id: uuid.UUID
    checkpoint_type: str
    milestone_months: int
    checkpoint_date: date
    is_active_at_checkpoint: bool
    epfo_verified: bool
    current_ctc_lpa: float
    wage_increment_percentage: float
    epfo_contribution_months: Optional[int] = None
    verification_status: str
    remarks: Optional[str] = None
    evaluated_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RetentionCheckpointUpdateDTO(BaseModel):
    is_active_at_checkpoint: Optional[bool] = None
    current_ctc_lpa: Optional[float] = Field(None, gt=0.0, description="Updated annual CTC in LPA")
    epfo_verified: Optional[bool] = None
    verification_status: Optional[str] = None
    remarks: Optional[str] = None


# ==============================================================================
# Placement Request & Response DTOs
# ==============================================================================

class PlacementCreateDTO(BaseModel):
    learner_id: str = Field(..., min_length=3, max_length=50, description="Candidate ID e.g. 'KN-2026-00561'")
    employer_id: uuid.UUID = Field(..., description="Corporate hiring partner UUID")
    hiring_mandate_id: Optional[uuid.UUID] = Field(None, description="Optional linked hiring mandate UUID")
    job_title: str = Field(..., min_length=2, max_length=150, description="Role / designation")
    joined_date: date = Field(..., description="Date of joining organization (YYYY-MM-DD)")
    starting_ctc_lpa: float = Field(..., gt=0.0, description="Starting annual CTC in Lakhs INR (e.g. 4.5)")
    current_ctc_lpa: Optional[float] = Field(None, gt=0.0, description="Optional current CTC; defaults to starting CTC")
    employment_type: Optional[str] = Field("Full-Time", description="'Full-Time' | 'Contractual' | 'Apprenticeship'")
    uan: Optional[str] = Field(None, description="Universal Account Number (EPFO 12-digit ID)")
    auto_verify_epfo: Optional[bool] = Field(True, description="Whether to invoke electronic EPFO verification upon creation")
    checkpoints: Optional[List[RetentionCheckpointInputDTO]] = Field(None, description="Optional initial custom checkpoint data")


class PlacementResponseDTO(BaseModel):
    id: uuid.UUID
    learner_id: str
    learner_name: Optional[str] = None
    employer_id: uuid.UUID
    employer_name: str
    hiring_mandate_id: Optional[uuid.UUID] = None
    job_title: str
    joined_date: date
    starting_ctc_lpa: float
    current_ctc_lpa: float
    employment_type: str
    status: str
    uan: Optional[str] = None
    epfo_verification_status: str
    epfo_last_verified_at: Optional[datetime] = None
    epfo_transaction_ref: Optional[str] = None
    created_at: datetime
    checkpoints: List[RetentionCheckpointDTO] = []

    model_config = ConfigDict(from_attributes=True)


class PlacementDetailDTO(BaseModel):
    id: uuid.UUID
    learner_id: str
    employer_id: uuid.UUID
    employer_name: str
    job_title: str
    joined_date: date
    starting_ctc_lpa: float
    current_ctc_lpa: float
    employment_type: str
    status: str
    uan: Optional[str] = None
    epfo_verification_status: str
    epfo_last_verified_at: Optional[datetime] = None
    checkpoints_count: int
    retention_milestones_achieved: List[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlacementRetentionResponseDTO(BaseModel):
    placement_id: uuid.UUID
    learner_id: str
    learner_name: str
    employer_id: uuid.UUID
    employer_name: str
    job_title: str
    joined_date: date
    starting_ctc_lpa: float
    current_ctc_lpa: float
    total_wage_increment_percentage: float
    retention_status: str
    retention_milestone_achieved: str  # "12M Retained" | "6M Retained" | "3M Retained" | "Active (In Progress)" | "Separated"
    epfo_verification_status: str
    epfo_last_verified_at: Optional[datetime] = None
    checkpoints: List[RetentionCheckpointDTO]

    model_config = ConfigDict(from_attributes=True)
