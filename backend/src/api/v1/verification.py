from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, require_role
from src.core.database import get_db
from src.models.user import User
from src.schemas.user import UserRole
from src.schemas.verification_dto import (
    AadhaarOTPRequestDTO,
    AadhaarOTPVerifyRequestDTO,
    AadhaarVerifyRequestDTO,
    AadhaarVerifyResponseDTO,
    Candidate360AuditRequestDTO,
    Candidate360AuditResponseDTO,
    EPFOVerifyRequestDTO,
    EPFOVerifyResponseDTO,
    SIDCredentialVerifyRequestDTO,
    SIDCredentialVerifyResponseDTO,
)
from src.services.audit_service import audit_service
from src.services.verification_service import verification_service

router = APIRouter()

IDENTITY_VERIFICATION_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)
EPFO_VERIFICATION_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)
SID_VERIFICATION_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)
CANDIDATE_360_AUDIT_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)
GATEWAY_HEALTH_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.SYSTEM_ADMIN,
)


@router.post(
    "/identity",
    response_model=AadhaarVerifyResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Aadhaar / UIDAI Demographic Identity Verification",
    description="Demographic verification with automated PII masking. Raw Aadhaar numbers are never logged or stored.",
)
async def verify_identity_endpoint(
    req: AadhaarVerifyRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*IDENTITY_VERIFICATION_ROLES)),
) -> AadhaarVerifyResponseDTO:
    """Verifies candidate identity demographics."""
    result = await verification_service.verify_identity(
        raw_aadhaar=req.aadhaar_number,
        expected_name=req.full_name,
        dob=req.dob,
        state=req.state,
    )
    await audit_service.log_action(
        db=db,
        action="IDENTITY_VERIFIED",
        resource_type="IDENTITY",
        resource_id=result.aadhaar_hash,
        actor=current_user,
        status="SUCCESS" if result.is_verified else "FAILED",
        details={
            "masked_aadhaar": result.masked_aadhaar,
            "kyc_status": result.kyc_status,
            "name_match_score": result.name_match_score,
            "txn_reference": result.txn_reference,
        },
    )
    return AadhaarVerifyResponseDTO(**result.to_dict())


@router.post(
    "/identity/otp/send",
    status_code=status.HTTP_200_OK,
    summary="Dispatch Mobile OTP for e-KYC",
    description="Simulates sending a one-time password to the Aadhaar-linked mobile number.",
)
async def send_identity_otp_endpoint(
    req: AadhaarOTPRequestDTO,
    current_user: User = Depends(require_role(*IDENTITY_VERIFICATION_ROLES)),
) -> Dict[str, Any]:
    """Dispatches simulated OTP."""
    return await verification_service.aadhaar_adapter.send_otp(req.aadhaar_number)


@router.post(
    "/identity/otp/verify",
    response_model=AadhaarVerifyResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Verify Mobile OTP for e-KYC",
    description="Validates OTP and completes identity authentication.",
)
async def verify_identity_otp_endpoint(
    req: AadhaarOTPVerifyRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*IDENTITY_VERIFICATION_ROLES)),
) -> AadhaarVerifyResponseDTO:
    """Validates OTP."""
    result = await verification_service.aadhaar_adapter.verify_otp(
        txn_id=req.txn_id,
        otp=req.otp,
        raw_aadhaar=req.aadhaar_number,
        expected_name=req.full_name,
    )
    await audit_service.log_action(
        db=db,
        action="IDENTITY_OTP_VERIFIED",
        resource_type="IDENTITY",
        resource_id=result.aadhaar_hash,
        actor=current_user,
        status="SUCCESS" if result.is_verified else "FAILED",
        details={
            "masked_aadhaar": result.masked_aadhaar,
            "kyc_status": result.kyc_status,
            "txn_reference": result.txn_reference,
        },
    )
    return AadhaarVerifyResponseDTO(**result.to_dict())


@router.post(
    "/epfo",
    response_model=EPFOVerifyResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="EPFO Electronic Passbook & Employment Verification",
    description="Audits candidate employment continuity against electronic establishment passbook records.",
)
async def verify_epfo_endpoint(
    req: EPFOVerifyRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*EPFO_VERIFICATION_ROLES)),
) -> EPFOVerifyResponseDTO:
    """Verifies EPFO establishment linkage."""
    result = await verification_service.verify_epfo_employment(
        uan=req.uan,
        employer_name=req.employer_name,
    )
    await audit_service.log_action(
        db=db,
        action="EPFO_VERIFIED",
        resource_type="EPFO",
        resource_id=req.uan,
        actor=current_user,
        status="SUCCESS" if result.is_verified else "FAILED",
        details={
            "establishment_name": req.employer_name,
            "status": result.status,
            "contributions_found": result.contributions_found,
        },
    )
    return EPFOVerifyResponseDTO(**result.to_dict())


@router.post(
    "/sid",
    response_model=SIDCredentialVerifyResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Skill India Digital / NCVET Credential Verification",
    description="Verifies digital qualification authenticity against National Skills Registry.",
)
async def verify_sid_endpoint(
    req: SIDCredentialVerifyRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*SID_VERIFICATION_ROLES)),
) -> SIDCredentialVerifyResponseDTO:
    """Verifies NCVET credential."""
    result = await verification_service.verify_ncvet_credential(
        credential_id=req.credential_id,
        candidate_name=req.candidate_name,
    )
    await audit_service.log_action(
        db=db,
        action="CREDENTIAL_VERIFIED",
        resource_type="CREDENTIAL",
        resource_id=req.credential_id,
        actor=current_user,
        status="SUCCESS" if result.is_authenticated else "FAILED",
        details={
            "candidate_name": req.candidate_name,
            "status": result.status,
            "awarding_body": result.awarding_body,
        },
    )
    return SIDCredentialVerifyResponseDTO(**result.to_dict())


@router.post(
    "/candidate-360",
    response_model=Candidate360AuditResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Multi-Signal Candidate 360 Verification",
    description="Executes concurrent multi-channel verification across Identity, EPFO, and Skills credentials with full error isolation.",
)
async def candidate_360_audit_endpoint(
    req: Candidate360AuditRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*CANDIDATE_360_AUDIT_ROLES)),
) -> Candidate360AuditResponseDTO:
    """Executes multi-channel verification audit."""
    result = await verification_service.run_candidate_360_audit(
        expected_name=req.expected_name,
        raw_aadhaar=req.aadhaar_number,
        uan=req.uan,
        employer_name=req.employer_name,
        credential_id=req.credential_id,
    )
    await audit_service.log_action(
        db=db,
        action="CANDIDATE_360_AUDITED",
        resource_type="LEARNER",
        resource_id=req.expected_name,
        actor=current_user,
        status="SUCCESS",
        details={"composite_trust_score": result.get("composite_trust_score")},
    )
    return Candidate360AuditResponseDTO(**result)


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Check External Integration Adapters Health",
    description="Returns connectivity and readiness status for Aadhaar, EPFO, and SID gateways.",
)
async def external_adapters_health_endpoint(
    current_user: User = Depends(require_role(*GATEWAY_HEALTH_ROLES)),
) -> Dict[str, Any]:
    """Returns gateway health summary."""
    return await verification_service.check_all_adapters_health()

