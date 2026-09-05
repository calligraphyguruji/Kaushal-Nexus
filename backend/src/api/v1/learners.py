from datetime import datetime, timezone
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, File, Path, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_learner, get_current_user, require_role
from src.core.database import get_db
from src.core.exceptions import NotFoundException
from src.models.learner import Learner
from src.models.role import Role
from src.models.user import User
from src.schemas.common import PaginatedResponse
from src.schemas.consent_dto import (
    ConsentCreateDTO,
    ConsentResponseDTO,
    ConsentUpdateDTO,
)
from src.schemas.follow_up_dto import (
    FollowUpCreateDTO,
    FollowUpRecordResponseDTO,
    FollowUpResponseDTO,
)
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
from src.schemas.outcome_dto import (
    NonPlacementReasonCreateDTO,
    NonPlacementReasonResponseDTO,
)
from src.schemas.self_employment_dto import (
    SelfEmploymentCreateDTO,
    SelfEmploymentResponseDTO,
    SelfEmploymentVerifyDTO,
)
from src.schemas.bkt_dto import (
    BKTFeatureVectorResponseDTO,
    LearnerSkillGapsResponseDTO,
    LearnerSkillsResponseDTO,
)
from src.schemas.user import UserRole
from src.schemas.learner_intelligence_dto import (
    AspiringRoleUpdateDTO,
    LearnerOutcomeCreateDTO,
    LearnerOutcomeResponseDTO,
    LearnerProfileResponseDTO,
    LearnerProfileUpdateDTO,
    LearnerRoleMatchesResponseDTO,
    MLFeatureVectorResponseDTO,
    ResumeResponseDTO,
    RoleDetailDTO,
)
from src.services.assessment_service import assessment_service
from src.services.audit_service import audit_service
from src.services.consent_service import consent_service
from src.services.follow_up_service import follow_up_service
from src.services.learner_profile_service import learner_profile_service
from src.services.learner_service import learner_service
from src.services.outcome_tracking_service import outcome_tracking_service
from src.services.role_matching import role_matching_service
from src.services.self_employment_service import self_employment_service
from src.ml.feature_pipeline import ml_feature_service
from src.schemas.adaptive_learning_dto import (
    LearningActivityCreateDTO,
    LearningActivityDTO,
    LearningPlanDTO,
    LearningPlanModuleDTO,
    LearningProgressDTO,
    PracticeQuestionSetDTO,
    PracticeSubmitRequestDTO,
    PracticeSubmitResponseDTO,
)
from src.services.learning_plan_service import LearningPlanService
from src.services.adaptive_reassessment_service import AdaptiveReassessmentService
from src.services.learning_progress_service import LearningProgressService
from src.schemas.career_outcome_dto import (
    CareerApplicationCreateDTO,
    CareerApplicationResponseDTO,
    CareerApplicationUpdateDTO,
    CareerEventCreateDTO,
    CareerEventResponseDTO,
    CareerJourneyOverviewDTO,
    LearnerProjectCreateDTO,
    LearnerProjectResponseDTO,
    MLFeatureSnapshotCreateDTO,
    MLFeatureSnapshotResponseDTO,
    OutcomeVerifyDTO,
)
from src.schemas.placement_ml_dto import LearnerPlacementPredictionDTO
from src.schemas.career_intelligence_dto import CareerIntelligenceResponseDTO
from src.services.career_tracking_service import career_tracking_service
from src.services.ml_feature_snapshot_service import ml_feature_snapshot_service
from src.services.placement_prediction_service import placement_prediction_service
from src.services.career_intelligence_service import career_intelligence_service

router = APIRouter()

ALL_INSTITUTIONAL_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)
LEARNER_MUTATION_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.SYSTEM_ADMIN,
)
LEARNER_UPDATE_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)
CREDENTIAL_VERIFY_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)


# ==============================================================================
# Learner Self-Service & Intelligence Pipeline Endpoints (/me/...)
# Strict candidate-level authorization: candidates only access their own dossier
# ==============================================================================

@router.get(
    "/me/profile",
    response_model=LearnerProfileResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Authenticated Learner Profile",
    description="Retrieves current authenticated candidate profile, education, bio, and aspiring role.",
)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearnerProfileResponseDTO:
    """Retrieves current candidate's profile."""
    return await learner_profile_service.get_profile(db, current_learner)


@router.put(
    "/me/profile",
    response_model=LearnerProfileResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Update Authenticated Learner Profile",
    description="Updates candidate profile fields (institution, bio, links, graduation year, district).",
)
async def update_my_profile(
    profile_in: LearnerProfileUpdateDTO,
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearnerProfileResponseDTO:
    """Updates candidate's profile."""
    return await learner_profile_service.update_profile(db, current_learner, profile_in)


@router.patch(
    "/me/profile",
    response_model=LearnerProfileResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Partially Update Authenticated Learner Profile",
)
async def patch_my_profile(
    profile_in: LearnerProfileUpdateDTO,
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearnerProfileResponseDTO:
    """Partially updates candidate's profile."""
    return await learner_profile_service.update_profile(db, current_learner, profile_in)


@router.post(
    "/me/resume",
    response_model=ResumeResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Upload Candidate Resume (PDF / DOCX)",
    description=(
        "Uploads candidate CV (up to 5MB), extracts raw text, detects and normalizes candidate skills "
        "against competencies standard dictionary, and extracts project records. Resume skills are candidate "
        "evidence and strictly NOT written to BKT mastery."
    ),
)
async def upload_my_resume(
    file: UploadFile = File(..., description="PDF or Word resume document"),
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> ResumeResponseDTO:
    """Uploads and parses candidate CV."""
    return await learner_profile_service.upload_and_process_resume(db, current_learner, file)


@router.get(
    "/me/resume",
    response_model=ResumeResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Active Candidate Resume",
    description="Retrieves current active resume with extracted skills and projects.",
)
async def get_my_resume(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> ResumeResponseDTO:
    """Retrieves active resume for candidate."""
    return await learner_profile_service.get_active_resume(db, current_learner)


@router.delete(
    "/me/resume",
    status_code=status.HTTP_200_OK,
    summary="Delete Active Candidate Resume",
    description="Removes current active resume record and storage file.",
)
async def delete_my_resume(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> dict:
    """Deletes active resume for candidate."""
    return await learner_profile_service.delete_active_resume(db, current_learner)


@router.get(
    "/me/aspiring-role",
    response_model=Optional[RoleDetailDTO],
    status_code=status.HTTP_200_OK,
    summary="Get Candidate Aspiring Role",
    description="Retrieves details and competency requirements for the candidate's chosen target occupation.",
)
async def get_my_aspiring_role(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> Optional[RoleDetailDTO]:
    """Retrieves candidate's target aspiring role standard."""
    if not current_learner.aspiring_role_id:
        return None
    return await role_matching_service.get_role_by_id(db, current_learner.aspiring_role_id)


@router.put(
    "/me/aspiring-role",
    response_model=RoleDetailDTO,
    status_code=status.HTTP_200_OK,
    summary="Set Candidate Aspiring Role",
    description="Associates a target internship or job role with the candidate.",
)
@router.post(
    "/me/aspiring-role",
    response_model=RoleDetailDTO,
    status_code=status.HTTP_200_OK,
    summary="Set Candidate Aspiring Role (POST alias)",
    description="Associates a target internship or job role with the candidate.",
)
async def set_my_aspiring_role(
    req: AspiringRoleUpdateDTO,
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> RoleDetailDTO:
    """Sets candidate's target aspiring role."""
    return await learner_profile_service.set_aspiring_role(db, current_learner, req.role_id)


@router.get(
    "/me/skills",
    response_model=LearnerSkillsResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Get My BKT Skill Masteries",
    description="Returns estimated latent mastery probabilities for all competencies evaluated via BKT.",
)
async def get_my_skills(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearnerSkillsResponseDTO:
    """Retrieves BKT estimated skill masteries for current learner."""
    return await assessment_service.get_learner_skills(db, current_learner.id)


@router.get(
    "/me/skill-gaps",
    response_model=LearnerSkillGapsResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Analyze My Skill Gaps against Aspiring Role",
    description="Computes exact competency deficits against the candidate's aspiring role standard.",
)
async def get_my_skill_gaps(
    role_id: Optional[str] = Query(None, description="Optional override role name or ID"),
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearnerSkillGapsResponseDTO:
    """Calculates skill gaps against aspiring role standard."""
    role_title = role_id
    if not role_title and current_learner.aspiring_role_id:
        r = await db.get(Role, current_learner.aspiring_role_id)
        if r:
            role_title = r.title
    effective_role = role_title or "Python Developer Intern"
    return await assessment_service.get_learner_skill_gaps(db, current_learner.id, effective_role)


@router.get(
    "/me/role-matches",
    response_model=LearnerRoleMatchesResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Match Candidate to Industry Roles",
    description=(
        "Evaluates real-time BKT latent masteries against active role requirements. "
        "Calculates weighted alignment score (0-100), strong skills, development areas, "
        "and critical gaps for the aspiring role and top matching occupations."
    ),
)
async def get_my_role_matches(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearnerRoleMatchesResponseDTO:
    """Calculates deterministic role matches for current learner."""
    return await role_matching_service.match_learner_to_roles(db, current_learner)


@router.get(
    "/me/bkt-features",
    response_model=MLFeatureVectorResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Generate Leakage-Free Tabular Feature Vector (XGBoost Ready)",
    description=(
        "Produces clean, normalized numerical feature vector incorporating BKT masteries, "
        "assessment engagement, resume evidence, and target role alignment prior to outcome events."
    ),
)
async def get_my_bkt_features(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> MLFeatureVectorResponseDTO:
    """Extracts leakage-free ML tabular feature vector for current learner."""
    return await ml_feature_service.extract_learner_features(db, current_learner)


@router.post(
    "/me/outcomes",
    response_model=LearnerOutcomeResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Record Career Outcome Milestone",
    description="Records ground-truth outcome (offer, placement, retention) in learner_outcomes.",
)
async def record_my_outcome(
    outcome_in: LearnerOutcomeCreateDTO,
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearnerOutcomeResponseDTO:
    """Records career outcome for current learner."""
    return await ml_feature_service.record_learner_outcome(db, current_learner, outcome_in)


@router.get(
    "/me/outcomes",
    response_model=List[LearnerOutcomeResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="List Candidate Career Outcomes",
    description="Retrieves historical career outcomes documented for candidate.",
)
async def list_my_outcomes(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> List[LearnerOutcomeResponseDTO]:
    """Lists career outcomes for candidate."""
    return await ml_feature_service.get_learner_outcomes(db, current_learner.id)


# ==============================================================================
# Phase 3: Adaptive Learning & Remediation Loop Endpoints (/me/...)
# ==============================================================================

@router.get(
    "/me/learning-plan",
    response_model=LearningPlanDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Active Personalized Learning Plan",
    description="Retrieves the candidate's active remedial learning plan, sequential modules, gaps, and estimated hours.",
)
async def get_my_learning_plan(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearningPlanDTO:
    """Retrieves active learning plan or auto-generates from BKT gaps if none exists."""
    return await LearningPlanService.get_active_learning_plan(db, current_learner.id)


@router.post(
    "/me/learning-plan/generate",
    response_model=LearningPlanDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Generate or Refresh Remedial Learning Plan",
    description="Generates or regenerates a personalized learning plan based on live BKT knowledge state and aspiring role requirements.",
)
async def generate_my_learning_plan(
    force_regenerate: bool = Query(False, description="Force rebuild plan from current BKT masteries"),
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearningPlanDTO:
    """Generates or updates personalized learning plan."""
    return await LearningPlanService.generate_or_get_learning_plan(
        db, current_learner.id, force_regenerate=force_regenerate
    )


@router.get(
    "/me/learning-plan/{module_id}",
    response_model=LearningPlanModuleDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Learning Plan Module Details",
    description="Retrieves specific competency module details, curated resources, and prerequisite requirements.",
)
async def get_my_learning_plan_module(
    module_id: uuid.UUID = Path(..., description="Learning plan module unique identifier"),
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearningPlanModuleDTO:
    """Retrieves module details with ownership validation."""
    return await LearningPlanService.get_module_detail(db, current_learner.id, module_id)


@router.get(
    "/me/practice/{competency_id}",
    response_model=PracticeQuestionSetDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Targeted Practice & Reassessment Items",
    description="Fetches 3-5 targeted practice items matching the module's competency and current difficulty tier.",
)
async def get_my_practice_questions(
    competency_id: uuid.UUID = Path(..., description="Target competency standard unique identifier"),
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> PracticeQuestionSetDTO:
    """Retrieves targeted practice items for candidate's active module."""
    return await AdaptiveReassessmentService.get_practice_questions_for_competency(
        db, current_learner.id, competency_id
    )


@router.post(
    "/me/practice/{competency_id}/submit",
    response_model=PracticeSubmitResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Submit Practice / Reassessment Answers",
    description=(
        "Grades submitted answers, executes Bayesian Knowledge Tracing (BKT) updates, "
        "evaluates gap convergence, and deterministically triggers adaptive interventions "
        "(Advance to next gap, Difficulty Backoff, Prerequisite Remediation, or Spaced Repetition)."
    ),
)
async def submit_my_practice(
    competency_id: uuid.UUID = Path(..., description="Target competency standard unique identifier"),
    submission_in: PracticeSubmitRequestDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> PracticeSubmitResponseDTO:
    """Submits practice attempt and runs closed-loop adaptive remediation engine."""
    return await AdaptiveReassessmentService.submit_practice_attempt(
        db, current_learner.id, competency_id, submission_in
    )


@router.post(
    "/me/learning-activity",
    response_model=LearningActivityDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Record Learning Activity",
    description="Logs candidate educational resource engagement. Note: Activity does NOT directly modify BKT mastery.",
)
async def record_my_learning_activity(
    activity_in: LearningActivityCreateDTO,
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearningActivityDTO:
    """Logs candidate learning activity."""
    return await LearningProgressService.record_learning_activity(
        db, current_learner.id, activity_in
    )


@router.get(
    "/me/learning-activity",
    response_model=List[LearningActivityDTO],
    status_code=status.HTTP_200_OK,
    summary="Get Candidate Learning Activity History",
    description="Retrieves recent learning engagement events for authenticated candidate.",
)
async def get_my_learning_activities(
    limit: int = Query(50, ge=1, le=100, description="Max activities to retrieve"),
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> List[LearningActivityDTO]:
    """Lists candidate learning activities."""
    return await LearningProgressService.get_learning_activities(db, current_learner.id, limit=limit)


@router.get(
    "/me/learning-progress",
    response_model=LearningProgressDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Overall Adaptive Learning Progress",
    description="Summarizes overall remediation progress, completed vs remaining hours, skills mastered, and recent BKT deltas.",
)
async def get_my_learning_progress(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearningProgressDTO:
    """Calculates overall learning progress and milestone summary."""
    return await LearningProgressService.get_learning_progress(db, current_learner.id)


# ==============================================================================
# Phase 4: Career Outcome Tracking & ML Dataset Foundation Endpoints (/me/...)
# ==============================================================================

@router.post(
    "/me/career-events",
    response_model=CareerEventResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Record Candidate Career Journey Event",
    description="Records a timestamped career event (e.g. APPLICATION_SUBMITTED, INTERVIEW_ATTENDED, INTERNSHIP_ACCEPTED).",
)
async def record_my_career_event(
    event_in: CareerEventCreateDTO,
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> CareerEventResponseDTO:
    """Records a new career activity event for authenticated candidate."""
    return await career_tracking_service.record_event(db, current_learner, event_in)


@router.get(
    "/me/career-events",
    response_model=List[CareerEventResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="List Candidate Career Events",
    description="Retrieves chronological timeline of candidate career events with multi-criteria filters.",
)
async def list_my_career_events(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    role_id: Optional[uuid.UUID] = Query(None, description="Filter by associated role"),
    date_from: Optional[datetime] = Query(None, description="Start date filter"),
    date_to: Optional[datetime] = Query(None, description="End date filter"),
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> List[CareerEventResponseDTO]:
    """Lists career events for authenticated candidate."""
    return await career_tracking_service.list_events(
        db=db,
        learner_id=current_learner.id,
        event_type=event_type,
        role_id=role_id,
        date_from=date_from,
        date_to=date_to,
    )


@router.post(
    "/me/applications",
    response_model=CareerApplicationResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Log Job or Internship Application",
    description="Records a new internship or job application with company, role, status, and applied_at timestamp.",
)
async def create_my_application(
    app_in: CareerApplicationCreateDTO,
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> CareerApplicationResponseDTO:
    """Logs a candidate job or internship application."""
    return await career_tracking_service.create_application(db, current_learner, app_in)


@router.get(
    "/me/applications",
    response_model=List[CareerApplicationResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="List Candidate Applications",
    description="Retrieves active and historical job/internship applications submitted by candidate.",
)
async def list_my_applications(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by application status"),
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> List[CareerApplicationResponseDTO]:
    """Lists job applications for candidate."""
    return await career_tracking_service.list_applications(
        db=db,
        learner_id=current_learner.id,
        status_filter=status_filter,
    )


@router.patch(
    "/me/applications/{application_id}",
    response_model=CareerApplicationResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Update Application Status",
    description="Updates application progression state (e.g. INTERVIEW, OFFERED, ACCEPTED, REJECTED).",
)
async def update_my_application(
    application_id: uuid.UUID = Path(..., description="Application identifier"),
    update_in: CareerApplicationUpdateDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> CareerApplicationResponseDTO:
    """Updates status or notes for an application."""
    return await career_tracking_service.update_application(
        db=db,
        learner=current_learner,
        application_id=application_id,
        update_in=update_in,
    )


@router.post(
    "/me/projects",
    response_model=LearnerProjectResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Log Practical Technical Project Evidence",
    description="Adds a project implementation to candidate portfolio without directly inflating BKT knowledge mastery.",
)
async def create_my_project(
    project_in: LearnerProjectCreateDTO,
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearnerProjectResponseDTO:
    """Records a portfolio project for candidate."""
    return await career_tracking_service.create_project(db, current_learner, project_in)


@router.get(
    "/me/projects",
    response_model=List[LearnerProjectResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="List Candidate Projects",
    description="Lists portfolio projects completed by candidate.",
)
async def list_my_projects(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> List[LearnerProjectResponseDTO]:
    """Lists portfolio projects for candidate."""
    return await career_tracking_service.list_projects(db, current_learner.id)


@router.get(
    "/me/career-journey",
    response_model=CareerJourneyOverviewDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Candidate 360° Career Journey Overview",
    description="Synthesizes complete journey: role alignment, mastery, projects, applications, interviews, and real outcome milestones.",
)
async def get_my_career_journey(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> CareerJourneyOverviewDTO:
    """Aggregates comprehensive career journey overview."""
    return await career_tracking_service.get_career_journey_overview(db, current_learner)


@router.post(
    "/me/feature-snapshots",
    response_model=MLFeatureSnapshotResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Historical Feature Snapshot (Frozen at Cutoff T)",
    description="Captures point-in-time tabular feature vector strictly respecting historical prediction cutoff T for leakage-free ML.",
)
async def create_my_feature_snapshot(
    snapshot_in: Optional[MLFeatureSnapshotCreateDTO] = None,
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> MLFeatureSnapshotResponseDTO:
    """Creates a frozen historical feature snapshot for candidate."""
    cutoff = snapshot_in.prediction_cutoff if snapshot_in else None
    version = snapshot_in.feature_version if snapshot_in else "v1"
    role_id = snapshot_in.role_id if snapshot_in else None
    return await ml_feature_snapshot_service.create_historical_snapshot(
        db=db,
        learner=current_learner,
        cutoff=cutoff,
        role_id=role_id,
        feature_version=version,
    )


@router.get(
    "/me/placement-prediction",
    response_model=LearnerPlacementPredictionDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Candidate Calibrated AI Placement Prediction",
    description="Forecasts calibrated placement probability (90-day horizon) using trained XGBoost with local TreeSHAP drivers and actionable recommendations.",
)
async def get_my_placement_prediction(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> LearnerPlacementPredictionDTO:
    """Returns candidate personalized placement prediction and explainability report."""
    return await placement_prediction_service.predict_for_learner(
        db=db,
        learner=current_learner,
    )


@router.get(
    "/me/career-intelligence",
    response_model=CareerIntelligenceResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Comprehensive Career Intelligence & Next-Best Actions",
    description="Synthesizes BKT mastery, deterministic role matching, adaptive learning progress, portfolio evidence, and calibrated XGBoost placement probability into prioritized actions, strengths, and risk mitigations.",
)
async def get_my_career_intelligence(
    db: AsyncSession = Depends(get_db),
    current_learner: Learner = Depends(get_current_learner),
) -> CareerIntelligenceResponseDTO:
    """Returns candidate multi-component readiness, XGBoost estimate, and prioritized actions."""
    return await career_intelligence_service.evaluate_career_intelligence(
        db=db,
        learner=current_learner,
    )


@router.patch(
    "/outcomes/{outcome_id}/verify",
    response_model=LearnerOutcomeResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Institutional Outcome Verification",
    description="Allows authorized institutional staff or auditors to verify or reject self-reported outcomes.",
)
async def verify_outcome_endpoint(
    outcome_id: uuid.UUID = Path(..., description="Outcome identifier"),
    verify_in: OutcomeVerifyDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> LearnerOutcomeResponseDTO:
    """Verifies or rejects a reported career outcome."""
    rec = await career_tracking_service.verify_outcome(db, outcome_id, verify_in)
    return LearnerOutcomeResponseDTO(
        id=rec.id,
        learner_id=rec.learner_id,
        role_id=rec.role_id,
        role_title=rec.role.title if rec.role else None,
        outcome_type=rec.outcome_type,
        outcome_value=rec.outcome_value,
        outcome_date=rec.outcome_date,
        source=rec.source,
        status=rec.status,
        confidence=rec.confidence,
        notes=rec.notes,
        created_at=rec.created_at,
    )


@router.get(
    "",
    response_model=PaginatedResponse[LearnerListItemDTO],
    status_code=status.HTTP_200_OK,
    summary="List & Filter Candidates",
    description="Search and filter skilling beneficiaries with multi-criteria query parameters (search, district, status, NSQF level).",
)
async def list_learners(
    search: Optional[str] = Query(None, description="Search across full name, email, phone, candidate ID, or NCVET credential ID"),
    district_id: Optional[str] = Query(None, description="Filter by district code e.g. 'UP-VARANASI'"),
    status: Optional[str] = Query(None, description="Filter by status e.g. 'In Training', 'Assessment Passed', 'Interview Ready', 'Placed & Verified'"),
    nsqf_level: Optional[str] = Query(None, description="Filter by NSQF level e.g. 'NSQF Level 5'"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> PaginatedResponse[LearnerListItemDTO]:
    """Retrieves paginated list of candidates with search and filtering."""
    return await learner_service.list_learners(
        db=db,
        search=search,
        district_id=district_id,
        status=status,
        nsqf_level=nsqf_level,
        page=page,
        page_size=page_size,
        user=current_user,
    )


@router.get(
    "/{learner_id}",
    response_model=Learner360ResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Learner 360° Comprehensive Dossier",
    description="Retrieve 360-degree candidate profile including competencies, scores, detected skill gaps, training info, progress, and employment status.",
)
async def get_learner_by_id(
    learner_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES, UserRole.LEARNER)),
) -> Learner360ResponseDTO:
    """Retrieves a complete 360° candidate intelligence dossier."""
    return await learner_service.get_learner_360(db, learner_id, user=current_user)


@router.post(
    "",
    response_model=Learner360ResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Register New Candidate",
    description="Register a new beneficiary into the KaushalNexus registry with optional initial skill competencies.",
)
async def create_learner(
    learner_in: LearnerCreateDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_MUTATION_ROLES)),
) -> Learner360ResponseDTO:
    """Creates a new candidate record."""
    res = await learner_service.create_learner(db, learner_in)
    await audit_service.log_action(
        db=db,
        action="LEARNER_CREATED",
        resource_type="LEARNER",
        resource_id=res.id,
        actor=current_user,
        status="SUCCESS",
        details={"full_name": res.full_name, "district_id": res.district_id, "nsqf_level": res.nsqf_level},
    )
    return res


@router.patch(
    "/{learner_id}",
    response_model=Learner360ResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Update Candidate Profile",
    description="Partially update candidate profile fields, readiness score, progress, or cohort status.",
)
async def update_learner(
    learner_id: str,
    update_in: LearnerUpdateDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_UPDATE_ROLES)),
) -> Learner360ResponseDTO:
    """Updates candidate profile."""
    res = await learner_service.update_learner(db, learner_id, update_in)
    await audit_service.log_action(
        db=db,
        action="LEARNER_UPDATED",
        resource_type="LEARNER",
        resource_id=learner_id,
        actor=current_user,
        status="SUCCESS",
        details=update_in.model_dump(exclude_unset=True),
    )
    return res


@router.post(
    "/{learner_id}/verify-credential",
    response_model=CredentialVerificationResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Verify NCVET Credential (Placeholder Service)",
    description="Authenticate candidate skill credential against National Skills Registry.",
)
async def verify_credential(
    learner_id: str,
    req: CredentialVerificationRequestDTO = CredentialVerificationRequestDTO(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*CREDENTIAL_VERIFY_ROLES)),
) -> CredentialVerificationResponseDTO:
    """Authenticates candidate credential against NCVET repository."""
    res = await learner_service.verify_credential(db, learner_id, req)
    await audit_service.log_action(
        db=db,
        action="CREDENTIAL_VERIFIED",
        resource_type="CREDENTIAL",
        resource_id=res.credential_id,
        actor=current_user,
        status="SUCCESS",
        details={"learner_id": learner_id, "is_authenticated": res.is_authenticated},
    )
    return res


@router.post(
    "/{learner_id}/allocate-bridge-module",
    response_model=BridgeModuleAllocationResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Allocate Targeted Bridge Module (Placeholder Service)",
    description="Assign a remedial bridge curriculum track to address identified competency deficits and boost readiness score.",
)
async def allocate_bridge_module(
    learner_id: str,
    req: BridgeModuleAllocationRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_MUTATION_ROLES)),
) -> BridgeModuleAllocationResponseDTO:
    """Assigns bridge module and enhances employment readiness score."""
    res = await learner_service.allocate_bridge_module(db, learner_id, req)
    await audit_service.log_action(
        db=db,
        action="INTERVENTION_DEPLOYED",
        resource_type="INTERVENTION",
        resource_id=learner_id,
        actor=current_user,
        status="SUCCESS",
        details={"module_name": req.module_name, "duration_hours": req.duration_hours, "readiness_boost": res.readiness_increment},
    )
    return res


# ==============================================================================
# Consent & Privacy Management Endpoints
# ==============================================================================

@router.get(
    "/{learner_id}/consents",
    response_model=List[ConsentResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="List Candidate Privacy Consents",
    description="Retrieve all active and historical privacy authorizations documented for a skilling beneficiary.",
)
async def get_learner_consents(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> List[ConsentResponseDTO]:
    """Retrieves consent permissions for candidate."""
    return await consent_service.get_learner_consents(db, learner_id, user=current_user)


@router.post(
    "/{learner_id}/consents",
    response_model=ConsentResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Grant or Register Candidate Consent",
    description="Records candidate's explicit consent for wage tracking, retention monitoring, or longitudinal follow-ups.",
)
async def create_learner_consent(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    consent_in: ConsentCreateDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_UPDATE_ROLES)),
) -> ConsentResponseDTO:
    """Registers candidate privacy authorization."""
    res = await consent_service.create_or_update_consent(db, learner_id, consent_in, user=current_user)
    await audit_service.log_action(
        db=db,
        action="CONSENT_GRANTED",
        resource_type="CONSENT",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "consent_type": res.consent_type.value,
            "version": res.version,
            "source": res.source,
        },
    )
    return res


@router.patch(
    "/{learner_id}/consents/{consent_id}",
    response_model=ConsentResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Update or Revoke Consent",
    description="Partially updates consent terms or marks consent as revoked with audit trail.",
)
async def update_learner_consent(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    consent_id: uuid.UUID = Path(..., description="Unique consent record UUID"),
    consent_in: ConsentUpdateDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_UPDATE_ROLES)),
) -> ConsentResponseDTO:
    """Updates or revokes candidate consent."""
    res = await consent_service.update_consent(db, learner_id, consent_id, consent_in, user=current_user)
    action_verb = "CONSENT_REVOKED" if not res.granted else "CONSENT_UPDATED"
    await audit_service.log_action(
        db=db,
        action=action_verb,
        resource_type="CONSENT",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "consent_type": res.consent_type.value,
            "granted": res.granted,
            "revoked_at": res.revoked_at.isoformat() if res.revoked_at else None,
        },
    )
    return res


@router.delete(
    "/{learner_id}/consents/{consent_id}",
    response_model=ConsentResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Revoke Candidate Consent",
    description="Explicitly revokes active tracking authorization.",
)
async def revoke_learner_consent(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    consent_id: uuid.UUID = Path(..., description="Unique consent record UUID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_UPDATE_ROLES)),
) -> ConsentResponseDTO:
    """Revokes candidate consent record."""
    res = await consent_service.revoke_consent(db, learner_id, consent_id, user=current_user)
    await audit_service.log_action(
        db=db,
        action="CONSENT_REVOKED",
        resource_type="CONSENT",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "consent_type": res.consent_type.value,
            "revoked_at": res.revoked_at.isoformat() if res.revoked_at else None,
        },
    )
    return res


# ==============================================================================
# Longitudinal Follow-Up Endpoints
# ==============================================================================

@router.get(
    "/{learner_id}/follow-ups",
    response_model=List[FollowUpResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="List Candidate Outcome Follow-Ups",
    description="Retrieves scheduled, sent, and completed longitudinal outreach records for a candidate.",
)
async def get_learner_follow_ups(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> List[FollowUpResponseDTO]:
    """Retrieves outreach follow-up history."""
    return await follow_up_service.get_learner_follow_ups(db, learner_id, user=current_user)


@router.post(
    "/{learner_id}/follow-ups",
    response_model=FollowUpResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule Longitudinal Follow-Up Milestone",
    description="Schedules automated or assisted outcome verification outreach (e.g. 30_DAY, 90_DAY, 180_DAY, 365_DAY).",
)
async def schedule_learner_follow_up(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    follow_up_in: FollowUpCreateDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_MUTATION_ROLES)),
) -> FollowUpResponseDTO:
    """Schedules follow-up milestone outreach."""
    res = await follow_up_service.schedule_follow_up(db, learner_id, follow_up_in, user=current_user)
    await audit_service.log_action(
        db=db,
        action="FOLLOWUP_SCHEDULED",
        resource_type="FOLLOW_UP",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "follow_up_type": res.follow_up_type.value,
            "scheduled_at": res.scheduled_at.isoformat(),
            "channel": res.channel.value,
        },
    )
    return res


@router.post(
    "/{learner_id}/follow-ups/{follow_up_id}/respond",
    response_model=FollowUpResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Record Follow-Up Outcome Response",
    description="Captures candidate response (Employed, Self-Employed, Apprenticeship, Unemployed, etc.) from outreach.",
)
async def record_follow_up_response(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    follow_up_id: uuid.UUID = Path(..., description="Unique follow-up record UUID"),
    resp_in: FollowUpRecordResponseDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> FollowUpResponseDTO:
    """Records feedback from follow-up survey."""
    res = await follow_up_service.record_follow_up_response(
        db, learner_id, follow_up_id, resp_in, user=current_user
    )
    await audit_service.log_action(
        db=db,
        action="FOLLOWUP_COMPLETED",
        resource_type="FOLLOW_UP",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "follow_up_type": res.follow_up_type.value,
            "response_status": res.response_status,
        },
    )
    return res


# ==============================================================================
# Self-Employment Outcome Endpoints
# ==============================================================================

@router.get(
    "/{learner_id}/self-employment",
    response_model=List[SelfEmploymentResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="List Self-Employment Ventures",
    description="Retrieves micro-enterprise and entrepreneurial ventures documented for a skilling graduate.",
)
async def get_learner_self_employment(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> List[SelfEmploymentResponseDTO]:
    """Retrieves self-employment records."""
    return await self_employment_service.get_outcomes_by_learner(db, learner_id, user=current_user)


@router.post(
    "/{learner_id}/self-employment",
    response_model=SelfEmploymentResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Record Self-Employment Outcome",
    description="Registers beneficiary micro-enterprise, trade activity, operating district, and income band.",
)
async def create_self_employment_outcome(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    outcome_in: SelfEmploymentCreateDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_UPDATE_ROLES)),
) -> SelfEmploymentResponseDTO:
    """Records self-employment outcome."""
    res = await self_employment_service.create_outcome(db, learner_id, outcome_in, user=current_user)
    await audit_service.log_action(
        db=db,
        action="SELF_EMPLOYMENT_RECORDED",
        resource_type="SELF_EMPLOYMENT",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "enterprise_name": res.enterprise_name,
            "sector": res.sector,
            "district_id": res.district_id,
        },
    )
    return res


@router.patch(
    "/{learner_id}/self-employment/{outcome_id}/verify",
    response_model=SelfEmploymentResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Verify Self-Employment Outcome",
    description="Assessor or institutional evaluator verification of candidate micro-enterprise operations.",
)
async def verify_self_employment_outcome(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    outcome_id: uuid.UUID = Path(..., description="Unique self-employment outcome UUID"),
    verify_in: SelfEmploymentVerifyDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*CREDENTIAL_VERIFY_ROLES)),
) -> SelfEmploymentResponseDTO:
    """Verifies micro-enterprise status."""
    res = await self_employment_service.verify_outcome(
        db, learner_id, outcome_id, verify_in, user=current_user
    )
    await audit_service.log_action(
        db=db,
        action="SELF_EMPLOYMENT_VERIFIED",
        resource_type="SELF_EMPLOYMENT",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "verification_status": res.verification_status.value,
        },
    )
    return res


# ==============================================================================
# Non-Placement Reasons Endpoints
# ==============================================================================

@router.get(
    "/{learner_id}/non-placement-reasons",
    response_model=List[NonPlacementReasonResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="List Non-Placement Diagnostic Factors",
    description="Retrieves reasons documented for unplaced candidates (skill deficits, relocation constraints, salary mismatch).",
)
async def get_learner_non_placement_reasons(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> List[NonPlacementReasonResponseDTO]:
    """Retrieves non-placement reasons for candidate."""
    return await outcome_tracking_service.get_non_placement_reasons(db, learner_id, user=current_user)


@router.post(
    "/{learner_id}/non-placement-reasons",
    response_model=NonPlacementReasonResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Record Non-Placement Reason",
    description="Documents why candidate has not secured placement to trigger targeted remedial bridge courses or mobilization.",
)
async def record_non_placement_reason(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    reason_in: NonPlacementReasonCreateDTO = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*LEARNER_UPDATE_ROLES)),
) -> NonPlacementReasonResponseDTO:
    """Records non-placement diagnostic factor."""
    res = await outcome_tracking_service.record_non_placement_reason(
        db, learner_id, reason_in, user=current_user
    )
    await audit_service.log_action(
        db=db,
        action="NON_PLACEMENT_REASON_RECORDED",
        resource_type="OUTCOME",
        resource_id=str(res.id),
        actor=current_user,
        status="SUCCESS",
        details={
            "learner_id": learner_id,
            "reason": res.reason.value,
            "associated_skill_code": res.associated_skill_code,
        },
    )
    return res


# ==============================================================================
# Bayesian Knowledge Tracing (BKT) Mastery & Gap Analytics Endpoints
# ==============================================================================

@router.get(
    "/{learner_id}/skills",
    response_model=LearnerSkillsResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Learner Skill Masteries (BKT)",
    description=(
        "Returns estimated latent mastery probabilities and proficiency tiers ('weak', 'developing', "
        "'proficient', 'mastered') for all competencies evaluated via Bayesian Knowledge Tracing."
    ),
)
async def get_learner_skills(
    learner_id: str = Path(..., description="Candidate beneficiary identifier e.g. 'KN-2026-00561'"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> LearnerSkillsResponseDTO:
    """Retrieves BKT estimated skill masteries for learner."""
    return await assessment_service.get_learner_skills(db, learner_id)


@router.get(
    "/{learner_id}/skill-gaps",
    response_model=LearnerSkillGapsResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Analyze Skill Gaps against Benchmark Role",
    description=(
        "Computes exact competency deficits (required_mastery - current_mastery) against target occupation "
        "standards (e.g. 'Python Developer Intern'), returning prioritized gaps sorted descending."
    ),
)
async def get_learner_skill_gaps(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    role_id: Optional[str] = Query(None, description="Target role name or ID e.g. 'Python Developer Intern'"),
    target_role: Optional[str] = Query(None, description="Alternative query param for role name"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> LearnerSkillGapsResponseDTO:
    """Calculates skill gaps against benchmark role using BKT mastery probabilities."""
    effective_role = role_id or target_role or "Python Developer Intern"
    return await assessment_service.get_learner_skill_gaps(db, learner_id, effective_role)


@router.get(
    "/{learner_id}/bkt-features",
    response_model=BKTFeatureVectorResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Export BKT Feature Vector for XGBoost / ML Tabular Models",
    description=(
        "Produces clean, normalized numerical mastery feature vector (e.g. {'python_mastery': 0.82, "
        "'sql_mastery': 0.64}) formatted for downstream XGBoost job readiness predictors."
    ),
)
async def get_learner_bkt_features(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> BKTFeatureVectorResponseDTO:
    """Exports clean numerical BKT feature vector for ML training without data leakage."""
    return await assessment_service.get_learner_bkt_features(db, learner_id)


@router.post(
    "/{learner_id}/placement-prediction",
    response_model=LearnerPlacementPredictionDTO,
    status_code=status.HTTP_200_OK,
    summary="Generate Learner Placement Prediction (Staff / Evaluator)",
    description="Generates calibrated placement probability and local TreeSHAP explainability for any learner.",
)
async def predict_learner_placement_admin(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    prediction_cutoff: Optional[datetime] = Query(None, description="Historical cutoff timestamp T"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> LearnerPlacementPredictionDTO:
    """Generates placement prediction and explainability for a learner."""
    learner = await db.get(Learner, learner_id)
    if not learner:
        raise NotFoundException(f"Candidate '{learner_id}' not found.")
    return await placement_prediction_service.predict_for_learner(
        db=db,
        learner=learner,
        cutoff=prediction_cutoff,
    )


@router.post(
    "/{learner_id}/career-intelligence",
    response_model=CareerIntelligenceResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Evaluate Learner Career Intelligence (Staff / Evaluator)",
    description="Generates comprehensive career readiness evaluation, calibrated XGBoost placement probability, and prioritized actions for any learner.",
)
async def evaluate_learner_career_intelligence_admin(
    learner_id: str = Path(..., description="Candidate beneficiary identifier"),
    prediction_cutoff: Optional[datetime] = Query(None, description="Historical cutoff timestamp T"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> CareerIntelligenceResponseDTO:
    """Evaluates career readiness, XGBoost estimate, and next-best actions for a learner."""
    learner = await db.get(Learner, learner_id)
    if not learner:
        raise NotFoundException(f"Candidate '{learner_id}' not found.")
    return await career_intelligence_service.evaluate_career_intelligence(
        db=db,
        learner=learner,
        cutoff=prediction_cutoff,
    )

