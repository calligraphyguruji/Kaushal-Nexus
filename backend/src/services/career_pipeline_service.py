from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid
import numpy as np
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.logging import logger
from src.models.assessment import AssessmentSubmission, LearnerSkillMastery
from src.models.career_event import CareerApplication, LearnerProject
from src.models.learner import Learner
from src.models.learner_outcome import LearnerOutcome
from src.models.learning_plan import LearningActivity, LearningPlan, LearningPlanModule
from src.schemas.impact_dto import (
    CareerOutcomeFunnelDTO,
    CareerOutcomeFunnelStageDTO,
)


class CareerPipelineService:
    """
    Career Outcome Funnel & Pipeline Velocity Intelligence Engine.
    
    Tracks candidates through the 10 longitudinal milestones:
      Enrolled -> Profile -> Assessment -> Learning Started -> Learning Completed
      -> Projects -> Applications -> Interviews -> Offers -> Verified Placement
    """

    async def get_career_outcome_funnel(
        self,
        db: AsyncSession,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> CareerOutcomeFunnelDTO:
        """Computes the end-to-end milestone conversion funnel with drop-off detection."""
        # 1. Total Enrolled Learners
        l_res = await db.execute(select(Learner))
        all_learners = l_res.scalars().all()
        n_total = len(all_learners)
        if n_total == 0:
            n_total = 1

        # 2. Profile Complete (has aspiring role and experience/education)
        n_profile = len([
            l for l in all_learners
            if l.aspiring_role_id is not None or l.bio or l.institution or l.graduation_year
        ])

        # 3. Assessment Complete
        m_res = await db.execute(select(func.distinct(LearnerSkillMastery.learner_id)))
        n_assessment = len(m_res.scalars().all())

        # 4. Learning Started (has learning plan or activity)
        act_res = await db.execute(select(func.distinct(LearningActivity.learner_id)))
        active_act_learners = set(act_res.scalars().all())
        plan_res = await db.execute(select(func.distinct(LearningPlan.learner_id)))
        active_plan_learners = set(plan_res.scalars().all())
        n_learning_started = len(active_act_learners | active_plan_learners)

        # 5. Learning Completed (has >= 1 mastered module)
        mod_res = await db.execute(
            select(func.distinct(LearningPlan.learner_id))
            .join(LearningPlanModule, LearningPlan.id == LearningPlanModule.learning_plan_id)
            .where(
                (LearningPlanModule.status == "MASTERED") |
                (LearningPlanModule.current_mastery >= LearningPlanModule.target_mastery)
            )
        )
        n_learning_completed = len(mod_res.scalars().all())

        # 6. Projects Completed
        proj_res = await db.execute(select(func.distinct(LearnerProject.learner_id)))
        n_projects = len(proj_res.scalars().all())

        # 7. Applications
        app_res = await db.execute(select(CareerApplication))
        all_apps = app_res.scalars().all()
        app_learners = {a.learner_id for a in all_apps}
        n_applications = len(app_learners)

        # 8. Interviews
        int_learners = {
            a.learner_id for a in all_apps
            if a.status in ("INTERVIEW_SCHEDULED", "INTERVIEWING", "OFFERED", "ACCEPTED")
        }
        n_interviews = len(int_learners)

        # 9. Offers
        off_learners = {a.learner_id for a in all_apps if a.status in ("OFFERED", "ACCEPTED")}
        n_offers = len(off_learners)

        # 10. Verified Placement
        out_res = await db.execute(
            select(LearnerOutcome)
            .where(
                LearnerOutcome.status == "VERIFIED",
                LearnerOutcome.outcome_type.in_([
                    "INTERNSHIP_ACCEPTED", "INTERNSHIP_PLACED", "EMPLOYMENT_ACCEPTED", "PLACED", "SELF_EMPLOYED"
                ]),
            )
        )
        placed_learners = {o.learner_id for o in out_res.scalars().all()}
        n_placement = len(placed_learners)

        stages_data = [
            ("LEARNERS", "Enrolled Candidates", n_total),
            ("PROFILE_COMPLETE", "Profile & Target Role", n_profile),
            ("ASSESSMENT_COMPLETE", "Diagnostic Assessment", n_assessment),
            ("LEARNING_STARTED", "Adaptive Learning Started", n_learning_started),
            ("LEARNING_COMPLETED", "Curriculum Module Mastery", n_learning_completed),
            ("PROJECTS_SUBMITTED", "Portfolio Projects", n_projects),
            ("APPLICATIONS_SUBMITTED", "Target Applications", n_applications),
            ("INTERVIEWS_REACHED", "Interview Stages", n_interviews),
            ("OFFERS_EXTENDED", "Formal Offers Extended", n_offers),
            ("VERIFIED_PLACEMENT", "Verified Placements", n_placement),
        ]

        stage_dtos: List[CareerOutcomeFunnelStageDTO] = []
        prev_count = n_total
        largest_dropoff_stage = ""
        largest_dropoff_pct = 0.0

        for idx, (stage_code, stage_label, count) in enumerate(stages_data):
            overall_rate = round((count / n_total) * 100.0, 1)
            stage_rate = round((count / prev_count) * 100.0, 1) if prev_count > 0 else 0.0
            dropoff_pct = 100.0 - stage_rate

            is_major = False
            if idx > 0 and dropoff_pct > largest_dropoff_pct:
                largest_dropoff_pct = round(dropoff_pct, 1)
                largest_dropoff_stage = stage_label

            if idx > 0 and dropoff_pct >= 40.0:
                is_major = True

            stage_dtos.append(
                CareerOutcomeFunnelStageDTO(
                    stage=stage_code,
                    stage_name=stage_label,
                    count=count,
                    stage_conversion_rate=stage_rate,
                    overall_conversion_rate=overall_rate,
                    is_major_dropoff=is_major,
                )
            )
            prev_count = max(1, count)

        now_utc = datetime.now(timezone.utc)
        obs_start = start_date.strftime("%Y-%m-%d") if start_date else (now_utc.replace(month=1, day=1) if now_utc.month > 1 else now_utc).strftime("%Y-%m-%d")
        obs_end = end_date.strftime("%Y-%m-%d") if end_date else now_utc.strftime("%Y-%m-%d")

        return CareerOutcomeFunnelDTO(
            stages=stage_dtos,
            total_cohort_size=n_total,
            largest_dropoff_stage=largest_dropoff_stage or "Portfolio Projects",
            largest_dropoff_pct=largest_dropoff_pct,
            observation_period={"start": obs_start, "end": obs_end},
        )


career_pipeline_service = CareerPipelineService()
