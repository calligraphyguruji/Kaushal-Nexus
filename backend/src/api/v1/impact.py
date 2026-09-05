from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import (
    get_current_active_user,
    get_current_learner,
    get_db,
    require_role,
)
from src.core.logging import logger
from src.models.learner import Learner
from src.models.user import User
from src.schemas.impact_dto import (
    CareerOutcomeFunnelDTO,
    CohortImpactDTO,
    CurriculumOptimizationItemDTO,
    ImpactDataQualityDTO,
    InterventionEffectivenessReportDTO,
    LearnerImpactDTO,
    LearnerRiskReportDTO,
    LearningInterventionDTO,
    ProgramScorecardDTO,
    ResourceEffectivenessItemDTO,
    SkillBottleneckDTO,
    UpdateInterventionStatusRequestDTO,
)
from src.services.career_pipeline_service import career_pipeline_service
from src.services.curriculum_optimization_service import curriculum_optimization_service
from src.services.impact_data_quality_service import impact_data_quality_service
from src.services.impact_measurement_service import impact_measurement_service
from src.services.intervention_effectiveness_service import intervention_effectiveness_service
from src.services.learner_risk_service import learner_risk_service
from src.services.skill_bottleneck_service import skill_bottleneck_service

router = APIRouter()


# ==============================================================================
# Learner Self-Service Endpoints
# ==============================================================================

@router.get(
    "/learners/me/impact",
    response_model=LearnerImpactDTO,
    summary="Learner Longitudinal Impact & Milestone Progression",
)
async def get_my_impact(
    current_learner: Learner = Depends(get_current_learner),
    db: AsyncSession = Depends(get_db),
) -> LearnerImpactDTO:
    """Returns baseline vs follow-up skill progression, gap reduction, and career velocity for authenticated candidate."""
    return await impact_measurement_service.get_learner_impact(db, current_learner.id)


@router.get(
    "/learners/me/early-warnings",
    response_model=LearnerRiskReportDTO,
    summary="Learner Early Warning Diagnostic Signals",
)
async def get_my_early_warnings(
    current_learner: Learner = Depends(get_current_learner),
    db: AsyncSession = Depends(get_db),
) -> LearnerRiskReportDTO:
    """Returns proactive non-punitive risk signals and recommended mentoring support."""
    return await learner_risk_service.diagnose_learner_risks(db, current_learner.id)


@router.get(
    "/learners/me/interventions",
    response_model=List[LearningInterventionDTO],
    summary="Learner Recommended & Active Interventions",
)
async def get_my_interventions(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_learner: Learner = Depends(get_current_learner),
    db: AsyncSession = Depends(get_db),
) -> List[LearningInterventionDTO]:
    """Returns the candidate's active intervention queue."""
    return await intervention_effectiveness_service.get_learner_interventions(
        db, current_learner.id, status=status_filter
    )


@router.post(
    "/learners/me/interventions/{intervention_id}/status",
    response_model=LearningInterventionDTO,
    summary="Update Candidate Intervention Status",
)
async def update_my_intervention_status(
    intervention_id: uuid.UUID,
    payload: UpdateInterventionStatusRequestDTO,
    current_learner: Learner = Depends(get_current_learner),
    db: AsyncSession = Depends(get_db),
) -> LearningInterventionDTO:
    """Updates status (e.g. IN_PROGRESS, COMPLETED) and logs observed completion delta."""
    return await intervention_effectiveness_service.update_intervention_status(
        db=db,
        intervention_id=intervention_id,
        new_status=payload.status,
        actual_hours=payload.actual_hours,
        notes=payload.notes,
    )


@router.get(
    "/learners/{learner_id}/impact",
    response_model=LearnerImpactDTO,
    dependencies=[Depends(require_role("STATE_ADMIN", "SYSTEM_ADMIN", "MSDE_OFFICER", "TRAINING_PROVIDER", "EVALUATOR"))],
    summary="Staff Candidate Impact Evaluation",
)
async def get_learner_impact_by_id(
    learner_id: str,
    db: AsyncSession = Depends(get_db),
) -> LearnerImpactDTO:
    """Staff inspection of candidate baseline-to-follow-up progression."""
    return await impact_measurement_service.get_learner_impact(db, learner_id)


# ==============================================================================
# Institutional & Program-Wide Impact Endpoints
# ==============================================================================

@router.get(
    "/ml/impact/program",
    response_model=ProgramScorecardDTO,
    dependencies=[Depends(get_current_active_user)],
    summary="Institutional Skilling Program Scorecard",
)
async def get_program_impact_scorecard(
    db: AsyncSession = Depends(get_db),
) -> ProgramScorecardDTO:
    """Returns platform-wide institutional scorecard with 95% confidence intervals and observation windows."""
    return await impact_measurement_service.get_program_scorecard(db)


@router.get(
    "/ml/impact/cohort",
    response_model=CohortImpactDTO,
    dependencies=[Depends(get_current_active_user)],
    summary="Cohort Impact & Privacy-Protected Aggregates",
)
async def get_cohort_impact_analytics(
    dimension: str = Query("INSTITUTION", description="Dimension: INSTITUTION | STATE | ROLE | PROGRAM"),
    value: Optional[str] = Query(None, description="Specific institution name, state code, or role ID"),
    db: AsyncSession = Depends(get_db),
) -> CohortImpactDTO:
    """Returns cohort progression metrics with small-sample privacy suppression (n < 5)."""
    return await impact_measurement_service.get_cohort_impact(
        db, dimension_type=dimension, dimension_value=value
    )


@router.get(
    "/ml/impact/skills",
    response_model=Dict[str, Any],
    dependencies=[Depends(get_current_active_user)],
    summary="Skill Bottlenecks & Curriculum Optimization",
)
async def get_skill_bottlenecks_and_curriculum(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Returns ranked competency bottlenecks alongside evidence-backed curriculum optimization recommendations."""
    bottlenecks = await skill_bottleneck_service.get_skill_bottlenecks(db, limit=limit)
    recommendations = await curriculum_optimization_service.get_curriculum_recommendations(db)
    return {
        "bottlenecks": [b.model_dump() for b in bottlenecks],
        "curriculum_recommendations": [r.model_dump() for r in recommendations],
        "disclaimer": (
            "Skill bottleneck rankings identify empirical pedagogical chokepoints based on learner mastery, "
            "role requirements, and reassessment outcomes. Recommendations are advisory and evidence-grounded."
        ),
    }


@router.get(
    "/ml/impact/interventions",
    response_model=InterventionEffectivenessReportDTO,
    dependencies=[Depends(get_current_active_user)],
    summary="Intervention Effectiveness & Observed Mastery Gains",
)
async def get_intervention_effectiveness(
    db: AsyncSession = Depends(get_db),
) -> InterventionEffectivenessReportDTO:
    """Returns observed completion rates, mastery gains, and gap reductions by intervention category."""
    return await intervention_effectiveness_service.get_intervention_effectiveness_report(db)


@router.get(
    "/ml/impact/funnel",
    response_model=CareerOutcomeFunnelDTO,
    dependencies=[Depends(get_current_active_user)],
    summary="Unified Longitudinal Career Outcome Funnel",
)
async def get_career_funnel(
    db: AsyncSession = Depends(get_db),
) -> CareerOutcomeFunnelDTO:
    """Returns conversion rates across all 10 longitudinal skilling milestones with drop-off diagnosis."""
    return await career_pipeline_service.get_career_outcome_funnel(db)


@router.get(
    "/ml/impact/resources",
    response_model=List[ResourceEffectivenessItemDTO],
    dependencies=[Depends(get_current_active_user)],
    summary="Learning Resource Effectiveness Analysis",
)
async def get_learning_resources_analysis(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> List[ResourceEffectivenessItemDTO]:
    """Returns empirical engagement, completion rates, and subsequent mastery associations for learning resources."""
    return await curriculum_optimization_service.get_resource_effectiveness_analysis(db, limit=limit)


@router.get(
    "/ml/impact/data-quality",
    response_model=ImpactDataQualityDTO,
    dependencies=[Depends(get_current_active_user)],
    summary="Impact Data Quality & Verification Coverage Audit",
)
async def get_impact_data_quality(
    db: AsyncSession = Depends(get_db),
) -> ImpactDataQualityDTO:
    """Returns overall data quality index, verification coverage %, and temporal completeness scorecard."""
    return await impact_data_quality_service.evaluate_impact_data_quality(db)
