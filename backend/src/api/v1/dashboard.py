from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, require_role
from src.core.database import get_db
from src.models.user import User
from src.schemas.dashboard_dto import (
    AttritionAnalyticsDTO,
    DashboardSummaryDTO,
    EmploymentTrendPointDTO,
    FollowUpMetricsDTO,
    FunnelStageDTO,
    NonPlacementAnalyticsDTO,
    OutcomeDistributionDTO,
    SectorMatrixItemDTO,
    SelfEmploymentAnalyticsDTO,
    WageProgressionMetricsDTO,
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


@router.get(
    "/outcomes",
    response_model=OutcomeDistributionDTO,
    status_code=status.HTTP_200_OK,
    summary="Multi-Track Outcome Distribution",
    description="Calculates employment, self-employment, apprenticeship, unemployment, and further education rates.",
)
async def get_outcome_distribution(
    district_id: Optional[str] = Query(None, description="Filter outcome metrics by district code"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*DASHBOARD_ROLES)),
) -> OutcomeDistributionDTO:
    """Returns candidate outcome distribution rates."""
    return await dashboard_service.get_outcome_distribution(
        db=db, district_id=district_id, user=current_user
    )


@router.get(
    "/follow-ups",
    response_model=FollowUpMetricsDTO,
    status_code=status.HTTP_200_OK,
    summary="Longitudinal Follow-Up Performance",
    description="Aggregates scheduled, completed, pending, and overdue follow-up metrics and channel breakdowns.",
)
async def get_followup_metrics(
    district_id: Optional[str] = Query(None, description="Filter follow-up metrics by district code"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*DASHBOARD_ROLES)),
) -> FollowUpMetricsDTO:
    """Returns longitudinal follow-up metrics."""
    return await dashboard_service.get_followup_metrics(
        db=db, district_id=district_id, user=current_user
    )


@router.get(
    "/non-placement",
    response_model=NonPlacementAnalyticsDTO,
    status_code=status.HTTP_200_OK,
    summary="Non-Placement Diagnostic Analytics",
    description="Top non-placement reasons, skill-gap related proportions, and regional bottleneck breakdown.",
)
async def get_non_placement_analytics(
    district_id: Optional[str] = Query(None, description="Filter by district code"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*DASHBOARD_ROLES)),
) -> NonPlacementAnalyticsDTO:
    """Returns non-placement reasons and skill gap diagnostics."""
    return await dashboard_service.get_non_placement_analytics(
        db=db, district_id=district_id, user=current_user
    )


@router.get(
    "/attrition",
    response_model=AttritionAnalyticsDTO,
    status_code=status.HTTP_200_OK,
    summary="Attrition & Job Turnover Analytics",
    description="3M, 6M, 12M retention rates, overall attrition rate, top separation drivers, and sector trends.",
)
async def get_attrition_analytics(
    district_id: Optional[str] = Query(None, description="Filter by district code"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*DASHBOARD_ROLES)),
) -> AttritionAnalyticsDTO:
    """Returns longitudinal attrition and retention milestone analytics."""
    return await dashboard_service.get_attrition_analytics(
        db=db, district_id=district_id, user=current_user
    )


@router.get(
    "/self-employment",
    response_model=SelfEmploymentAnalyticsDTO,
    status_code=status.HTTP_200_OK,
    summary="Self-Employment & Micro-Enterprise Analytics",
    description="Total self-employed beneficiary count, verification rates, sector distribution, and district breakdown.",
)
async def get_self_employment_analytics(
    district_id: Optional[str] = Query(None, description="Filter by district code"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*DASHBOARD_ROLES)),
) -> SelfEmploymentAnalyticsDTO:
    """Returns self-employment analytics."""
    return await dashboard_service.get_self_employment_analytics(
        db=db, district_id=district_id, user=current_user
    )


@router.get(
    "/wages",
    response_model=WageProgressionMetricsDTO,
    status_code=status.HTTP_200_OK,
    summary="Wage Trajectory & Growth Progression",
    description="Starting CTC, current CTC, and median wage progression percentage.",
)
async def get_wage_metrics(
    district_id: Optional[str] = Query(None, description="Filter by district code"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*DASHBOARD_ROLES)),
) -> WageProgressionMetricsDTO:
    """Returns wage trajectory metrics."""
    return await dashboard_service.get_wage_progression_metrics(
        db=db, district_id=district_id, user=current_user
    )
