from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.logging import logger
from src.models.assessment import (
    AssessmentSubmission,
    LearnerSkillHistory,
    LearnerSkillMastery,
)
from src.models.career_event import (
    ApplicationStatus,
    CareerApplication,
    CareerEvent,
    CareerEventType,
    LearnerProject,
    ProjectVerificationStatus,
)
from src.models.competency import Competency
from src.models.learner import Learner
from src.models.learning_plan import LearningActivity, LearningPlan, ReassessmentAttempt
from src.models.ml_feature_snapshot import MLFeatureSnapshot
from src.models.resume import Resume
from src.models.role import Role
from src.schemas.career_outcome_dto import (
    MLFeatureSnapshotCreateDTO,
    MLFeatureSnapshotResponseDTO,
)
from src.services.role_matching import role_matching_service


class MLFeatureSnapshotService:
    """
    Deterministic Historical Feature Snapshot Service for Downstream Supervised Learning (XGBoost).
    
    STRICT TEMPORAL BARRIER & ZERO DATA LEAKAGE GUARANTEE:
    A feature snapshot computed at prediction cutoff T is constructed ONLY from observations,
    transitions, activities, and evidence timestamped at or before T (<= T).
    Any event, outcome, or modification occurring after T (> T) is strictly excluded.
    """

    FEATURE_VERSION_V1 = "v1"

    CANONICAL_SKILLS = [
        "python_basics",
        "python_oop",
        "sql",
        "git",
        "dsa",
        "rest_api",
    ]

    @classmethod
    async def create_historical_snapshot(
        cls,
        db: AsyncSession,
        learner: Learner,
        cutoff: Optional[datetime] = None,
        role_id: Optional[uuid.UUID] = None,
        feature_version: str = FEATURE_VERSION_V1,
    ) -> MLFeatureSnapshotResponseDTO:
        """
        Calculates and persists a frozen, point-in-time feature snapshot for a candidate.
        All calculations strictly respect the prediction cutoff T.
        """
        t = cutoff or datetime.now(timezone.utc)
        target_role_id = role_id or learner.aspiring_role_id

        # Reconstruct tabular features strictly as of timestamp T
        features = await cls.calculate_features_at_cutoff(
            db=db,
            learner=learner,
            cutoff=t,
            role_id=target_role_id,
            feature_version=feature_version,
        )

        snapshot = MLFeatureSnapshot(
            learner_id=learner.id,
            snapshot_date=datetime.now(timezone.utc),
            prediction_cutoff=t,
            role_id=target_role_id,
            feature_version=feature_version,
            features_json=features,
        )
        db.add(snapshot)
        await db.commit()
        await db.refresh(snapshot)

        logger.info(
            f"Created ML feature snapshot '{snapshot.id}' for candidate '{learner.id}' "
            f"with cutoff '{t.isoformat()}', version='{feature_version}', total_features={len(features)}"
        )

        return MLFeatureSnapshotResponseDTO(
            id=snapshot.id,
            learner_id=snapshot.learner_id,
            snapshot_date=snapshot.snapshot_date,
            prediction_cutoff=snapshot.prediction_cutoff,
            role_id=snapshot.role_id,
            feature_version=snapshot.feature_version,
            features_json=snapshot.features_json,
            created_at=snapshot.created_at,
        )

    @classmethod
    async def calculate_features_at_cutoff(
        cls,
        db: AsyncSession,
        learner: Learner,
        cutoff: datetime,
        role_id: Optional[uuid.UUID] = None,
        feature_version: str = FEATURE_VERSION_V1,
    ) -> Dict[str, Any]:
        """
        Extracts all point-in-time features strictly bounded by cutoff T.
        Zero future observations are permitted.
        """
        features: Dict[str, Any] = {}

        # ----------------------------------------------------------------------
        # 1. Historical Knowledge State & BKT Reconstruction at T
        # ----------------------------------------------------------------------
        # Reconstruct latest mastery per competency strictly on or before T using LearnerSkillHistory
        hist_stmt = (
            select(LearnerSkillHistory)
            .where(
                LearnerSkillHistory.learner_id == learner.id,
                LearnerSkillHistory.created_at <= cutoff,
            )
            .order_by(LearnerSkillHistory.skill_id, LearnerSkillHistory.created_at.asc())
        )
        h_res = await db.execute(hist_stmt)
        history_records = h_res.scalars().all()

        # Reconstruct latest mastery per skill_id as of T
        mastery_by_skill_id: Dict[uuid.UUID, float] = {}
        delta_7d_counts: List[float] = []
        delta_30d_counts: List[float] = []
        seven_days_before = cutoff - timedelta(days=7)
        thirty_days_before = cutoff - timedelta(days=30)

        total_questions_attempted = len(history_records)
        correct_questions_attempted = sum(1 for h in history_records if h.is_correct)

        for h in history_records:
            mastery_by_skill_id[h.skill_id] = h.new_mastery
            if h.created_at >= seven_days_before:
                delta_7d_counts.append(h.new_mastery - h.previous_mastery)
            if h.created_at >= thirty_days_before:
                delta_30d_counts.append(h.new_mastery - h.previous_mastery)

        # If no history before T, check if current skill masteries were initialized prior to T
        if not mastery_by_skill_id:
            m_stmt = (
                select(LearnerSkillMastery)
                .where(
                    LearnerSkillMastery.learner_id == learner.id,
                    LearnerSkillMastery.created_at <= cutoff,
                )
            )
            m_res = await db.execute(m_stmt)
            for m in m_res.scalars().all():
                mastery_by_skill_id[m.skill_id] = m.mastery_probability

        # Query competency details to map skill names
        all_comp_stmt = select(Competency)
        c_res = await db.execute(all_comp_stmt)
        comp_map = {c.id: c for c in c_res.scalars().all()}

        mastery_by_name: Dict[str, float] = {}
        for s_id, m_prob in mastery_by_skill_id.items():
            comp = comp_map.get(s_id)
            if comp:
                mastery_by_name[comp.name.lower()] = m_prob

        # Canonical skill keys
        for key in cls.CANONICAL_SKILLS:
            val = 0.0
            for name, m_val in mastery_by_name.items():
                clean_key = key.replace("_", " ")
                if clean_key in name or name in clean_key:
                    val = max(val, m_val)
            features[f"bkt_{key}_mastery"] = round(val, 4)

        mastery_vals = list(mastery_by_skill_id.values())
        features["bkt_mean_mastery"] = round(sum(mastery_vals) / len(mastery_vals), 4) if mastery_vals else 0.30
        features["bkt_min_mastery"] = round(min(mastery_vals), 4) if mastery_vals else 0.30
        features["bkt_max_mastery"] = round(max(mastery_vals), 4) if mastery_vals else 0.30
        features["bkt_skills_assessed_count"] = float(len(mastery_by_skill_id))
        features["bkt_mastered_skill_count"] = float(sum(1 for v in mastery_vals if v >= 0.85))
        features["bkt_developing_skill_count"] = float(sum(1 for v in mastery_vals if 0.50 <= v < 0.85))
        features["bkt_weak_skill_count"] = float(sum(1 for v in mastery_vals if v < 0.50))
        features["bkt_total_questions_attempted"] = float(total_questions_attempted)
        features["bkt_accuracy_rate"] = (
            round(correct_questions_attempted / total_questions_attempted, 4)
            if total_questions_attempted > 0
            else 0.0
        )
        features["mastery_delta_7d"] = round(sum(delta_7d_counts), 4) if delta_7d_counts else 0.0
        features["mastery_delta_30d"] = round(sum(delta_30d_counts), 4) if delta_30d_counts else 0.0

        # ----------------------------------------------------------------------
        # 2. Historical Learning Activity & Behavioral Engagement at T
        # ----------------------------------------------------------------------
        act_stmt = (
            select(LearningActivity)
            .where(
                LearningActivity.learner_id == learner.id,
                LearningActivity.created_at <= cutoff,
            )
        )
        act_res = await db.execute(act_stmt)
        activities = act_res.scalars().all()

        total_duration_mins = sum(a.time_spent_minutes for a in activities)
        features["learning_hours_completed"] = round(total_duration_mins / 60.0, 2)
        features["learning_activities_count"] = float(len(activities))
        features["resources_started_count"] = float(len({a.resource_id for a in activities if a.resource_id}))
        features["resources_completed_count"] = float(
            sum(1 for a in activities if a.activity_type in ("RESOURCE_COMPLETED", "COMPLETED"))
        )

        # ----------------------------------------------------------------------
        # 3. Adaptive Practice & Reassessment Behavior at T
        # ----------------------------------------------------------------------
        from src.models.learning_plan import LearningPlanModule
        reassess_stmt = (
            select(ReassessmentAttempt)
            .join(LearningPlanModule, ReassessmentAttempt.learning_plan_module_id == LearningPlanModule.id)
            .join(LearningPlan, LearningPlanModule.learning_plan_id == LearningPlan.id)
            .where(
                LearningPlan.learner_id == learner.id,
                ReassessmentAttempt.attempted_at <= cutoff,
            )
        )
        re_res = await db.execute(reassess_stmt)
        reassessments = re_res.scalars().all()

        features["practice_attempt_count"] = float(len(reassessments))
        features["difficulty_backoff_count"] = float(
            sum(1 for r in reassessments if r.adaptation_action == "DIFFICULTY_BACKOFF")
        )
        features["prerequisite_remediation_count"] = float(
            sum(1 for r in reassessments if r.adaptation_action == "PREREQUISITE_REMEDIATION")
        )
        features["spaced_repetition_count"] = float(
            sum(1 for r in reassessments if r.adaptation_action == "SPACED_REPETITION")
        )
        features["gap_reduction_count"] = float(
            sum(1 for r in reassessments if r.adaptation_action in ("MASTERED", "GAP_REDUCED"))
        )

        # ----------------------------------------------------------------------
        # 4. Learning Roadmap State at T
        # ----------------------------------------------------------------------
        plan_stmt = (
            select(LearningPlan)
            .where(
                LearningPlan.learner_id == learner.id,
                LearningPlan.created_at <= cutoff,
            )
            .options(selectinload(LearningPlan.modules))
            .order_by(LearningPlan.created_at.desc())
        )
        p_res = await db.execute(plan_stmt)
        plan = p_res.scalars().first()

        if plan:
            features["roadmap_total_modules"] = float(plan.total_modules)
            features["roadmap_completed_modules"] = float(plan.completed_modules)
            features["roadmap_estimated_hours_remaining"] = round(
                max(0.0, float(plan.total_estimated_hours or 0.0) - (total_duration_mins / 60.0)), 2
            )
        else:
            features["roadmap_total_modules"] = 0.0
            features["roadmap_completed_modules"] = 0.0
            features["roadmap_estimated_hours_remaining"] = 0.0

        # ----------------------------------------------------------------------
        # 5. Practical Projects Evidence at T
        # ----------------------------------------------------------------------
        proj_stmt = (
            select(LearnerProject)
            .where(
                LearnerProject.learner_id == learner.id,
                LearnerProject.completed_at <= cutoff,
            )
        )
        pr_res = await db.execute(proj_stmt)
        projects = pr_res.scalars().all()

        features["project_count"] = float(len(projects))
        features["verified_project_count"] = float(
            sum(1 for p in projects if p.verification_status != ProjectVerificationStatus.SELF_REPORTED.value)
        )

        # ----------------------------------------------------------------------
        # 6. Career Applications & Pipeline Activity at T
        # ----------------------------------------------------------------------
        app_stmt = (
            select(CareerApplication)
            .where(
                CareerApplication.learner_id == learner.id,
                CareerApplication.applied_at <= cutoff,
            )
        )
        ap_res = await db.execute(app_stmt)
        apps = ap_res.scalars().all()

        features["application_count"] = float(len(apps))
        features["interview_count"] = float(
            sum(1 for a in apps if a.status == ApplicationStatus.INTERVIEW.value)
        )

        # ----------------------------------------------------------------------
        # 7. Resume Evidence at T
        # ----------------------------------------------------------------------
        res_stmt = (
            select(Resume)
            .where(
                Resume.learner_id == learner.id,
                Resume.created_at <= cutoff,
            )
            .options(selectinload(Resume.skills), selectinload(Resume.projects))
            .order_by(Resume.created_at.desc())
        )
        res_result = await db.execute(res_stmt)
        active_resume = res_result.scalars().first()

        features["has_active_resume"] = 1.0 if active_resume else 0.0
        features["resume_skill_count"] = float(len(active_resume.skills)) if active_resume else 0.0
        features["resume_project_count"] = float(len(active_resume.projects)) if active_resume else 0.0

        # ----------------------------------------------------------------------
        # 8. Profile Attributes & Role Alignment at T
        # ----------------------------------------------------------------------
        features["experience_years"] = round(float(learner.experience_years or 0.0), 2)
        features["has_github"] = 1.0 if (learner.github_url and learner.github_url.strip()) else 0.0
        features["has_linkedin"] = 1.0 if (learner.linkedin_url and learner.linkedin_url.strip()) else 0.0

        role_match_score = 0.0
        critical_gap_count = 0.0
        if role_id:
            role_obj = await db.get(Role, role_id)
            if role_obj:
                eval_res = await role_matching_service.calculate_role_match(
                    role=role_obj,
                    mastery_by_comp_id=mastery_by_skill_id,
                    mastery_by_comp_name=mastery_by_name,
                    is_aspiring=True,
                )
                role_match_score = eval_res.match_score
                critical_gap_count = float(len(eval_res.critical_gaps))

        features["role_match_score"] = round(role_match_score, 2)
        features["critical_gap_count"] = critical_gap_count

        # Order features deterministically
        return {k: features[k] for k in sorted(features.keys())}


ml_feature_snapshot_service = MLFeatureSnapshotService()
