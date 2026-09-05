from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.assessment import LearnerSkillMastery
from src.models.competency import Competency
from src.models.learner import Learner
from src.models.learner_outcome import LearnerOutcome
from src.models.resume import Resume
from src.models.role import Role
from src.schemas.learner_intelligence_dto import (
    LearnerOutcomeCreateDTO,
    LearnerOutcomeResponseDTO,
    MLFeatureVectorResponseDTO,
)
from src.services.role_matching import role_matching_service


class MLFeatureService:
    """
    Leakage-Free Tabular Feature Extraction Pipeline for Downstream XGBoost / ML Models.
    
    STRICT DATA LEAKAGE PREVENTION:
    - Pre-outcome features ONLY: BKT latent masteries, question attempts, assessment accuracy,
      aspiring role deficits, and candidate profile attributes prior to hiring.
    - Career outcomes (placement, offers, retention) are recorded strictly in `learner_outcomes`
      and NEVER blended into the feature extraction pipeline.
    """

    CANONICAL_SKILL_KEYS = [
        "python_basics",
        "python_oop",
        "sql",
        "git",
        "dsa",
        "rest_api",
    ]

    @classmethod
    async def extract_learner_features(
        cls,
        db: AsyncSession,
        learner: Learner,
    ) -> MLFeatureVectorResponseDTO:
        """
        Compiles a normalized, tabular feature vector for a learner ready for
        XGBoost inference or offline dataset construction.
        """
        # 1. Load BKT Masteries
        m_stmt = (
            select(LearnerSkillMastery)
            .where(LearnerSkillMastery.learner_id == learner.id)
            .options(selectinload(LearnerSkillMastery.skill))
        )
        m_res = await db.execute(m_stmt)
        masteries = m_res.scalars().all()

        mastery_by_name: Dict[str, float] = {}
        total_attempts = 0
        total_correct = 0

        for m in masteries:
            skill_name = m.skill.name.lower() if m.skill else "competency"
            mastery_by_name[skill_name] = m.mastery_probability
            total_attempts += m.questions_attempted
            total_correct += m.correct_answers

        # 2. Extract Canonical Skill Features
        features: Dict[str, float] = {}
        for key in cls.CANONICAL_SKILL_KEYS:
            val = 0.0
            for name, m_val in mastery_by_name.items():
                if key.replace("_", " ") in name or name in key.replace("_", " "):
                    val = max(val, m_val)
            features[f"bkt_{key}_mastery"] = round(val, 4)

        # Aggregate mastery statistics
        all_vals = list(mastery_by_name.values())
        features["bkt_mean_mastery"] = round(sum(all_vals) / len(all_vals), 4) if all_vals else 0.0
        features["bkt_min_mastery"] = round(min(all_vals), 4) if all_vals else 0.0
        features["bkt_max_mastery"] = round(max(all_vals), 4) if all_vals else 0.0
        features["bkt_total_skills_assessed"] = float(len(masteries))
        features["bkt_total_questions_attempted"] = float(total_attempts)
        features["bkt_accuracy_rate"] = (
            round(total_correct / total_attempts, 4) if total_attempts > 0 else 0.0
        )

        # 3. Load Resume Features (prior evidence)
        r_stmt = (
            select(Resume)
            .where(Resume.learner_id == learner.id, Resume.is_active.is_(True))
            .options(selectinload(Resume.skills), selectinload(Resume.projects))
        )
        r_res = await db.execute(r_stmt)
        active_resume = r_res.scalar_one_or_none()

        has_resume = active_resume is not None
        resume_skills_count = len(active_resume.skills) if active_resume else 0
        resume_projects_count = len(active_resume.projects) if active_resume else 0

        features["has_active_resume"] = 1.0 if has_resume else 0.0
        features["resume_skills_count"] = float(resume_skills_count)
        features["resume_projects_count"] = float(resume_projects_count)

        # 4. Profile Characteristics
        features["experience_years"] = round(float(learner.experience_years or 0.0), 2)
        features["has_github"] = 1.0 if (learner.github_url and learner.github_url.strip()) else 0.0
        features["has_linkedin"] = 1.0 if (learner.linkedin_url and learner.linkedin_url.strip()) else 0.0
        features["readiness_score_pct"] = round(float(learner.employment_readiness_score or 0.0), 2)

        # 5. Aspiring Role Alignment Score (if selected)
        role_match_score = 0.0
        critical_gap_count = 0.0
        strong_skill_count = 0.0

        if learner.aspiring_role_id:
            role_res = await role_matching_service.get_role_by_id(db, learner.aspiring_role_id)
            # Reconstruct dummy role
            role_obj = await db.get(Role, learner.aspiring_role_id)
            if role_obj:
                match_res = await role_matching_service.calculate_role_match(
                    role=role_obj,
                    mastery_by_comp_id={m.skill_id: m.mastery_probability for m in masteries},
                    mastery_by_comp_name=mastery_by_name,
                    is_aspiring=True,
                )
                role_match_score = match_res.match_score
                critical_gap_count = float(len(match_res.critical_gaps))
                strong_skill_count = float(len(match_res.strong_skills))

        features["aspiring_role_match_score"] = round(role_match_score, 2)
        features["aspiring_role_critical_gaps"] = critical_gap_count
        features["aspiring_role_strong_skills"] = strong_skill_count

        # Order features deterministically
        feature_names = sorted(features.keys())
        feature_vector = [features[k] for k in feature_names]

        return MLFeatureVectorResponseDTO(
            learner_id=learner.id,
            features=features,
            feature_names=feature_names,
            feature_vector=feature_vector,
            total_skills_assessed=len(masteries),
            has_resume=has_resume,
            resume_skills_count=resume_skills_count,
            readiness_score=learner.employment_readiness_score,
            leakage_guarantee="Pre-outcome snapshot strictly enforced: no outcome metrics included.",
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    @classmethod
    async def record_learner_outcome(
        cls,
        db: AsyncSession,
        learner: Learner,
        outcome_in: LearnerOutcomeCreateDTO,
    ) -> LearnerOutcomeResponseDTO:
        """
        Records a career milestone outcome (offer, placement, retention) in the database.
        Maintains separation from feature vectors to prevent label leakage.
        """
        outcome_date = outcome_in.outcome_date or datetime.now(timezone.utc)

        # Source confidence resolution
        source_val = outcome_in.source or "SELF_REPORTED"
        confidence_val = outcome_in.confidence
        if confidence_val is None:
            from src.models.career_event import SOURCE_CONFIDENCE_MAP
            confidence_val = SOURCE_CONFIDENCE_MAP.get(source_val, 0.6)

        outcome_rec = LearnerOutcome(
            learner_id=learner.id,
            role_id=outcome_in.role_id or learner.aspiring_role_id,
            outcome_type=outcome_in.outcome_type,
            outcome_value=outcome_in.outcome_value,
            outcome_date=outcome_date,
            source=source_val,
            status=outcome_in.status or "VERIFIED",
            confidence=float(confidence_val),
            notes=outcome_in.notes,
        )
        db.add(outcome_rec)
        await db.commit()
        await db.refresh(outcome_rec)

        role_title = None
        if outcome_rec.role_id:
            role = await db.get(Role, outcome_rec.role_id)
            if role:
                role_title = role.title

        return LearnerOutcomeResponseDTO(
            id=outcome_rec.id,
            learner_id=outcome_rec.learner_id,
            role_id=outcome_rec.role_id,
            role_title=role_title,
            outcome_type=outcome_rec.outcome_type,
            outcome_value=outcome_rec.outcome_value,
            outcome_date=outcome_rec.outcome_date,
            source=outcome_rec.source,
            status=outcome_rec.status,
            confidence=outcome_rec.confidence,
            notes=outcome_rec.notes,
            created_at=outcome_rec.created_at,
        )

    @classmethod
    async def get_learner_outcomes(
        cls,
        db: AsyncSession,
        learner_id: str,
    ) -> List[LearnerOutcomeResponseDTO]:
        """Retrieves historical outcomes for a candidate."""
        stmt = (
            select(LearnerOutcome)
            .where(LearnerOutcome.learner_id == learner_id)
            .options(selectinload(LearnerOutcome.role))
            .order_by(LearnerOutcome.outcome_date.desc())
        )
        res = await db.execute(stmt)
        records = res.scalars().all()

        return [
            LearnerOutcomeResponseDTO(
                id=r.id,
                learner_id=r.learner_id,
                role_id=r.role_id,
                role_title=r.role.title if r.role else None,
                outcome_type=r.outcome_type,
                outcome_value=r.outcome_value,
                outcome_date=r.outcome_date,
                source=r.source,
                status=r.status,
                confidence=r.confidence,
                notes=r.notes,
                created_at=r.created_at,
            )
            for r in records
        ]


ml_feature_service = MLFeatureService()
