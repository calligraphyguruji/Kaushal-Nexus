from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, require_role
from src.core.database import get_db
from src.models.user import User
from src.schemas.common import PaginatedResponse
from src.schemas.consent_dto import (
    ConsentCreateDTO,
    ConsentResponseDTO,
    ConsentUpdateDTO,
)
from src.schemas.follow_up_dto import (
    FollowUpCreateDTO,
    FollowUpRecordResponseDTO,
    FollowUpResponseDTO,
)
from src.schemas.learner_dto import (
    BridgeModuleAllocationRequestDTO,
    BridgeModuleAllocationResponseDTO,
    CredentialVerificationRequestDTO,
    CredentialVerificationResponseDTO,
    Learner360ResponseDTO,
    LearnerCreateDTO,
    LearnerListItemDTO,
    LearnerUpdateDTO,
)
from src.schemas.outcome_dto import (
    NonPlacementReasonCreateDTO,
    NonPlacementReasonResponseDTO,
)
from src.schemas.self_employment_dto import (
    SelfEmploymentCreateDTO,
    SelfEmploymentResponseDTO,
    SelfEmploymentVerifyDTO,
)
from src.schemas.user import UserRole
from src.services.audit_service import audit_service
from src.services.consent_service import consent_service
from src.services.follow_up_service import follow_up_service
from src.services.learner_service import learner_service
from src.services.outcome_tracking_service import outcome_tracking_service
from src.services.self_employment_service import self_employment_service

router = APIRouter()

ALL_INSTITUTIONAL_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)
LEARNER_MUTATION_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.SYSTEM_ADMIN,
)
LEARNER_UPDATE_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)
CREDENTIAL_VERIFY_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)


@router.get(
    "",
    response_model=PaginatedResponse[LearnerListItemDTO],
    status_code=status.HTTP_200_OK,
    summary="List & Filter Candidates",
    description="Search and filter skilling beneficiaries with multi-criteria query parameters (search, district, status, NSQF level).",
)
async def list_learners(
    search: Optional[str] = Query(None, description="Search across full name, email, phone, candidate ID, or NCVET credential ID"),
    district_id: Optional[str] = Query(None, description="Filter by district code e.g. 'UP-VARANASI'"),
    status: Optional[str] = Query(None, description="Filter by status e.g. 'In Training', 'Assessment Passed', 'Interview Ready', 'Placed & Verified'"),
    nsqf_level: Optional[str] = Query(None, description="Filter by NSQF level e.g. 'NSQF Level 5'"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> PaginatedResponse[LearnerListItemDTO]:
    """Retrieves paginated list of candidates with search and filtering."""
    return await learner_service.list_learners(
        db=db,
        search=search,
        district_id=district_id,
        status=status,
        nsqf_level=nsqf_level,
        page=page,
        page_size=page_size,
        user=current_user,
    )


@router.get(
    "/{learner_id}",
    response_model=Learner360ResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Learner 360° Comprehensive Dossier",
    description="Retrieve 360-degree candidate profile including competencies, scores, detected skill gaps, training info, progress, and employment status.",
)
async def get_learner_by_id(
    learner_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> Learner360ResponseDTO:
    """Retrieves a complete 360° candidate intelligence dossier."""
    return await learner_service.get_learner_360(db, learner_id, user=current_user)


@router.post(
    "",
    response_model=Learner360ResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Register New Candidate",
    description="Register a new beneficiary into the KaushalNexus registry with optional initial skill competencies.",
)
async def create_learner(
    learner_in: LearnerCreateDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_MUTATION_ROLES)),
) -> Learner360ResponseDTO:
    """Creates a new candidate record."""
    res = await learner_service.create_learner(db, learner_in)
    await audit_service.log_action(
        db=db,
        action="LEARNER_CREATED",
        resource_type="LEARNER",
        resource_id=res.id,
        actor=current_user,
        status="SUCCESS",
        details={"full_name": res.full_name, "district_id": res.district_id, "nsqf_level": res.nsqf_level},
    )
    return res


@router.patch(
    "/{learner_id}",
    response_model=Learner360ResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Update Candidate Profile",
    description="Partially update candidate profile fields, readiness score, progress, or cohort status.",
)
async def update_learner(
    learner_id: str,
    update_in: LearnerUpdateDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_UPDATE_ROLES)),
) -> Learner360ResponseDTO:
    """Updates candidate profile."""
    res = await learner_service.update_learner(db, learner_id, update_in)
    await audit_service.log_action(
        db=db,
        action="LEARNER_UPDATED",
        resource_type="LEARNER",
        resource_id=learner_id,
        actor=current_user,
        status="SUCCESS",
        details=update_in.model_dump(exclude_unset=True),
    )
    return res


@router.post(
    "/{learner_id}/verify-credential",
    response_model=CredentialVerificationResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Verify NCVET Credential (Placeholder Service)",
    description="Authenticate candidate skill credential against National Skills Registry.",
)
async def verify_credential(
    learner_id: str,
    req: CredentialVerificationRequestDTO = CredentialVerificationRequestDTO(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*CREDENTIAL_VERIFY_ROLES)),
) -> CredentialVerificationResponseDTO:
    """Authenticates candidate credential against NCVET repository."""
    res = await learner_service.verify_credential(db, learner_id, req)
    await audit_service.log_action(
        db=db,
        action="CREDENTIAL_VERIFIED",
        resource_type="CREDENTIAL",
        resource_id=res.credential_id,
        actor=current_user,
        status="SUCCESS",
        details={"learner_id": learner_id, "is_authenticated": res.is_authenticated},
    )
    return res


@router.post(
    "/{learner_id}/allocate-bridge-module",
    response_model=BridgeModuleAllocationResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Allocate Targeted Bridge Module (Placeholder Service)",
    description="Assign a remedial bridge curriculum track to address identified competency deficits and boost readiness score.",
)
async def allocate_bridge_module(
    learner_id: str,
    req: BridgeModuleAllocationRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_MUTATION_ROLES)),
) -> BridgeModuleAllocationResponseDTO:
    """Assigns bridge module and enhances employment readiness score."""
    res = await learner_service.allocate_bridge_module(db, learner_id, req)
    await audit_service.log_action(
        db=db,
        action="INTERVENTION_DEPLOYED",
        resource_type="INTERVENTION",
        resource_id=learner_id,
        actor=current_user,
        status="SUCCESS",
        details={"module_name": req.module_name, "duration_hours": req.duration_hours, "readiness_boost": res.readiness_increment},
    )
    return res


# ==============================================================================
# Consent & Privacy Management Endpoints
# ==============================================================================

@router.get(
    "/{learner_id}/consents",
    response_model=List[ConsentResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="List Candidate Privacy Consents",
    description="Retrieve all active and historical privacy authorizations documented for a skilling beneficiary.",
)
async def get_learner_consents(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> List[ConsentResponseDTO]:
    """Retrieves consent permissions for candidate."""
    return await consent_service.get_learner_consents(db, learner_id, user=current_user)


@router.post(
    "/{learner_id}/consents",
    response_model=ConsentResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Grant or Register Candidate Consent",
    description="Records candidate's explicit consent for wage tracking, retention monitoring, or longitudinal follow-ups.",
)
async def create_learner_consent(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    consent_in: ConsentCreateDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_UPDATE_ROLES)),
) -> ConsentResponseDTO:
    """Registers candidate privacy authorization."""
    res = await consent_service.create_or_update_consent(db, learner_id, consent_in, user=current_user)
    await audit_service.log_action(
        db=db,
        action="CONSENT_GRANTED",
        resource_type="CONSENT",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "consent_type": res.consent_type.value,
            "version": res.version,
            "source": res.source,
        },
    )
    return res


@router.patch(
    "/{learner_id}/consents/{consent_id}",
    response_model=ConsentResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Update or Revoke Consent",
    description="Partially updates consent terms or marks consent as revoked with audit trail.",
)
async def update_learner_consent(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    consent_id: uuid.UUID = Path(..., description="Unique consent record UUID"),
    consent_in: ConsentUpdateDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_UPDATE_ROLES)),
) -> ConsentResponseDTO:
    """Updates or revokes candidate consent."""
    res = await consent_service.update_consent(db, learner_id, consent_id, consent_in, user=current_user)
    action_verb = "CONSENT_REVOKED" if not res.granted else "CONSENT_UPDATED"
    await audit_service.log_action(
        db=db,
        action=action_verb,
        resource_type="CONSENT",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "consent_type": res.consent_type.value,
            "granted": res.granted,
            "revoked_at": res.revoked_at.isoformat() if res.revoked_at else None,
        },
    )
    return res


@router.delete(
    "/{learner_id}/consents/{consent_id}",
    response_model=ConsentResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Revoke Candidate Consent",
    description="Explicitly revokes active tracking authorization.",
)
async def revoke_learner_consent(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    consent_id: uuid.UUID = Path(..., description="Unique consent record UUID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_UPDATE_ROLES)),
) -> ConsentResponseDTO:
    """Revokes candidate consent record."""
    res = await consent_service.revoke_consent(db, learner_id, consent_id, user=current_user)
    await audit_service.log_action(
        db=db,
        action="CONSENT_REVOKED",
        resource_type="CONSENT",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "consent_type": res.consent_type.value,
            "revoked_at": res.revoked_at.isoformat() if res.revoked_at else None,
        },
    )
    return res


# ==============================================================================
# Longitudinal Follow-Up Endpoints
# ==============================================================================

@router.get(
    "/{learner_id}/follow-ups",
    response_model=List[FollowUpResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="List Candidate Outcome Follow-Ups",
    description="Retrieves scheduled, sent, and completed longitudinal outreach records for a candidate.",
)
async def get_learner_follow_ups(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> List[FollowUpResponseDTO]:
    """Retrieves outreach follow-up history."""
    return await follow_up_service.get_learner_follow_ups(db, learner_id, user=current_user)


@router.post(
    "/{learner_id}/follow-ups",
    response_model=FollowUpResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule Longitudinal Follow-Up Milestone",
    description="Schedules automated or assisted outcome verification outreach (e.g. 30_DAY, 90_DAY, 180_DAY, 365_DAY).",
)
async def schedule_learner_follow_up(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    follow_up_in: FollowUpCreateDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_MUTATION_ROLES)),
) -> FollowUpResponseDTO:
    """Schedules follow-up milestone outreach."""
    res = await follow_up_service.schedule_follow_up(db, learner_id, follow_up_in, user=current_user)
    await audit_service.log_action(
        db=db,
        action="FOLLOWUP_SCHEDULED",
        resource_type="FOLLOW_UP",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "follow_up_type": res.follow_up_type.value,
            "scheduled_at": res.scheduled_at.isoformat(),
            "channel": res.channel.value,
        },
    )
    return res


@router.post(
    "/{learner_id}/follow-ups/{follow_up_id}/respond",
    response_model=FollowUpResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Record Follow-Up Outcome Response",
    description="Captures candidate response (Employed, Self-Employed, Apprenticeship, Unemployed, etc.) from outreach.",
)
async def record_follow_up_response(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    follow_up_id: uuid.UUID = Path(..., description="Unique follow-up record UUID"),
    resp_in: FollowUpRecordResponseDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> FollowUpResponseDTO:
    """Records feedback from follow-up survey."""
    res = await follow_up_service.record_follow_up_response(
        db, learner_id, follow_up_id, resp_in, user=current_user
    )
    await audit_service.log_action(
        db=db,
        action="FOLLOWUP_COMPLETED",
        resource_type="FOLLOW_UP",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "follow_up_type": res.follow_up_type.value,
            "response_status": res.response_status,
        },
    )
    return res


# ==============================================================================
# Self-Employment Outcome Endpoints
# ==============================================================================

@router.get(
    "/{learner_id}/self-employment",
    response_model=List[SelfEmploymentResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="List Self-Employment Ventures",
    description="Retrieves micro-enterprise and entrepreneurial ventures documented for a skilling graduate.",
)
async def get_learner_self_employment(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> List[SelfEmploymentResponseDTO]:
    """Retrieves self-employment records."""
    return await self_employment_service.get_outcomes_by_learner(db, learner_id, user=current_user)


@router.post(
    "/{learner_id}/self-employment",
    response_model=SelfEmploymentResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Record Self-Employment Outcome",
    description="Registers beneficiary micro-enterprise, trade activity, operating district, and income band.",
)
async def create_self_employment_outcome(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    outcome_in: SelfEmploymentCreateDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_UPDATE_ROLES)),
) -> SelfEmploymentResponseDTO:
    """Records self-employment outcome."""
    res = await self_employment_service.create_outcome(db, learner_id, outcome_in, user=current_user)
    await audit_service.log_action(
        db=db,
        action="SELF_EMPLOYMENT_RECORDED",
        resource_type="SELF_EMPLOYMENT",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "enterprise_name": res.enterprise_name,
            "sector": res.sector,
            "district_id": res.district_id,
        },
    )
    return res


@router.patch(
    "/{learner_id}/self-employment/{outcome_id}/verify",
    response_model=SelfEmploymentResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Verify Self-Employment Outcome",
    description="Assessor or institutional evaluator verification of candidate micro-enterprise operations.",
)
async def verify_self_employment_outcome(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    outcome_id: uuid.UUID = Path(..., description="Unique self-employment outcome UUID"),
    verify_in: SelfEmploymentVerifyDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*CREDENTIAL_VERIFY_ROLES)),
) -> SelfEmploymentResponseDTO:
    """Verifies micro-enterprise status."""
    res = await self_employment_service.verify_outcome(
        db, learner_id, outcome_id, verify_in, user=current_user
    )
    await audit_service.log_action(
        db=db,
        action="SELF_EMPLOYMENT_VERIFIED",
        resource_type="SELF_EMPLOYMENT",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "verification_status": res.verification_status.value,
        },
    )
    return res


# ==============================================================================
# Non-Placement Reasons Endpoints
# ==============================================================================

@router.get(
    "/{learner_id}/non-placement-reasons",
    response_model=List[NonPlacementReasonResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="List Non-Placement Diagnostic Factors",
    description="Retrieves reasons documented for unplaced candidates (skill deficits, relocation constraints, salary mismatch).",
)
async def get_learner_non_placement_reasons(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> List[NonPlacementReasonResponseDTO]:
    """Retrieves non-placement reasons for candidate."""
    return await outcome_tracking_service.get_non_placement_reasons(db, learner_id, user=current_user)


@router.post(
    "/{learner_id}/non-placement-reasons",
    response_model=NonPlacementReasonResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Record Non-Placement Reason",
    description="Documents why candidate has not secured placement to trigger targeted remedial bridge courses or mobilization.",
)
async def record_non_placement_reason(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    reason_in: NonPlacementReasonCreateDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_UPDATE_ROLES)),
) -> NonPlacementReasonResponseDTO:
    """Records non-placement diagnostic factor."""
    res = await outcome_tracking_service.record_non_placement_reason(
        db, learner_id, reason_in, user=current_user
    )
    await audit_service.log_action(
        db=db,
        action="NON_PLACEMENT_REASON_RECORDED",
        resource_type="OUTCOME",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "reason": res.reason.value,
            "associated_skill_code": res.associated_skill_code,
        },
    )
    return res
