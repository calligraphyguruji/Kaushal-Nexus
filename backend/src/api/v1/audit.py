from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, require_role
from src.core.database import get_db
from src.models.user import User
from src.schemas.audit_dto import AuditLogItemDTO, AuditTrailResponseDTO
from src.schemas.user import UserRole
from src.services.audit_service import audit_service

router = APIRouter()

AUDIT_LOG_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.SYSTEM_ADMIN,
)


@router.get(
    "/logs",
    response_model=AuditTrailResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Query Immutable Compliance Audit Logs",
    description="Retrieve system security audit trail, action verbs, correlation IDs, and non-sensitive metadata.",
)
async def query_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action verb e.g. 'AUTH_LOGIN_SUCCESS', 'LEARNER_CREATED'"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type e.g. 'USER', 'LEARNER', 'PLACEMENT'"),
    resource_id: Optional[str] = Query(None, description="Filter by entity UUID"),
    actor_id: Optional[str] = Query(None, description="Filter by initiating actor UUID"),
    correlation_id: Optional[str] = Query(None, description="Filter by distributed correlation ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*AUDIT_LOG_ROLES)),
) -> AuditTrailResponseDTO:
    """Returns compliance audit trail."""
    logs = await audit_service.get_audit_trail(
        db=db,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        actor_id=actor_id,
        correlation_id=correlation_id,
        limit=limit,
        offset=offset,
    )

    items = [AuditLogItemDTO.model_validate(log) for log in logs]
    return AuditTrailResponseDTO(
        total=len(items),
        items=items,
        timestamp=datetime.now(timezone.utc),
    )
