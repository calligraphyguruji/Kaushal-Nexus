from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid
import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import NotFoundException
from src.core.logging import logger
from src.models.assessment import LearnerSkillMastery
from src.models.career_event import CareerApplication, LearnerProject
from src.models.learner import Learner
from src.models.learner_outcome import LearnerOutcome
from src.models.placement_prediction import PlacementPrediction
from src.schemas.career_intelligence_dto import (
    CareerIntelligenceResponseDTO,
    ReadinessComponentDTO,
    ReadinessEvaluationDTO,
)
from src.services.career_action_service import career_action_service
from src.services.career_recommendation_service import career_recommendation_service
from src.services.learning_progress_service import LearningProgressService
from src.services.placement_prediction_service import placement_prediction_service
from src.services.role_matching import role_matching_service
from src.services.intervention_effectiveness_service import intervention_effectiveness_service


class CareerIntelligenceService:
    """
    Unified Career Intelligence Engine for Phase 6.
    Connects BKT knowledge state, deterministic role matching, adaptive learning,
    project evidence, and calibrated XGBoost placement forecasting into an
    auditable, closed-loop decision support system.
    """

    WEIGHTS = {
        "bkt_mastery": 0.25,
        "role_match": 0.20,
        "gap_deficit": 0.15,
        "learning_progress": 0.15,
        "project_evidence": 0.15,
        "career_velocity": 0.10,
    }

    FORMULA_STR = "R = 0.25*BKT_mean + 0.20*RoleMatch + 0.15*(1 - GapDeficit) + 0.15*LearningProgress + 0.15*ProjectEvidence + 0.10*CareerVelocity"

    @classmethod
    def calculate_readiness_score(
        cls,
        mean_bkt: float,
        role_match_ratio: float,
        gap_completeness: float,
        learning_ratio: float,
        project_ratio: float,
        velocity_ratio: float,
    ) -> ReadinessEvaluationDTO:
        """
        Computes composite multi-component readiness score in [0.0, 1.0] and tier.
        """
        c_bkt = round(min(1.0, max(0.0, mean_bkt)), 4)
        c_role = round(min(1.0, max(0.0, role_match_ratio)), 4)
        c_gap = round(min(1.0, max(0.0, gap_completeness)), 4)
        c_learn = round(min(1.0, max(0.0, learning_ratio)), 4)
        c_proj = round(min(1.0, max(0.0, project_ratio)), 4)
        c_vel = round(min(1.0, max(0.0, velocity_ratio)), 4)

        w = cls.WEIGHTS
        overall = round(
            (w["bkt_mastery"] * c_bkt)
            + (w["role_match"] * c_role)
            + (w["gap_deficit"] * c_gap)
            + (w["learning_progress"] * c_learn)
            + (w["project_evidence"] * c_proj)
            + (w["career_velocity"] * c_vel),
            4,
        )

        if overall >= 0.80:
            tier = "STRONG_READINESS"
        elif overall >= 0.60:
            tier = "CAREER_READY"
        elif overall >= 0.40:
            tier = "DEVELOPING"
        else:
            tier = "NOT_READY"

        components = [
            ReadinessComponentDTO(
                component="BKT Competency Mastery",
                score=c_bkt,
                weight=w["bkt_mastery"],
                weighted_score=round(c_bkt * w["bkt_mastery"], 4),
                description="Bayesian Knowledge Tracing average proficiency across all assessed skills.",
            ),
            ReadinessComponentDTO(
                component="Target Role Alignment",
                score=c_role,
                weight=w["role_match"],
                weighted_score=round(c_role * w["role_match"], 4),
                description="Deterministic weighted alignment against target aspiring role requirements.",
            ),
            ReadinessComponentDTO(
                component="Competency Gap Resolution",
                score=c_gap,
                weight=w["gap_deficit"],
                weighted_score=round(c_gap * w["gap_deficit"], 4),
                description="Degree of resolution across critical technical role requirements.",
            ),
            ReadinessComponentDTO(
                component="Adaptive Learning Progress",
                score=c_learn,
                weight=w["learning_progress"],
                weighted_score=round(c_learn * w["learning_progress"], 4),
                description="Completion percentage of personalized remediation plan modules.",
            ),
            ReadinessComponentDTO(
                component="Practical Project Portfolio",
                score=c_proj,
                weight=w["project_evidence"],
                weighted_score=round(c_proj * w["project_evidence"], 4),
                description="Hands-on portfolio evidence, live deployment demos, and verified artifacts.",
            ),
            ReadinessComponentDTO(
                component="Career Velocity",
                score=c_vel,
                weight=w["career_velocity"],
                weighted_score=round(c_vel * w["career_velocity"], 4),
                description="Application activity, interview progression, and ongoing practice rhythm.",
            ),
        ]

        return ReadinessEvaluationDTO(
            overall_readiness=overall,
            readiness_tier=tier,
            components=components,
            formula=cls.FORMULA_STR,
        )

    async def evaluate_career_intelligence(
        self,
        db: AsyncSession,
        learner: Learner,
        cutoff: Optional[datetime] = None,
    ) -> CareerIntelligenceResponseDTO:
        """
        Executes end-to-end career intelligence evaluation for a learner:
        1. Queries BKT mastery states and role match
        2. Retrieves learning progress and portfolio artifacts
        3. Invokes calibrated XGBoost placement prediction
        4. Calculates multi-component readiness score
        5. Prioritizes next-best actions and strategic recommendations
        6. Persists audit snapshot to placement_predictions table
        """
        now_utc = cutoff or datetime.now(timezone.utc)

        # 1. BKT Masteries
        m_stmt = (
            select(LearnerSkillMastery)
            .where(LearnerSkillMastery.learner_id == learner.id)
            .options(selectinload(LearnerSkillMastery.skill))
        )
        m_res = await db.execute(m_stmt)
        mastery_records = m_res.scalars().all()
        if mastery_records:
            mean_bkt = float(np.mean([m.mastery_probability for m in mastery_records]))
        else:
            mean_bkt = 0.20  # Base prior

        # 2. Role Matches
        role_matches_dto = await role_matching_service.match_learner_to_roles(db=db, learner=learner)
        aspiring_match = role_matches_dto.aspiring_role

        role_match_ratio = (aspiring_match.match_score / 100.0) if aspiring_match else 0.50
        if aspiring_match and aspiring_match.skill_details:
            avg_gap = float(np.mean([s.gap for s in aspiring_match.skill_details]))
            gap_completeness = max(0.0, 1.0 - avg_gap)
        else:
            gap_completeness = 0.50

        # 3. Learning Progress
        learning_ratio = 0.0
        try:
            lp = await LearningProgressService.get_learning_progress(db=db, learner_id=learner.id)
            learning_ratio = min(1.0, lp.overall_progress_pct / 100.0)
        except Exception as e:
            logger.warning(f"Could not retrieve learning progress for learner '{learner.id}': {e}")
            lp = None

        # 4. Projects Portfolio Evidence
        proj_stmt = (
            select(LearnerProject)
            .where(LearnerProject.learner_id == learner.id)
            .order_by(LearnerProject.created_at.desc())
        )
        p_res = await db.execute(proj_stmt)
        projects = p_res.scalars().all()

        project_ratio = 0.0
        verified_projects = [
            p for p in projects
            if p.verification_status in ("VERIFIED", "INSTITUTION_VERIFIED")
        ]
        if len(verified_projects) > 0:
            project_ratio = min(1.0, 0.70 + (0.15 * len(verified_projects)))
        elif len(projects) > 0:
            base_p = 0.40
            if any(p.github_url for p in projects):
                base_p += 0.15
            if any(p.live_url for p in projects):
                base_p += 0.15
            project_ratio = min(0.70, base_p)

        # 5. Applications & Career Velocity
        app_stmt = (
            select(CareerApplication)
            .where(CareerApplication.learner_id == learner.id)
            .order_by(CareerApplication.applied_at.desc())
        )
        a_res = await db.execute(app_stmt)
        applications = a_res.scalars().all()

        velocity_ratio = 0.20
        if len(applications) >= 3:
            velocity_ratio = 0.75
        elif len(applications) >= 1:
            velocity_ratio = 0.50

        if any(a.status in ("INTERVIEW_SCHEDULED", "INTERVIEWING", "OFFERED", "ACCEPTED") for a in applications):
            velocity_ratio = max(velocity_ratio, 0.90)

        # 6. Multi-Component Readiness Score
        readiness_eval = self.calculate_readiness_score(
            mean_bkt=mean_bkt,
            role_match_ratio=role_match_ratio,
            gap_completeness=gap_completeness,
            learning_ratio=learning_ratio,
            project_ratio=project_ratio,
            velocity_ratio=velocity_ratio,
        )

        # 7. XGBoost Placement Prediction & TreeSHAP
        pred_dto = await placement_prediction_service.predict_for_learner(
            db=db,
            learner=learner,
            cutoff=now_utc,
        )
        placement_prob = pred_dto.placement_probability
        model_version = pred_dto.model_version

        # 8. Prioritized Next-Best Actions & Recommendations
        actions = career_action_service.prioritize_actions(
            role_match=aspiring_match,
            readiness_score=readiness_eval.overall_readiness,
            readiness_tier=readiness_eval.readiness_tier,
            placement_probability=placement_prob,
            projects=projects,
            applications=applications,
            learning_progress=lp,
            recent_practice_count=len(mastery_records),
        )

        learning_recs = career_action_service.filter_learning_recommendations(actions)
        application_recs = career_action_service.filter_application_recommendations(actions)

        strengths = career_recommendation_service.extract_strengths(
            role_match=aspiring_match,
            readiness_score=readiness_eval.overall_readiness,
            placement_probability=placement_prob,
            projects=projects,
            applications=applications,
        )

        risks = career_recommendation_service.extract_risks(
            role_match=aspiring_match,
            readiness_score=readiness_eval.overall_readiness,
            placement_probability=placement_prob,
            projects=projects,
            applications=applications,
        )

        career_recs = career_recommendation_service.generate_career_recommendations(
            role_match=aspiring_match,
            all_role_matches=role_matches_dto.top_matches,
            readiness_score=readiness_eval.overall_readiness,
            projects=projects,
        )

        priority_areas = [r.title for r in risks[:3]]

        # Sync top recommended actions into learning_interventions table
        for act in actions[:3]:
            try:
                comp_id = None
                if isinstance(act.evidence, dict) and "competency_id" in act.evidence:
                    try:
                        comp_id = uuid.UUID(str(act.evidence["competency_id"]))
                    except (ValueError, TypeError):
                        pass

                await intervention_effectiveness_service.create_or_sync_intervention(
                    db=db,
                    learner_id=learner.id,
                    intervention_type=act.action_type.value,
                    title=act.title,
                    description=act.description,
                    competency_id=comp_id,
                    role_id=aspiring_match.role_id if aspiring_match else None,
                    source="CAREER_INTELLIGENCE",
                    estimated_hours=2.0 if act.category.value == "LEARNING" else 1.0,
                    metadata_json={
                        "urgency": act.urgency.value,
                        "priority_score": act.priority_score,
                        "reasoning": act.reasoning,
                    },
                )
            except Exception as e:
                logger.warning(f"Could not sync intervention '{act.action_type}': {e}")

        # 9. Persist Audit Record into PlacementPrediction table
        # Check if actual outcome exists
        outcome_stmt = (
            select(LearnerOutcome)
            .where(
                LearnerOutcome.learner_id == learner.id,
                LearnerOutcome.status == "VERIFIED",
            )
            .order_by(LearnerOutcome.outcome_date.desc())
        )
        o_res = await db.execute(outcome_stmt)
        matched_outcome = o_res.scalars().first()

        prediction_record = PlacementPrediction(
            learner_id=learner.id,
            model_id=model_version,
            target="INTERNSHIP_ACCEPTED",
            probability=placement_prob,
            feature_version="v1",
            prediction_timestamp=now_utc,
            readiness_score=readiness_eval.overall_readiness,
            prediction_context={
                "readiness_tier": readiness_eval.readiness_tier,
                "components": [c.model_dump() for c in readiness_eval.components],
                "drivers": [d.model_dump() for d in pred_dto.top_positive_drivers],
                "risk_factors": [r.model_dump() for r in pred_dto.top_risk_factors],
                "aspiring_role": aspiring_match.role_title if aspiring_match else None,
            },
            actual_outcome=matched_outcome.outcome_type if matched_outcome else None,
            actual_outcome_date=matched_outcome.outcome_date if matched_outcome else None,
            outcome_matched_at=now_utc if matched_outcome else None,
        )
        db.add(prediction_record)
        await db.commit()
        await db.refresh(prediction_record)

        disclaimer = (
            "Placement probability is estimated by a calibrated gradient boosted model (XGBoost) "
            "for decision-support and prioritization only. It does NOT guarantee internship or employment offers. "
            "A lower probability never restricts application access or skill progression."
        )

        return CareerIntelligenceResponseDTO(
            learner_id=str(learner.id),
            overall_readiness=readiness_eval.overall_readiness,
            readiness_tier=readiness_eval.readiness_tier,
            readiness_breakdown=readiness_eval,
            placement_probability=placement_prob,
            placement_readiness_tier=pred_dto.readiness_tier,
            priority_areas=priority_areas,
            strengths=strengths,
            risks=risks,
            next_best_actions=actions,
            career_recommendations=career_recs,
            learning_recommendations=learning_recs,
            application_recommendations=application_recs,
            model_version=model_version,
            feature_version="v1",
            generated_at=now_utc.isoformat(),
            disclaimer=disclaimer,
        )


career_intelligence_service = CareerIntelligenceService()
