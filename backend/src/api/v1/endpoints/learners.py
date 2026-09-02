from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
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
from src.services.learner_service import learner_service

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedResponse[LearnerListItemDTO],
    status_code=status.HTTP_200_OK,
    summary="List & Filter Candidates",
    description="Search and filter skilling beneficiaries with multi-criteria query parameters (district, status, NSQF level).",
)
async def list_learners(
    search: Optional[str] = Query(None, description="Search across full name, email, phone, candidate ID, or NCVET credential ID"),
    district_id: Optional[str] = Query(None, description="Filter by district code e.g. 'UP-VARANASI'"),
    status: Optional[str] = Query(None, description="Filter by status e.g. 'In Training', 'Assessment Passed', 'Placed & Verified'"),
    nsqf_level: Optional[str] = Query(None, description="Filter by NSQF level e.g. 'NSQF Level 5'"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[LearnerListItemDTO]:
    """Retrieves paginated list of candidates."""
    return await learner_service.list_learners(
        db=db,
        search=search,
        district_id=district_id,
        status=status,
        nsqf_level=nsqf_level,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{learner_id}",
    response_model=Learner360ResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Learner 360° Comprehensive Dossier",
    description="Retrieve 360-degree candidate profile including competencies, scores, detected skill gaps, training info, and career timeline.",
)
async def get_learner_by_id(
    learner_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Learner360ResponseDTO:
    """Retrieves a complete 360° candidate intelligence dossier."""
    return await learner_service.get_learner_360(db, learner_id)


@router.post(
    "",
    response_model=Learner360ResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Register New Candidate",
    description="Register a new beneficiary into the KaushalNexus registry.",
)
async def create_learner(
    learner_in: LearnerCreateDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Learner360ResponseDTO:
    """Creates a new candidate record."""
    return await learner_service.create_learner(db, learner_in)


@router.patch(
    "/{learner_id}",
    response_model=Learner360ResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Update Candidate Profile",
    description="Partially update candidate profile fields, progress, or readiness scores.",
)
async def update_learner(
    learner_id: str,
    update_in: LearnerUpdateDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Learner360ResponseDTO:
    """Updates candidate profile."""
    return await learner_service.update_learner(db, learner_id, update_in)


@router.post(
    "/{learner_id}/verify-credential",
    response_model=CredentialVerificationResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Verify NCVET Credential (Placeholder)",
    description="Authenticate candidate skill credential against National Skills Registry.",
)
async def verify_credential(
    learner_id: str,
    req: CredentialVerificationRequestDTO = CredentialVerificationRequestDTO(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CredentialVerificationResponseDTO:
    """Authenticates candidate credential against NCVET repository."""
    return await learner_service.verify_credential(db, learner_id, req)


@router.post(
    "/{learner_id}/allocate-bridge-module",
    response_model=BridgeModuleAllocationResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Allocate Targeted Bridge Module (Placeholder)",
    description="Assign a remedial bridge curriculum track to address identified competency deficits.",
)
async def allocate_bridge_module(
    learner_id: str,
    req: BridgeModuleAllocationRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BridgeModuleAllocationResponseDTO:
    """Assigns bridge module and enhances employment readiness score."""
    return await learner_service.allocate_bridge_module(db, learner_id, req)
