from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, require_role
from src.core.database import get_db
from src.models.user import User
from src.schemas.regional_dto import (
    DistrictIntelligenceItemDTO,
    PriorityClusterItemDTO,
    RegionalDivergenceResponseDTO,
)
from src.schemas.user import UserRole
from src.services.geospatial_service import geospatial_service

router = APIRouter()

ALL_INSTITUTIONAL_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)
STRATEGIC_PLANNING_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.SYSTEM_ADMIN,
)


@router.get(
    "/districts",
    response_model=List[DistrictIntelligenceItemDTO],
    status_code=status.HTTP_200_OK,
    summary="District-Level Geospatial Intelligence",
    description="Retrieve comprehensive district metrics: enrollment, training completion rate, placement rate, retention rate, demand index, supply index, divergence score, and coordinates.",
)
async def get_district_intelligence(
    state: Optional[str] = Query(None, description="Filter by state (e.g. 'Uttar Pradesh')"),
    region: Optional[str] = Query(None, description="Filter by geographic cluster (e.g. 'Eastern UP')"),
    district: Optional[str] = Query(None, description="Filter by district name or code (e.g. 'Varanasi')"),
    tier: Optional[str] = Query(None, description="Filter by district tier (e.g. 'Tier 1', 'Tier 2', 'Tier 3')"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> List[DistrictIntelligenceItemDTO]:
    """Returns granular district intelligence items."""
    return await geospatial_service.get_districts_intelligence(
        db=db, state=state, region=region, district=district, tier=tier
    )


@router.get(
    "/divergence",
    response_model=RegionalDivergenceResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Macro Regional Demand-Supply Divergence",
    description="Analyze macro-divergence across state aggregates, high-divergence hotspots, aligned corridors, and regional cluster risk profiles.",
)
async def get_regional_divergence(
    state: Optional[str] = Query(None, description="Filter by state"),
    region: Optional[str] = Query(None, description="Filter by region"),
    district: Optional[str] = Query(None, description="Filter by district"),
    tier: Optional[str] = Query(None, description="Filter by tier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*STRATEGIC_PLANNING_ROLES)),
) -> RegionalDivergenceResponseDTO:
    """Returns macro regional divergence analysis."""
    return await geospatial_service.get_regional_divergence(
        db=db, state=state, region=region, district=district, tier=tier
    )


@router.get(
    "/priority-clusters",
    response_model=List[PriorityClusterItemDTO],
    status_code=status.HTTP_200_OK,
    summary="Priority Intervention Clusters",
    description="Retrieve ranked priority clusters requiring urgent policy interventions based on composite vulnerability and migration risk scoring.",
)
async def get_priority_clusters(
    state: Optional[str] = Query(None, description="Filter by state"),
    region: Optional[str] = Query(None, description="Filter by region"),
    district: Optional[str] = Query(None, description="Filter by district"),
    tier: Optional[str] = Query(None, description="Filter by tier"),
    limit: int = Query(20, ge=1, le=100, description="Max number of priority clusters to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> List[PriorityClusterItemDTO]:
    """Returns ranked priority clusters for targeted interventions."""
    return await geospatial_service.get_priority_clusters(
        db=db, state=state, region=region, district=district, tier=tier, limit=limit
    )
