from enum import Enum
from typing import Any, Optional
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


class UserRole(str, Enum):
    MSDE_OFFICER = "MSDE_OFFICER"
    STATE_ADMIN = "STATE_ADMIN"
    TRAINING_PROVIDER = "TRAINING_PROVIDER"
    EMPLOYER = "EMPLOYER"
    EVALUATOR = "EVALUATOR"
    SYSTEM_ADMIN = "SYSTEM_ADMIN"
    LEARNER = "LEARNER"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=150)
    role: UserRole = UserRole.EVALUATOR


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128, description="Password must be at least 8 characters")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    is_superuser: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in_seconds: int = 1800
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Valid 7-day refresh token")


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = "access"
    exp: Optional[int] = None


class PhoneLoginRequest(BaseModel):
    phone: Optional[str] = Field(None, min_length=7, max_length=25, description="E.164 phone number e.g. +919876543210")
    phone_number: Optional[str] = Field(None, min_length=7, max_length=25)
    firebase_id_token: Optional[str] = Field(None, description="Verified Firebase Auth ID token")
    id_token: Optional[str] = Field(None, description="Alternative key for Firebase Auth ID token")
    full_name: Optional[str] = Field(None, max_length=150, description="Full name if new user registration")
    display_name: Optional[str] = Field(None, max_length=150)
    role: Optional[UserRole] = Field(UserRole.LEARNER, description="Role to assign (default: LEARNER)")

    @model_validator(mode="after")
    def populate_canonical_fields(self) -> "PhoneLoginRequest":
        if not self.phone and self.phone_number:
            self.phone = self.phone_number
        if not self.phone:
            raise ValueError("Phone number is required")
        if not self.firebase_id_token and self.id_token:
            self.firebase_id_token = self.id_token
        if not self.full_name and self.display_name:
            self.full_name = self.display_name
        return self
