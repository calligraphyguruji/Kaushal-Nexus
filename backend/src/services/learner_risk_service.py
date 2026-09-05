from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.logging import logger
from src.models.assessment import LearnerSkillHistory, LearnerSkillMastery
from src.models.career_event import CareerApplication
from src.models.learner import Learner
from src.models.learning_plan import LearningActivity, LearningPlan, LearningPlanModule, ReassessmentAttempt
from src.schemas.impact_dto import (
    LearnerRiskItemDTO,
    LearnerRiskReportDTO,
)


class LearnerRiskService:
    """
    Non-Punitive Early Warning & Academic Mentorship Diagnostic Engine.
    
    Detects evidence-based risk patterns solely from observable platform behavior:
    - LEARNING_STAGNATION: Plateau in mastery over 14+ days
    - ENGAGEMENT_DECLINE: Ceased practice/learning activities
    - PERSISTENT_SKILL_GAP: Critical gap > 0.40 on required role competency
    - CAREER_INACTIVITY: Career-ready readiness without active applications
    - REPEATED_ASSESSMENT_FAILURE: Multiple consecutive stagnant/regressed reassessments
    """

    async def diagnose_learner_risks(
        self,
        db: AsyncSession,
        learner_id: str,
    ) -> LearnerRiskReportDTO:
        """Evaluates platform behavioral signals for proactive academic and career support."""
        learner_res = await db.execute(select(Learner).where(Learner.id == learner_id))
        learner = learner_res.scalars().first()
        if not learner:
            raise ValueError(f"Learner '{learner_id}' not found.")

        now_utc = datetime.now(timezone.utc)
        risks: List[LearnerRiskItemDTO] = []
        next_actions: List[str] = []

        # 1. Check Repeated Assessment Failure
        re_stmt = (
            select(ReassessmentAttempt)
            .join(LearningPlanModule)
            .join(LearningPlan)
            .where(LearningPlan.learner_id == learner_id)
            .order_by(ReassessmentAttempt.attempted_at.desc())
            .limit(5)
        )
        re_res = await db.execute(re_stmt)
        recent_reassess = re_res.scalars().all()

        stagnant_count = len([r for r in recent_reassess if r.result in ("STAGNANT", "REGRESSED")])
        if stagnant_count >= 2:
            risks.append(
                LearnerRiskItemDTO(
                    risk_type="REPEATED_ASSESSMENT_FAILURE",
                    severity="CRITICAL",
                    detected_at=now_utc,
                    evidence=f"Candidate experienced {stagnant_count} consecutive stagnant or regressed reassessment attempts.",
                    recommended_intervention="Assign step-down prerequisite remediation drills before re-attempting module exam.",
                    action_type="PRACTICE_DRILL",
                )
            )
            next_actions.append("Complete prerequisite drill units to rebuild foundational comprehension.")

        # 2. Check Persistent Skill Gap
        m_stmt = (
            select(LearnerSkillMastery)
            .where(LearnerSkillMastery.learner_id == learner_id)
            .options(selectinload(LearnerSkillMastery.skill))
        )
        m_res = await db.execute(m_stmt)
        masteries = m_res.scalars().all()

        critical_gaps = [
            m for m in masteries
            if (0.70 - m.mastery_probability) > 0.40
        ]
        if critical_gaps:
            comp_names = ", ".join([m.skill.name for m in critical_gaps[:2]])
            risks.append(
                LearnerRiskItemDTO(
                    risk_type="PERSISTENT_SKILL_GAP",
                    severity="WARNING",
                    detected_at=now_utc,
                    evidence=f"Critical mastery deficit remains > 40% on key competencies: {comp_names}.",
                    recommended_intervention="Focus personalized learning plan on scaffolded hands-on practice.",
                    action_type="PRACTICE_DRILL",
                )
            )
            next_actions.append(f"Work through interactive coding drills for {comp_names}.")

        # 3. Check Learning Stagnation (no history updates in 14+ days)
        h_stmt = (
            select(LearnerSkillHistory)
            .where(LearnerSkillHistory.learner_id == learner_id)
            .order_by(LearnerSkillHistory.created_at.desc())
            .limit(1)
        )
        h_res = await db.execute(h_stmt)
        latest_history = h_res.scalars().first()

        if latest_history and (now_utc - latest_history.created_at).days >= 14:
            days_inactive = (now_utc - latest_history.created_at).days
            risks.append(
                LearnerRiskItemDTO(
                    risk_type="LEARNING_STAGNATION",
                    severity="WARNING",
                    detected_at=now_utc,
                    evidence=f"No empirical mastery delta recorded in the last {days_inactive} days.",
                    recommended_intervention="Re-engage with targeted reassessment or fresh practice module.",
                    action_type="REASSESS",
                )
            )
            next_actions.append("Take a short 5-question check-in drill to refresh knowledge tracking.")

        # 4. Check Engagement Decline (zero activities logged recently)
        act_stmt = (
            select(LearningActivity)
            .where(LearningActivity.learner_id == learner_id)
            .order_by(LearningActivity.created_at.desc())
            .limit(1)
        )
        act_res = await db.execute(act_stmt)
        latest_act = act_res.scalars().first()

        if latest_act and (now_utc - latest_act.created_at).days >= 14:
            risks.append(
                LearnerRiskItemDTO(
                    risk_type="ENGAGEMENT_DECLINE",
                    severity="ADVISORY",
                    detected_at=now_utc,
                    evidence="Learning activity logged has decreased significantly over the past two weeks.",
                    recommended_intervention="Review scheduled learning milestones and set a 15-minute daily micro-goal.",
                    action_type="LEARNING_MODULE",
                )
            )

        # 5. Check Career Inactivity (Readiness >= 60% with zero recent applications)
        app_stmt = (
            select(CareerApplication)
            .where(CareerApplication.learner_id == learner_id)
            .order_by(CareerApplication.applied_at.desc())
        )
        app_res = await db.execute(app_stmt)
        apps = app_res.scalars().all()

        readiness_val = (learner.employment_readiness_score or 0) / 100.0
        if readiness_val >= 0.60 and len(apps) == 0:
            risks.append(
                LearnerRiskItemDTO(
                    risk_type="CAREER_INACTIVITY",
                    severity="WARNING",
                    detected_at=now_utc,
                    evidence=f"Candidate readiness is strong ({learner.employment_readiness_score}%), but 0 applications have been submitted.",
                    recommended_intervention="Recommend curated internship openings matching candidate verified skills.",
                    action_type="APPLY_TO_ROLE",
                )
            )
            next_actions.append("Explore matched internship opportunities and submit first aligned application.")

        # Determine overall risk level
        if any(r.severity == "CRITICAL" for r in risks):
            risk_level = "AT_RISK"
        elif any(r.severity == "WARNING" for r in risks):
            risk_level = "NEEDS_SUPPORT"
        else:
            risk_level = "HEALTHY"

        if not next_actions:
            next_actions = ["Continue following active learning plan and maintain regular practice cadence."]

        return LearnerRiskReportDTO(
            learner_id=learner_id,
            risks=risks,
            risk_level=risk_level,
            recommended_next_actions=next_actions,
        )


learner_risk_service = LearnerRiskService()
