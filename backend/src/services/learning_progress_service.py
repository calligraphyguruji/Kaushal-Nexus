from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import NotFoundException
from src.core.logging import logger
from src.models.assessment import LearnerSkillHistory, LearnerSkillMastery
from src.models.competency import Competency
from src.models.learner import Learner
from src.models.learning_plan import LearningActivity, LearningPlan, LearningPlanModule
from src.models.role import Role
from src.schemas.adaptive_learning_dto import (
    LearningActivityCreateDTO,
    LearningActivityDTO,
    LearningProgressDTO,
)
from src.services.role_matching import RoleMatchingService


class LearningProgressService:
    """
    Service tracking learner study/practice activities and summarizing overall
    adaptive progress, skill milestones, and remaining critical gaps.
    """

    @classmethod
    async def record_learning_activity(
        cls, db: AsyncSession, learner_id: str, req: LearningActivityCreateDTO
    ) -> LearningActivityDTO:
        """
        Records a candidate's learning activity (reading docs, watching video, etc.).
        RULE: Learning activity alone NEVER alters BKT mastery.
        """
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Learner '{learner_id}' not found.")

        activity = LearningActivity(
            learner_id=learner_id,
            module_id=req.module_id,
            resource_id=req.resource_id,
            activity_type=req.activity_type,
            time_spent_minutes=max(0, req.time_spent_minutes),
        )
        db.add(activity)
        await db.commit()
        await db.refresh(activity)

        logger.info(
            f"Learning activity recorded for learner '{learner_id}': {req.activity_type} ({req.time_spent_minutes}m)"
        )
        return LearningActivityDTO.model_validate(activity)

    @classmethod
    async def get_learning_activities(
        cls, db: AsyncSession, learner_id: str, limit: int = 50
    ) -> List[LearningActivityDTO]:
        """Returns recent learning activities for authenticated candidate."""
        q = await db.execute(
            select(LearningActivity)
            .where(LearningActivity.learner_id == learner_id)
            .order_by(LearningActivity.created_at.desc())
            .limit(limit)
        )
        activities = q.scalars().all()
        return [LearningActivityDTO.model_validate(a) for a in activities]

    @classmethod
    async def get_learning_progress(
        cls, db: AsyncSession, learner_id: str
    ) -> LearningProgressDTO:
        """
        Aggregates overall remediation progress, completed vs remaining hours,
        mastered skills count, remaining critical gaps, and recent BKT deltas.
        """
        # Fetch candidate and aspiring role
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Learner '{learner_id}' not found.")

        role_title = None
        role_match_pct = 0.0
        if learner.aspiring_role_id:
            role_q = await db.execute(
                select(Role).where(Role.id == learner.aspiring_role_id)
            )
            role = role_q.scalar_one_or_none()
            if role:
                role_title = role.title
                try:
                    match_res = await RoleMatchingService.calculate_single_role_match(
                        db=db, learner_id=learner_id, role=role
                    )
                    role_match_pct = match_res.match_score
                except Exception as e:
                    logger.warning(f"Could not compute role match: {e}")

        # Fetch active learning plan modules
        plan_q = await db.execute(
            select(LearningPlan)
            .options(
                selectinload(LearningPlan.modules).selectinload(LearningPlanModule.competency)
            )
            .where(
                LearningPlan.learner_id == learner_id,
                LearningPlan.status.in_(["ACTIVE", "ADAPTING", "COMPLETED"]),
            )
            .order_by(LearningPlan.generated_at.desc())
        )
        plan = plan_q.scalars().first()

        mastered_count = 0
        developing_count = 0
        critical_gaps_count = 0
        total_hours = 0.0
        remaining_hours = 0.0
        completed_hours = 0.0
        progress_pct = 0.0

        if plan and plan.modules:
            total_mods = len(plan.modules)
            for m in plan.modules:
                total_hours += m.estimated_hours
                if m.status == "MASTERED" or m.current_mastery >= m.target_mastery:
                    mastered_count += 1
                    completed_hours += m.estimated_hours
                else:
                    remaining_hours += m.estimated_hours
                    if m.current_mastery >= 0.40:
                        developing_count += 1
                    if m.gap > 0.25 or m.priority_score >= 0.50:
                        critical_gaps_count += 1

            if total_mods > 0:
                progress_pct = round((mastered_count / total_mods) * 100.0, 1)

        # Query recent BKT updates from history
        history_q = await db.execute(
            select(LearnerSkillHistory, Competency)
            .join(Competency, Competency.id == LearnerSkillHistory.skill_id)
            .where(LearnerSkillHistory.learner_id == learner_id)
            .order_by(LearnerSkillHistory.created_at.desc())
            .limit(10)
        )
        recent_updates = []
        for hist, comp in history_q.all():
            recent_updates.append({
                "competency_code": comp.code,
                "competency_name": comp.name,
                "prior_mastery": round(hist.previous_mastery, 3),
                "posterior_mastery": round(hist.new_mastery, 3),
                "delta": round(hist.new_mastery - hist.previous_mastery, 3),
                "is_correct": hist.is_correct,
                "timestamp": hist.created_at.isoformat(),
            })

        return LearningProgressDTO(
            learner_id=learner_id,
            target_role_title=role_title,
            role_match_percentage=round(role_match_pct, 1),
            overall_progress_pct=progress_pct,
            skills_mastered_count=mastered_count,
            skills_developing_count=developing_count,
            remaining_critical_gaps_count=critical_gaps_count,
            total_hours_completed=round(completed_hours, 1),
            estimated_hours_remaining=round(remaining_hours, 1),
            recent_bkt_updates=recent_updates,
        )
