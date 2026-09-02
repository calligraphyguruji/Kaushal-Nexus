from datetime import date, datetime
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from src.models.self_employment import (
    BusinessStatus,
    SelfEmploymentVerificationStatus,
)


class SelfEmploymentCreateDTO(BaseModel):
    enterprise_name: str = Field(..., min_length=2, max_length=150, description="Business enterprise or trade venture name")
    business_activity: str = Field(..., min_length=3, max_length=200, description="Nature of trade activity e.g. 'Electrical Installation & Maintenance'")
    sector: str = Field(..., min_length=2, max_length=100, description="Industry sector")
    district_id: str = Field(..., min_length=2, max_length=50, description="Operating district ID e.g. 'UP-VARANASI'")
    start_date: date = Field(..., description="Date operations commenced (YYYY-MM-DD)")
    monthly_income_range: str = Field(..., min_length=3, max_length=50, description="Net earnings bracket e.g. '₹15,000 - ₹25,000'")
    business_status: Optional[str] = Field("Operational", description="Viability status: Operational | Scaling | Early Stage | Inactive")
    notes: Optional[str] = Field(None, max_length=500, description="Optional self-declaration notes")


class SelfEmploymentUpdateDTO(BaseModel):
    enterprise_name: Optional[str] = Field(None, min_length=2, max_length=150)
    business_activity: Optional[str] = Field(None, min_length=3, max_length=200)
    sector: Optional[str] = Field(None, min_length=2, max_length=100)
    monthly_income_range: Optional[str] = Field(None, min_length=3, max_length=50)
    business_status: Optional[str] = Field(None)
    notes: Optional[str] = Field(None, max_length=500)


class SelfEmploymentVerifyDTO(BaseModel):
    verification_status: SelfEmploymentVerificationStatus = Field(
        ..., description="SELF_REPORTED | DOCUMENT_VERIFIED | ADMIN_VERIFIED | PENDING"
    )
    notes: Optional[str] = Field(None, max_length=500, description="Verification remarks")


class SelfEmploymentResponseDTO(BaseModel):
    id: uuid.UUID
    learner_id: str
    enterprise_name: str
    business_activity: str
    sector: str
    district_id: str
    district_name: Optional[str] = None
    start_date: date
    monthly_income_range: str
    business_status: str
    verification_status: SelfEmploymentVerificationStatus
    verified_at: Optional[datetime] = None
    verified_by_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
