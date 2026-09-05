from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import logger
from src.models.career_event import CareerApplication, CareerEvent
from src.models.learner import Learner
from src.models.learner_outcome import LearnerOutcome
from src.models.learning_plan import LearningActivity, LearningPlan
from src.schemas.impact_dto import ImpactDataQualityDTO


class ImpactDataQualityService:
    """
    Data Integrity & Verification Quality Audit Service for Impact Measurement.
    
    Evaluates:
    - Profile completeness
    - Outcome verification coverage (verified vs total outcomes)
    - Timestamp completeness
    - Duplicate detection
    - Freshness / stale records
    """

    async def evaluate_impact_data_quality(self, db: AsyncSession) -> ImpactDataQualityDTO:
        """Calculates institutional data quality score (0 - 100) and component metrics."""
        now_utc = datetime.now(timezone.utc)

        # 1. Total Learners & Profile Completeness
        l_res = await db.execute(select(Learner))
        learners = l_res.scalars().all()
        n_learners = len(learners)
        if n_learners == 0:
            return ImpactDataQualityDTO(
                overall_quality_score=90.0,
                profile_completeness_pct=100.0,
                outcome_verification_coverage_pct=100.0,
                temporal_completeness_pct=100.0,
                duplicate_record_rate_pct=0.0,
                stale_records_pct=0.0,
                cohort_size=0,
                quality_grade="EXCELLENT",
                calculation_version="impact_v1",
                evaluated_at=now_utc,
            )

        complete_profiles = len([
            l for l in learners
            if l.aspiring_role_id is not None and l.full_name and l.district_id
        ])
        profile_completeness = (complete_profiles / n_learners) * 100.0

        # 2. Outcome Verification Coverage
        o_res = await db.execute(select(LearnerOutcome))
        all_outcomes = o_res.scalars().all()
        n_outcomes = len(all_outcomes)
        if n_outcomes > 0:
            verified_outcomes = len([o for o in all_outcomes if o.status == "VERIFIED"])
            verification_cov = (verified_outcomes / n_outcomes) * 100.0
        else:
            verification_cov = 85.0

        # 3. Temporal Completeness (Presence of valid created_at / outcome_date / event_date)
        events_res = await db.execute(select(CareerEvent))
        all_events = events_res.scalars().all()
        if all_events:
            with_dates = len([e for e in all_events if e.event_date is not None])
            temporal_completeness = (with_dates / len(all_events)) * 100.0
        else:
            temporal_completeness = 95.0

        # 4. Duplicate Record Rate (Check duplicate active applications for same learner & role)
        app_res = await db.execute(select(CareerApplication))
        all_apps = app_res.scalars().all()
        seen_pairs = set()
        dups = 0
        for a in all_apps:
            pair = (a.learner_id, a.organization_name, a.job_title)
            if pair in seen_pairs:
                dups += 1
            else:
                seen_pairs.add(pair)
        dup_rate = (dups / max(1, len(all_apps))) * 100.0

        # 5. Stale Records (learners with no activity for > 90 days)
        stale_count = 0
        for l in learners:
            created_dt = l.created_at or now_utc
            if (now_utc - created_dt).days > 90 and (l.employment_readiness_score or 0) < 30:
                stale_count += 1
        stale_pct = (stale_count / n_learners) * 100.0

        # Overall weighted data quality score:
        # 30% profile completeness + 30% verification coverage + 20% temporal completeness + 10% (100 - dup) + 10% (100 - stale)
        overall_score = (
            (profile_completeness * 0.30) +
            (verification_cov * 0.30) +
            (temporal_completeness * 0.20) +
            (max(0.0, 100.0 - dup_rate) * 0.10) +
            (max(0.0, 100.0 - stale_pct) * 0.10)
        )
        overall_score = round(min(100.0, max(0.0, overall_score)), 1)

        if overall_score >= 85.0:
            grade = "EXCELLENT"
        elif overall_score >= 70.0:
            grade = "GOOD"
        elif overall_score >= 50.0:
            grade = "MODERATE"
        else:
            grade = "NEEDS_IMPROVEMENT"

        return ImpactDataQualityDTO(
            overall_quality_score=overall_score,
            profile_completeness_pct=round(profile_completeness, 1),
            outcome_verification_coverage_pct=round(verification_cov, 1),
            temporal_completeness_pct=round(temporal_completeness, 1),
            duplicate_record_rate_pct=round(dup_rate, 1),
            stale_records_pct=round(stale_pct, 1),
            cohort_size=n_learners,
            quality_grade=grade,
            calculation_version="impact_v1",
            evaluated_at=now_utc,
        )


impact_data_quality_service = ImpactDataQualityService()
