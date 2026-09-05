from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from src.models.career_event import (
    ApplicationStatus,
    CareerEventType,
    CareerSource,
    OutcomeStatus,
    ProjectVerificationStatus,
    SOURCE_CONFIDENCE_MAP,
)


class CareerEventCreateDTO(BaseModel):
    event_type: str = Field(
        ...,
        description="Controlled event taxonomy e.g. APPLICATION_SUBMITTED, INTERVIEW_ATTENDED, INTERNSHIP_ACCEPTED",
    )
    role_id: Optional[uuid.UUID] = None
    organization_name: Optional[str] = Field(None, max_length=150)
    event_date: Optional[datetime] = Field(
        None,
        description="Historical event occurrence date. Defaults to current timestamp if omitted.",
    )
    source: str = Field(CareerSource.SELF_REPORTED.value, max_length=50)
    notes: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None


class CareerEventResponseDTO(BaseModel):
    id: uuid.UUID
    learner_id: str
    event_type: str
    role_id: Optional[uuid.UUID] = None
    role_title: Optional[str] = None
    organization_name: Optional[str] = None
    event_date: datetime
    source: str
    notes: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CareerApplicationCreateDTO(BaseModel):
    role_id: Optional[uuid.UUID] = None
    organization_name: str = Field(..., min_length=1, max_length=150)
    job_title: Optional[str] = Field(None, max_length=150)
    status: str = Field(ApplicationStatus.SUBMITTED.value, max_length=50)
    source: str = Field(CareerSource.SELF_REPORTED.value, max_length=50)
    applied_at: Optional[datetime] = None
    salary_offered: Optional[float] = None
    notes: Optional[str] = None


class CareerApplicationUpdateDTO(BaseModel):
    status: Optional[str] = None
    salary_offered: Optional[float] = None
    notes: Optional[str] = None


class CareerApplicationResponseDTO(BaseModel):
    id: uuid.UUID
    learner_id: str
    role_id: Optional[uuid.UUID] = None
    role_title: Optional[str] = None
    organization_name: str
    job_title: Optional[str] = None
    status: str
    source: str
    applied_at: datetime
    salary_offered: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LearnerProjectCreateDTO(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    skills: Optional[List[str]] = Field(default_factory=list)
    technologies: Optional[List[str]] = Field(default_factory=list)
    github_url: Optional[str] = Field(None, max_length=255)
    live_url: Optional[str] = Field(None, max_length=255)
    completed_at: Optional[datetime] = None
    verification_status: str = Field(ProjectVerificationStatus.SELF_REPORTED.value, max_length=50)


class LearnerProjectResponseDTO(BaseModel):
    id: uuid.UUID
    learner_id: str
    title: str
    description: Optional[str] = None
    skills: Optional[List[str]] = None
    technologies: Optional[List[str]] = None
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    completed_at: datetime
    verification_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OutcomeVerifyDTO(BaseModel):
    status: str = Field("VERIFIED", description="VERIFIED | REJECTED")
    notes: Optional[str] = None


class MLFeatureSnapshotCreateDTO(BaseModel):
    prediction_cutoff: Optional[datetime] = Field(
        None,
        description="Historical cutoff timestamp. No data occurring after this cutoff is allowed in features.",
    )
    feature_version: str = Field("v1", max_length=20)
    role_id: Optional[uuid.UUID] = None


class MLFeatureSnapshotResponseDTO(BaseModel):
    id: uuid.UUID
    learner_id: str
    snapshot_date: datetime
    prediction_cutoff: datetime
    role_id: Optional[uuid.UUID] = None
    feature_version: str
    features_json: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MLDatasetRowDTO(BaseModel):
    learner_id: str
    snapshot_id: uuid.UUID
    snapshot_date: datetime
    prediction_cutoff: datetime
    feature_version: str
    features: Dict[str, Any]
    label: int = Field(..., description="Binary target label (0 or 1)")
    label_type: str = Field(..., description="Label category e.g. INTERNSHIP_ACCEPTED")
    label_horizon_days: int = Field(90, description="Forward observation window in days")
    observed_outcome_date: Optional[datetime] = None
    leakage_safe: bool = True


class MLDatasetExportResponseDTO(BaseModel):
    dataset_version: str
    total_records: int
    positive_count: int
    negative_count: int
    positive_ratio: float
    feature_names: List[str]
    records: List[MLDatasetRowDTO]
    generated_at: str
    leakage_guarantee: str = (
        "Strict temporal barrier enforced: All features strictly precede prediction cutoff T; "
        "label evaluates real observed events in [T, T + horizon] without leakage."
    )


class CareerJourneyOverviewDTO(BaseModel):
    learner_id: str
    full_name: str
    target_role_title: Optional[str] = None
    role_match_score: float = 0.0
    mastered_skills_count: int = 0
    critical_gaps_count: int = 0
    learning_progress_pct: float = 0.0
    projects_count: int = 0
    applications_count: int = 0
    interviews_count: int = 0
    internship_status: str = "NOT_STARTED"
    employment_status: str = "NOT_STARTED"
    recent_events: List[CareerEventResponseDTO] = Field(default_factory=list)
    recent_applications: List[CareerApplicationResponseDTO] = Field(default_factory=list)
    recent_projects: List[LearnerProjectResponseDTO] = Field(default_factory=list)
    outcomes: List[Dict[str, Any]] = Field(default_factory=list)
