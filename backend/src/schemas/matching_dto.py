from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


# ==============================================================================
# Hiring Mandate DTOs
# ==============================================================================

class HiringMandateItemDTO(BaseModel):
    id: uuid.UUID
    employer_id: uuid.UUID
    employer_name: str
    employer_tier: str
    job_title: str
    sector: str
    district_id: Optional[str] = None
    district_name: Optional[str] = None
    state: str
    openings_count: int
    min_nsqf_level: Optional[str] = None
    required_competencies: List[str]
    salary_range: str
    salary_min_lpa: float
    salary_max_lpa: float
    retention_benchmark_days: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Matching Engine Calculation DTOs
# ==============================================================================

class JobMatchResultDTO(BaseModel):
    mandate_id: uuid.UUID
    job_title: str
    employer_name: str
    employer_tier: str
    sector: str
    location: str
    salary_range: str
    openings_count: int
    match_score: float         # 0.0 to 100.0 composite percentage
    skill_alignment: float     # 0.0 to 100.0
    location_fit: float        # 0.0 to 100.0
    readiness: float           # 0.0 to 100.0
    matched_skills: List[str]
    missing_skills: List[str]
    fit_verdict: str           # "Strong Match", "Good Match", "Moderate Match"

    model_config = ConfigDict(from_attributes=True)


class LearnerMatchCalculationResponseDTO(BaseModel):
    learner_id: str
    full_name: str
    district_id: str
    district_name: Optional[str] = None
    state: Optional[str] = None
    readiness_score: int
    total_active_jobs_evaluated: int
    top_matches: List[JobMatchResultDTO]

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Dispatch Batch DTOs
# ==============================================================================

class DispatchBatchRequestDTO(BaseModel):
    mandate_id: uuid.UUID
    learner_ids: List[str] = Field(..., min_length=1, description="List of candidate IDs to dispatch")
    dispatch_notes: Optional[str] = "Automated AI multi-signal placement dispatch"


class DispatchBatchResponseDTO(BaseModel):
    batch_id: uuid.UUID
    mandate_id: uuid.UUID
    job_title: str
    employer_name: str
    candidates_dispatched_count: int
    dispatched_learner_ids: List[str]
    status: str
    dispatched_at: datetime
    message: str

    model_config = ConfigDict(from_attributes=True)
