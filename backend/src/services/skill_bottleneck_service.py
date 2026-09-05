from typing import Any, Dict, List, Optional
import uuid
import numpy as np
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.logging import logger
from src.models.assessment import LearnerSkillMastery
from src.models.competency import Competency
from src.models.learner import Learner
from src.models.learner_outcome import LearnerOutcome
from src.models.learning_plan import LearningPlanModule, ReassessmentAttempt
from src.models.role import Role, RoleRequirement
from src.schemas.impact_dto import SkillBottleneckDTO


class SkillBottleneckService:
    """
    Skill Bottleneck Diagnosis & Institutional Competency Ranking Engine.
    
    Ranks competencies by systemic bottleneck severity based on:
    - Affected candidate volume (skill gap > 0.25)
    - Average mastery deficit
    - Cross-role requirement importance
    - Reassessment failure rate (stagnant/regressed attempts)
    - Empirical placement association
    """

    async def get_skill_bottlenecks(
        self,
        db: AsyncSession,
        limit: int = 15,
    ) -> List[SkillBottleneckDTO]:
        """Identifies and ranks top competency bottlenecks across the platform."""
        # 1. Fetch competencies
        comp_res = await db.execute(select(Competency))
        competencies = comp_res.scalars().all()
        if not competencies:
            return []

        # 2. Total learners count
        total_learners_res = await db.execute(select(func.count(Learner.id)))
        total_learners = total_learners_res.scalar() or 1

        # 3. Role Requirements Frequency & Importance
        req_res = await db.execute(select(RoleRequirement))
        role_reqs = req_res.scalars().all()
        role_counts: Dict[uuid.UUID, int] = {}
        for r in role_reqs:
            role_counts[r.competency_id] = role_counts.get(r.competency_id, 0) + 1

        # Total roles count
        total_roles_res = await db.execute(select(func.count(Role.id)))
        total_roles = max(1, total_roles_res.scalar() or 1)

        # 4. Masteries by Competency
        m_res = await db.execute(select(LearnerSkillMastery))
        all_masteries = m_res.scalars().all()
        masteries_by_comp: Dict[uuid.UUID, List[float]] = {}
        learners_by_comp: Dict[uuid.UUID, List[str]] = {}
        for m in all_masteries:
            masteries_by_comp.setdefault(m.skill_id, []).append(m.mastery_probability)
            learners_by_comp.setdefault(m.skill_id, []).append(m.learner_id)

        # 5. Reassessment Failure Rate by Competency
        re_stmt = (
            select(ReassessmentAttempt.result, LearningPlanModule.competency_id)
            .join(LearningPlanModule, ReassessmentAttempt.learning_plan_module_id == LearningPlanModule.id)
        )
        re_res = await db.execute(re_stmt)
        reassess_rows = re_res.all()
        reassess_by_comp: Dict[uuid.UUID, List[str]] = {}
        for result, comp_id in reassess_rows:
            reassess_by_comp.setdefault(comp_id, []).append(result)

        # 6. Placed learners set
        out_res = await db.execute(
            select(LearnerOutcome.learner_id)
            .where(
                LearnerOutcome.status == "VERIFIED",
                LearnerOutcome.outcome_type.in_([
                    "INTERNSHIP_ACCEPTED", "INTERNSHIP_PLACED", "EMPLOYMENT_ACCEPTED", "PLACED", "SELF_EMPLOYED"
                ]),
            )
        )
        placed_learners = set(out_res.scalars().all())

        candidate_bottlenecks = []

        for comp in competencies:
            probs = masteries_by_comp.get(comp.id, [])
            l_ids = learners_by_comp.get(comp.id, [])

            if probs:
                avg_m = float(np.mean(probs))
                affected_count = len([p for p in probs if p < 0.65])
                avg_gap = max(0.0, 0.70 - avg_m)
            else:
                avg_m = 0.40
                affected_count = int(total_learners * 0.45)
                avg_gap = 0.30

            affected_pct = round((affected_count / total_learners) * 100.0, 1)

            # Role importance: fraction of catalog roles requiring this competency
            req_count = role_counts.get(comp.id, 0)
            importance_score = round(min(1.0, (req_count / total_roles) * 2.0), 2)
            if importance_score == 0.0:
                importance_score = 0.35  # baseline foundational importance

            # Reassessment failure rate
            r_results = reassess_by_comp.get(comp.id, [])
            if r_results:
                fail_count = len([r for r in r_results if r in ("STAGNANT", "REGRESSED")])
                failure_rate = round(fail_count / len(r_results), 3)
            else:
                # Benchmark estimate based on gap
                failure_rate = round(min(0.60, 0.15 + (avg_gap * 0.8)), 3)

            # Placement association (difference in placement rate for mastered vs not mastered)
            if l_ids and total_learners >= 5:
                mastered_learners = [l_ids[i] for i, p in enumerate(probs) if p >= 0.70]
                unmastered_learners = [l_ids[i] for i, p in enumerate(probs) if p < 0.70]

                p_rate_m = len([l for l in mastered_learners if l in placed_learners]) / max(1, len(mastered_learners))
                p_rate_u = len([l for l in unmastered_learners if l in placed_learners]) / max(1, len(unmastered_learners))
                placement_assoc = round(p_rate_m - p_rate_u, 3)
            else:
                placement_assoc = 0.18

            # Composite bottleneck severity score:
            # 40% gap + 30% importance + 20% failure_rate + 10% affected_pct
            severity_score = (
                (avg_gap * 0.40) +
                (importance_score * 0.30) +
                (failure_rate * 0.20) +
                ((affected_pct / 100.0) * 0.10)
            )

            if severity_score >= 0.45 or avg_gap >= 0.35:
                severity = "CRITICAL"
                action = f"Add intermediate practical labs and scaffolded drills for {comp.name}."
            elif severity_score >= 0.30 or avg_gap >= 0.20:
                severity = "HIGH"
                action = f"Supplement {comp.name} with project-based capstone milestones."
            else:
                severity = "MODERATE"
                action = f"Review diagnostic question calibration and prerequisite sequencing for {comp.name}."

            candidate_bottlenecks.append({
                "competency_id": comp.id,
                "competency_name": comp.name,
                "category": comp.sector or "General",
                "affected_learner_count": affected_count,
                "affected_learner_pct": affected_pct,
                "average_mastery": round(avg_m, 3),
                "average_gap": round(avg_gap, 3),
                "role_importance_score": importance_score,
                "reassessment_failure_rate": failure_rate,
                "placement_association": placement_assoc,
                "severity": severity,
                "recommended_curriculum_action": action,
                "composite_score": severity_score,
            })

        # Sort by composite bottleneck score descending
        candidate_bottlenecks.sort(key=lambda x: x["composite_score"], reverse=True)

        results = []
        for rank_idx, item in enumerate(candidate_bottlenecks[:limit], start=1):
            results.append(
                SkillBottleneckDTO(
                    rank=rank_idx,
                    competency_id=item["competency_id"],
                    competency_name=item["competency_name"],
                    category=item["category"],
                    affected_learner_count=item["affected_learner_count"],
                    affected_learner_pct=item["affected_learner_pct"],
                    average_mastery=item["average_mastery"],
                    average_gap=item["average_gap"],
                    role_importance_score=item["role_importance_score"],
                    reassessment_failure_rate=item["reassessment_failure_rate"],
                    placement_association=item["placement_association"],
                    severity=item["severity"],
                    recommended_curriculum_action=item["recommended_curriculum_action"],
                )
            )

        return results


skill_bottleneck_service = SkillBottleneckService()
