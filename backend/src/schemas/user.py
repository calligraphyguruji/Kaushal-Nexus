from enum import Enum
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field


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
