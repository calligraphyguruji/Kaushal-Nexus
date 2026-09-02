from typing import List
import uuid
from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, require_role
from src.core.database import get_db
from src.models.user import User
from src.schemas.placement_dto import (
    PlacementCreateDTO,
    PlacementDetailDTO,
    PlacementResponseDTO,
    PlacementRetentionResponseDTO,
    RetentionCheckpointDTO,
    RetentionCheckpointUpdateDTO,
)
from src.schemas.user import UserRole
from src.services.audit_service import audit_service
from src.services.placement_service import placement_service

router = APIRouter()

ALL_INSTITUTIONAL_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)
PLACEMENT_CREATION_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.SYSTEM_ADMIN,
)
RETENTION_UPDATE_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)


@router.post(
    "",
    response_model=PlacementResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Create Placement & Initialize Retention Tracking",
    description=(
        "Registers candidate placement with employer, starting CTC, joined date, "
        "and auto-initializes 3M, 6M, and 12M longitudinal retention checkpoints."
    ),
)
async def create_placement(
    req: PlacementCreateDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*PLACEMENT_CREATION_ROLES)),
) -> PlacementResponseDTO:
    """Registers candidate placement and initializes longitudinal tracking checkpoints."""
    res = await placement_service.create_placement(db=db, req=req)
    await audit_service.log_action(
        db=db,
        action="PLACEMENT_CREATED",
        resource_type="PLACEMENT",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": res.learner_id,
            "employer_id": str(res.employer_id),
            "job_title": res.job_title,
            "starting_ctc_lpa": res.starting_ctc_lpa,
        },
    )
    return res


@router.get(
    "/{learner_id}",
    response_model=List[PlacementDetailDTO],
    status_code=status.HTTP_200_OK,
    summary="Get Candidate Placement Records",
    description="Retrieves all placement dossiers, employers, starting & current CTC, and EPFO statuses for a candidate.",
)
async def get_learner_placements(
    learner_id: str = Path(..., description="Unique candidate identifier e.g. 'KN-2026-00561'"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> List[PlacementDetailDTO]:
    """Retrieves placement records for a candidate."""
    return await placement_service.get_placements_by_learner(db=db, learner_id=learner_id)


@router.get(
    "/{placement_id}/retention",
    response_model=PlacementRetentionResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Longitudinal Retention & Checkpoints",
    description=(
        "Retrieves detailed 3M, 6M, and 12M retention checkpoints, active employment status, "
        "EPFO verification records, and wage increment percentage analytics."
    ),
)
async def get_placement_retention_audit(
    placement_id: uuid.UUID = Path(..., description="Unique placement UUID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> PlacementRetentionResponseDTO:
    """Retrieves longitudinal retention milestone audit for a placement."""
    return await placement_service.get_placement_retention(db=db, placement_id=placement_id)


@router.put(
    "/{placement_id}/retention/{checkpoint_type}",
    response_model=RetentionCheckpointDTO,
    status_code=status.HTTP_200_OK,
    summary="Update Retention Milestone Checkpoint",
    description="Updates checkpoint active status, milestone CTC, remarks, and recalculates wage growth percentage.",
)
async def update_retention_checkpoint(
    placement_id: uuid.UUID = Path(..., description="Unique placement UUID"),
    checkpoint_type: str = Path(..., description="Checkpoint type: '3M', '6M', or '12M'"),
    update_data: RetentionCheckpointUpdateDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*RETENTION_UPDATE_ROLES)),
) -> RetentionCheckpointDTO:
    """Updates milestone checkpoint and recalculates retention status."""
    res = await placement_service.update_retention_checkpoint(
        db=db,
        placement_id=placement_id,
        checkpoint_type=checkpoint_type,
        update_data=update_data,
    )
    await audit_service.log_action(
        db=db,
        action="RETENTION_CHECKPOINT_UPDATED",
        resource_type="PLACEMENT",
        resource_id=str(placement_id),
        actor=current_user,
        status="SUCCESS",
        details={
            "checkpoint_type": checkpoint_type,
            "is_active_at_checkpoint": res.is_active_at_checkpoint,
            "wage_increment_percentage": res.wage_increment_percentage,
        },
    )
    return res
