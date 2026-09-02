from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, require_role
from src.core.database import get_db
from src.models.user import User
from src.schemas.dashboard_dto import (
    DashboardSummaryDTO,
    EmploymentTrendPointDTO,
    FunnelStageDTO,
    SectorMatrixItemDTO,
)
from src.schemas.user import UserRole
from src.services.dashboard_service import dashboard_service

router = APIRouter()

# Institutional roles with dashboard visibility
DASHBOARD_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)


@router.get(
    "/summary",
    response_model=DashboardSummaryDTO,
    status_code=status.HTTP_200_OK,
    summary="Executive Impact KPI Summary",
    description="Retrieve high-level national and regional skilling KPIs (enrolled, trained, certified, placed, retention %, active mandates).",
)
async def get_dashboard_summary(
    district_id: Optional[str] = Query(None, description="Filter metrics by district code (e.g. 'UP-VARANASI')"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*DASHBOARD_ROLES)),
) -> DashboardSummaryDTO:
    """Returns aggregated executive KPI metrics."""
    return await dashboard_service.get_summary(
        db=db, district_id=district_id, user=current_user
    )


@router.get(
    "/employment-trend",
    response_model=List[EmploymentTrendPointDTO],
    status_code=status.HTTP_200_OK,
    summary="Monthly Employment Time-Series Trend",
    description="Retrieve monthly longitudinal cohort progression data formatted directly for Recharts Area and Line visualizers.",
)
async def get_employment_trend(
    district_id: Optional[str] = Query(None, description="Filter trend by district code"),
    months: int = Query(6, ge=1, le=24, description="Number of past months to aggregate"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*DASHBOARD_ROLES)),
) -> List[EmploymentTrendPointDTO]:
    """Returns monthly time-series metrics."""
    return await dashboard_service.get_employment_trend(
        db=db, district_id=district_id, months=months, user=current_user
    )


@router.get(
    "/funnel",
    response_model=List[FunnelStageDTO],
    status_code=status.HTTP_200_OK,
    summary="Skill-to-Employment Conversion Funnel",
    description="5-Stage conversion pipeline: Enrollment -> Training -> Certified -> Placed -> Retained (with drop-off rates & Recharts colors).",
)
async def get_funnel_metrics(
    district_id: Optional[str] = Query(None, description="Filter funnel by district code"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*DASHBOARD_ROLES)),
) -> List[FunnelStageDTO]:
    """Returns conversion funnel pipeline stages."""
    return await dashboard_service.get_funnel(
        db=db, district_id=district_id, user=current_user
    )


@router.get(
    "/sector-matrix",
    response_model=List[SectorMatrixItemDTO],
    status_code=status.HTTP_200_OK,
    summary="Sector-Wise Performance & Demand Divergence",
    description="Cross-sector matrix breakdown of enrollments, certifications, placements, readiness scores, and demand gaps.",
)
async def get_sector_matrix(
    district_id: Optional[str] = Query(None, description="Filter sector matrix by district code"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*DASHBOARD_ROLES)),
) -> List[SectorMatrixItemDTO]:
    """Returns sector-wise aggregated performance matrix."""
    return await dashboard_service.get_sector_matrix(
        db=db, district_id=district_id, user=current_user
    )
