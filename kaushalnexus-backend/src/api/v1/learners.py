from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, require_role
from src.core.database import get_db
from src.models.user import User
from src.schemas.common import PaginatedResponse
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
from src.schemas.user import UserRole
from src.services.audit_service import audit_service
from src.services.learner_service import learner_service

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
