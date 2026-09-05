from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, require_role
from src.core.database import get_db
from src.models.user import User
from src.schemas.assessment_dto import (
    AssessmentDetailResponseDTO,
    AssessmentListItemDTO,
    AssessmentSubmitRequestDTO,
    AssessmentSubmitResponseDTO,
    QuickAttemptRequestDTO,
    QuickAttemptResponseDTO,
)
from src.schemas.user import UserRole
from src.services.assessment_service import assessment_service
from src.services.audit_service import audit_service

router = APIRouter()

ALL_AUTHENTICATED_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
    UserRole.LEARNER,
)


@router.get(
    "",
    response_model=List[AssessmentListItemDTO],
    status_code=status.HTTP_200_OK,
    summary="List Available Diagnostic Assessments",
    description="Returns all active modular skill assessments mapped to national competency standards.",
)
async def list_assessments(
    sector: Optional[str] = Query(None, description="Filter by sector e.g. 'IT-ITeS'"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_AUTHENTICATED_ROLES)),
) -> List[AssessmentListItemDTO]:
    """Retrieves list of available skill assessments."""
    return await assessment_service.list_assessments(db=db, sector=sector)


@router.post(
    "/generate-for-role/{role_id}",
    response_model=AssessmentDetailResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Generate Role-Based Diagnostic Assessment",
    description=(
        "Dynamically assembles a diagnostic MCQ assessment from the question bank, "
        "selecting questions that map to the competencies required by the target role. "
        "Returns a balanced mix of EASY/MEDIUM/HARD questions (correct answers withheld)."
    ),
)
async def generate_assessment_for_role(
    role_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_AUTHENTICATED_ROLES)),
) -> AssessmentDetailResponseDTO:
    """Generates a role-specific assessment dynamically."""
    return await assessment_service.generate_assessment_for_role(db=db, role_id=role_id)



@router.get(
    "/{assessment_id}",
    response_model=AssessmentDetailResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Assessment Test & Questions",
    description="Loads assessment with randomized questions and multiple-choice options (withholds correct answers).",
)
async def get_assessment(
    assessment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_AUTHENTICATED_ROLES)),
) -> AssessmentDetailResponseDTO:
    """Retrieves single assessment for test taking."""
    return await assessment_service.get_assessment_by_id(db=db, assessment_id=assessment_id)


@router.post(
    "/{assessment_id}/submit",
    response_model=AssessmentSubmitResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Submit Assessment & Run Bayesian Knowledge Tracing",
    description=(
        "Evaluates candidate responses, sequentially executes Bayesian Knowledge Tracing (BKT) updates "
        "on each associated skill, persists audit history without data leakage, and returns both "
        "traditional test score percentage and updated latent mastery probabilities."
    ),
)
async def submit_assessment(
    assessment_id: uuid.UUID,
    req: AssessmentSubmitRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_AUTHENTICATED_ROLES)),
) -> AssessmentSubmitResponseDTO:
    """Submits answers and updates BKT skill masteries."""
    result = await assessment_service.process_submission(
        db=db,
        assessment_id=assessment_id,
        req=req,
    )

    # Compliance audit logging
    try:
        await audit_service.log_action(
            db=db,
            action="ASSESSMENT_EVALUATED_BKT",
            resource_type="ASSESSMENT",
            resource_id=str(assessment_id),
            actor=current_user,
            status="SUCCESS",
            details={
                "learner_id": req.learner_id,
                "score_percentage": result.score_percentage,
                "skills_updated": len(result.updated_masteries),
            },
        )
    except Exception:
        pass

    return result


@router.post(
    "/quick-attempt",
    response_model=QuickAttemptResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Submit Single Question & Update BKT Mastery",
    description="Evaluates a single question answer and immediately updates BKT mastery for interactive drills.",
)
async def quick_attempt(
    req: QuickAttemptRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_AUTHENTICATED_ROLES)),
) -> QuickAttemptResponseDTO:
    """Processes single item attempt and applies BKT update."""
    return await assessment_service.process_quick_attempt(db=db, req=req)
