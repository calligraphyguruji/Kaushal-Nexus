from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, require_role
from src.core.database import get_db
from src.models.user import User
from src.schemas.skill_gap_dto import (
    DeployInterventionRequestDTO,
    DeployInterventionResponseDTO,
    SkillGapDistributionDTO,
    SkillGapPriorityItemDTO,
)
from src.schemas.user import UserRole
from src.services.skill_gap_engine import skill_gap_engine

router = APIRouter()

ALL_INSTITUTIONAL_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)
POLICY_INTERVENTION_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.SYSTEM_ADMIN,
)


@router.get(
    "/priority",
    response_model=List[SkillGapPriorityItemDTO],
    status_code=status.HTTP_200_OK,
    summary="Prioritized Skill Gap Deficits",
    description="Retrieve ranked list of competency deficits calculated deterministically as (employer_demand_pct - workforce_supply_pct) with severity classification.",
)
async def get_priority_skill_gaps(
    district_id: Optional[str] = Query(None, description="Filter gaps by district code e.g. 'UP-VARANASI'"),
    sector: Optional[str] = Query(None, description="Filter gaps by industry sector e.g. 'IT-ITeS'"),
    severity: Optional[str] = Query(None, description="Filter by severity: 'Critical', 'High', 'Moderate', 'Aligned'"),
    limit: int = Query(50, ge=1, le=200, description="Max number of ranked gaps to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> List[SkillGapPriorityItemDTO]:
    """Returns prioritized skill gaps."""
    return await skill_gap_engine.get_priority_gaps(
        db=db,
        district_id=district_id,
        sector=sector,
        severity=severity,
        limit=limit,
        user=current_user,
    )


@router.get(
    "/distribution",
    response_model=SkillGapDistributionDTO,
    status_code=status.HTTP_200_OK,
    summary="Skill Gap Severity & Sector Distribution",
    description="Retrieve aggregate severity breakdown (Critical/High/Moderate/Aligned), sector distribution, and district deficit rankings.",
)
async def get_skill_gap_distribution(
    district_id: Optional[str] = Query(None, description="Filter distribution metrics by district code"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> SkillGapDistributionDTO:
    """Returns skill gap distribution analytics."""
    return await skill_gap_engine.get_distribution(
        db=db, district_id=district_id, user=current_user
    )


@router.post(
    "/deploy-intervention",
    response_model=DeployInterventionResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Deploy Targeted Skill Intervention",
    description="Deploy a simulated policy, trainer, or bridge module intervention to remediate an identified competency deficit.",
)
async def deploy_skill_gap_intervention(
    req: DeployInterventionRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*POLICY_INTERVENTION_ROLES)),
) -> DeployInterventionResponseDTO:
    """Creates and deploys an intervention record."""
    return await skill_gap_engine.deploy_intervention(
        db=db, req=req, deployed_by=current_user.full_name
    )


@router.get(
    "/outcome-correlations",
    status_code=status.HTTP_200_OK,
    summary="Skill Gap & Outcome Correlations",
    description="Empirical correlations linking competency deficits to interview failures, non-placements, and post-hiring attrition.",
)
async def get_outcome_skill_correlations(
    district_id: Optional[str] = Query(None, description="Filter correlations by district code"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
):
    """Returns associative correlations between skill gaps and employment outcomes."""
    return await skill_gap_engine.analyze_outcome_skill_correlations(
        db=db, district_id=district_id, user=current_user
    )
