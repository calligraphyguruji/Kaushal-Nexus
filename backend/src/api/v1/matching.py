from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, require_role
from src.core.database import get_db
from src.models.user import User
from src.schemas.matching_dto import (
    DispatchBatchRequestDTO,
    DispatchBatchResponseDTO,
    HiringMandateItemDTO,
    LearnerMatchCalculationResponseDTO,
)
from src.schemas.user import UserRole
from src.services.audit_service import audit_service
from src.services.matching_engine import matching_engine

router = APIRouter()

ALL_INSTITUTIONAL_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)
MANDATE_VIEW_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.SYSTEM_ADMIN,
)
BATCH_DISPATCH_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.SYSTEM_ADMIN,
)


@router.get(
    "/mandates",
    response_model=List[HiringMandateItemDTO],
    status_code=status.HTTP_200_OK,
    summary="List Active Hiring Mandates",
    description="Retrieve active employer job vacancies, open roles, required competencies, salary bands, and retention milestones.",
)
async def list_hiring_mandates(
    sector: Optional[str] = Query(None, description="Filter mandates by sector (e.g. 'IT-ITeS')"),
    state: Optional[str] = Query(None, description="Filter mandates by state (e.g. 'Uttar Pradesh')"),
    is_active: bool = Query(True, description="Filter active/inactive mandates"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*MANDATE_VIEW_ROLES)),
) -> List[HiringMandateItemDTO]:
    """Returns active hiring mandates."""
    return await matching_engine.list_mandates(
        db=db, sector=sector, state=state, is_active=is_active
    )


@router.get(
    "/calculate/{learner_id}",
    response_model=LearnerMatchCalculationResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Calculate Candidate-to-Job Matching Scores",
    description=(
        "Executes multi-signal matching algorithm: "
        "Score = 0.50 * SkillAlignment + 0.30 * LocationFit + 0.20 * Readiness. "
        "Returns ranked job opportunities with matched/missing competencies and salary ranges."
    ),
)
async def calculate_learner_job_matches(
    learner_id: str,
    top_n: int = Query(10, ge=1, le=50, description="Max matching job mandates to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> LearnerMatchCalculationResponseDTO:
    """Calculates explainable job matches for candidate."""
    res = await matching_engine.calculate_matches_for_learner(
        db=db, learner_id=learner_id, top_n=top_n
    )
    await audit_service.log_action(
        db=db,
        action="MATCHING_CALCULATED",
        resource_type="LEARNER",
        resource_id=learner_id,
        actor=current_user,
        status="SUCCESS",
        details={"matches_count": len(res.top_matches), "top_n": top_n},
    )
    return res


@router.post(
    "/dispatch-batch",
    response_model=DispatchBatchResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Dispatch Candidate Shortlist Batch to Employer",
    description="Dispatch a batch of matched, verified candidates directly to an employer hiring mandate.",
)
async def dispatch_placement_batch(
    req: DispatchBatchRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*BATCH_DISPATCH_ROLES)),
) -> DispatchBatchResponseDTO:
    """Dispatches shortlisted batch to employer partner."""
    res = await matching_engine.dispatch_batch(db=db, req=req)
    await audit_service.log_action(
        db=db,
        action="MATCHING_DISPATCHED",
        resource_type="MANDATE",
        resource_id=str(req.mandate_id),
        actor=current_user,
        status="SUCCESS",
        details={
            "candidates_dispatched_count": res.candidates_dispatched_count,
            "batch_id": str(res.batch_id),
        },
    )
    return res
