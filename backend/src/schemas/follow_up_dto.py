from datetime import datetime
from typing import Any, Dict, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from src.models.follow_up import (
    FollowUpChannel,
    FollowUpStatus,
    FollowUpType,
    OutcomeResponseCategory,
)


class FollowUpCreateDTO(BaseModel):
    follow_up_type: FollowUpType = Field(..., description="Outreach interval: 30_DAY | 90_DAY | 180_DAY | 365_DAY etc.")
    scheduled_at: datetime = Field(..., description="Target execution timestamp (ISO 8601)")
    channel: FollowUpChannel = Field(FollowUpChannel.IN_APP, description="Outreach channel")
    notes: Optional[str] = Field(None, max_length=500, description="Outreach purpose or instructions")


class FollowUpRecordResponseDTO(BaseModel):
    response_status: OutcomeResponseCategory = Field(..., description="EMPLOYED | SELF_EMPLOYED | APPRENTICESHIP | UNEMPLOYED | FURTHER_EDUCATION | JOB_SEARCHING | UNKNOWN")
    notes: Optional[str] = Field(None, max_length=1000, description="Learner feedback or counselor notes")
    outcome_details: Optional[Dict[str, Any]] = Field(None, description="Structured outcome data (salary band, venture name, etc.)")


class FollowUpResponseDTO(BaseModel):
    id: uuid.UUID
    learner_id: str
    follow_up_type: FollowUpType
    scheduled_at: datetime
    sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: FollowUpStatus
    channel: FollowUpChannel
    response_status: Optional[str] = None
    notes: Optional[str] = None
    attempt_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
