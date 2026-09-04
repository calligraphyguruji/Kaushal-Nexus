from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, require_role
from src.core.database import get_db
from src.core.exceptions import AppException
from src.core.logging import logger
from src.models.user import User
from src.schemas.ai_dto import (
    CandidateSkillInputDTO,
    SkillGapAnalysisRequestDTO,
    SkillGapAnalysisResponseDTO,
)
from src.schemas.user import UserRole
from src.services.audit_service import audit_service
from src.services.gemini_service import gemini_service
from src.services.learner_service import learner_service

router = APIRouter()

ALL_INSTITUTIONAL_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)


@router.post(
    "/skill-gap-analysis",
    response_model=SkillGapAnalysisResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Google Gemini AI Skill Gap Analysis & Personalized Learning Roadmap",
    description=(
        "Synthesizes candidate competencies, target occupation, and assessment scores "
        "using Google Gemini Flash AI (via Google AI API key) to generate a diagnostic skill gap analysis, "
        "personalized phased learning roadmap, practical lab activities, and employment readiness advice."
    ),
)
async def analyze_skill_gap(
    req: SkillGapAnalysisRequestDTO,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> SkillGapAnalysisResponseDTO:

    """
    Executes AI-powered candidate skill gap diagnosis and personalized learning roadmap.
    Enriches with database facts when learner_id is provided.
    """
    try:
        # If learner_id is provided and refers to a real individual beneficiary, attempt candidate authorization and data enrichment
        if req.learner_id and not str(req.learner_id).startswith("COHORT-") and not str(req.learner_id).startswith("REGIONAL-"):
            try:
                learner_dossier = await learner_service.get_learner_360(
                    db, req.learner_id, user=current_user
                )
                if not req.current_skills and learner_dossier:
                    if not req.full_name or req.full_name == "Beneficiary Candidate":
                        req.full_name = learner_dossier.full_name
                    if not req.education_level:
                        req.education_level = learner_dossier.education_level
                    if not req.district_name:
                        req.district_name = learner_dossier.district_name or learner_dossier.district_id
                    if req.employment_readiness_score is None:
                        req.employment_readiness_score = learner_dossier.employment_readiness_score
                    if req.overall_progress is None:
                        req.overall_progress = learner_dossier.overall_progress
                    if not req.nsqf_level:
                        req.nsqf_level = learner_dossier.nsqf_level

                    # Enrich skills from database
                    enriched_skills = []
                    for s in (learner_dossier.skills or []):
                        enriched_skills.append(
                            CandidateSkillInputDTO(
                                name=s.name,
                                sector=s.sector,
                                score_percentage=s.score_percentage,
                                is_verified=s.is_verified,
                            )
                        )
                    req.current_skills = enriched_skills

                    # Enrich existing gaps if available
                    if not req.existing_gaps and learner_dossier.detected_gaps:
                        req.existing_gaps = [g.name for g in learner_dossier.detected_gaps]
            except Exception as enrich_err:
                logger.warning(
                    f"Optional database enrichment for learner '{req.learner_id}' skipped ({enrich_err}). Proceeding with payload."
                )

        # Call Google Gemini AI Service
        result = await gemini_service.generate_skill_gap_roadmap(req)

        # Audit log the AI generation
        try:
            await audit_service.log_action(
                db=db,
                action="AI_SKILL_GAP_ANALYZED",
                resource_type="AI_ROADMAP",
                resource_id=req.learner_id or "ANONYMOUS",
                actor=current_user,
                status="SUCCESS",
                details={
                    "target_occupation": req.target_occupation,
                    "model_used": result.model_used,
                    "gaps_identified_count": len(result.skill_gaps),
                    "roadmap_phases_count": len(result.roadmap),
                },
            )
        except Exception as audit_err:
            logger.warning(f"Audit log generation failed for AI analysis: {str(audit_err)}")

        return result

    except Exception as exc:
        if isinstance(exc, AppException):
            raise exc
        logger.error(f"Error executing AI Skill Gap Analysis: {str(exc)}", exc_info=True)
        raise AppException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Failed to generate AI Skill Gap Analysis. Please retry.",
            details=str(exc),
        )
