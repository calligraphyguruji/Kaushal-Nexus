from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AadhaarVerifyRequestDTO(BaseModel):
    aadhaar_number: str = Field(..., description="12-digit Aadhaar number (masked immediately upon ingestion)")
    full_name: str = Field(..., min_length=2, description="Candidate full name")
    dob: Optional[str] = None
    state: Optional[str] = None


class AadhaarOTPRequestDTO(BaseModel):
    aadhaar_number: str = Field(..., description="12-digit Aadhaar number")


class AadhaarOTPVerifyRequestDTO(BaseModel):
    txn_id: str = Field(..., description="Transaction reference ID")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP")
    aadhaar_number: str = Field(..., description="12-digit Aadhaar number")
    full_name: str = Field(..., min_length=2, description="Candidate full name")


class AadhaarVerifyResponseDTO(BaseModel):
    is_verified: bool
    masked_aadhaar: str
    aadhaar_hash: str
    name_match_score: float
    kyc_status: str
    txn_reference: str
    gender: Optional[str] = None
    state: Optional[str] = None
    verification_timestamp: str
    error_message: Optional[str] = None
    disclaimer: str


class EPFOVerifyRequestDTO(BaseModel):
    uan: str = Field(..., min_length=12, max_length=12, description="12-digit Universal Account Number")
    employer_name: str = Field(..., min_length=2, description="Employer establishment name")


class EPFOVerifyResponseDTO(BaseModel):
    is_verified: bool
    uan: str
    establishment_name: str
    status: str
    contributions_found: int
    last_deposit_month: Optional[str] = None
    txn_reference: str
    verification_timestamp: str
    error_message: Optional[str] = None
    passbook_entries: Optional[List[Dict[str, Any]]] = None
    disclaimer: str


class SIDCredentialVerifyRequestDTO(BaseModel):
    credential_id: str = Field(..., description="NCVET / SID certificate reference ID")
    candidate_name: str = Field(..., description="Candidate full name")


class SIDCredentialVerifyResponseDTO(BaseModel):
    is_authenticated: bool
    credential_id: str
    candidate_name: str
    awarding_body: str
    nsqf_level: int
    nqr_code: str
    status: str
    txn_reference: str
    verification_timestamp: str
    error_message: Optional[str] = None
    disclaimer: str


class Candidate360AuditRequestDTO(BaseModel):
    expected_name: str = Field(..., min_length=2)
    aadhaar_number: Optional[str] = None
    uan: Optional[str] = None
    employer_name: Optional[str] = None
    credential_id: Optional[str] = None


class Candidate360AuditResponseDTO(BaseModel):
    candidate_name: str
    composite_trust_score: float
    identity_verification: Optional[Dict[str, Any]] = None
    epfo_verification: Optional[Dict[str, Any]] = None
    credential_verification: Optional[Dict[str, Any]] = None
    audit_timestamp: str
    status: str
