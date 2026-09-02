from datetime import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from src.models.consent import ConsentType


class ConsentCreateDTO(BaseModel):
    consent_type: ConsentType = Field(..., description="Tracking domain to authorize")
    purpose: str = Field(..., min_length=5, max_length=255, description="Clear, plain-language purpose for data collection")
    granted: bool = Field(True, description="Whether consent is active")
    version: str = Field("v1.0", max_length=20, description="Privacy policy revision identifier")
    source: str = Field("LEARNER_PORTAL", max_length=50, description="Channel where consent was captured")


class ConsentUpdateDTO(BaseModel):
    granted: Optional[bool] = Field(None, description="Updated active status")
    revoked: Optional[bool] = Field(None, description="Explicit revocation flag (sets revoked_at timestamp)")
    version: Optional[str] = Field(None, max_length=20, description="Policy revision identifier")


class ConsentResponseDTO(BaseModel):
    id: uuid.UUID
    learner_id: str
    consent_type: ConsentType
    purpose: str
    granted: bool
    granted_at: datetime
    revoked_at: Optional[datetime] = None
    version: str
    source: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
