from typing import List
import uuid
from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.schemas.learner_intelligence_dto import RoleDetailDTO, RoleListItemDTO
from src.services.role_matching import role_matching_service

router = APIRouter()


@router.get(
    "",
    response_model=List[RoleListItemDTO],
    status_code=status.HTTP_200_OK,
    summary="List Active Target Roles",
    description="Lists all occupation standards and internship profiles with prerequisite requirement totals.",
)
async def list_roles(
    db: AsyncSession = Depends(get_db),
) -> List[RoleListItemDTO]:
    """Retrieves active skilling and internship role standards."""
    return await role_matching_service.list_roles(db)


@router.get(
    "/{role_id}",
    response_model=RoleDetailDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Role Requirement Standard",
    description="Retrieves full competency requirements, BKT mastery thresholds, and importance weights for a specific role.",
)
async def get_role_by_id(
    role_id: uuid.UUID = Path(..., description="Role unique identifier"),
    db: AsyncSession = Depends(get_db),
) -> RoleDetailDTO:
    """Retrieves target role details and competency requirement thresholds."""
    return await role_matching_service.get_role_by_id(db, role_id)
