from datetime import datetime, timedelta, timezone
import json
from typing import Any, Dict, List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from src.core.logging import logger
from src.ml.bkt import bkt_engine
from src.models.assessment import (
    AssessmentQuestion,
    AssessmentSubmission,
    LearnerSkillHistory,
    LearnerSkillMastery,
)
from src.models.competency import Competency
from src.models.learning_plan import (
    CompetencyPrerequisite,
    LearningPlan,
    LearningPlanModule,
    ReassessmentAttempt,
)
from src.models.role import Role
from src.schemas.adaptive_learning_dto import (
    PracticeAnswerSubmissionDTO,
    PracticeQuestionFeedbackDTO,
    PracticeQuestionItemDTO,
    PracticeQuestionSetDTO,
    PracticeSubmitRequestDTO,
    PracticeSubmitResponseDTO,
)
from src.services.role_matching import RoleMatchingService


class AdaptiveReassessmentService:
    """
    Closed-Loop Adaptive Remediation Engine.
    Serves targeted practice items, processes reassessment submissions via BKT,
    evaluates gap convergence, and triggers deterministic adaptive interventions.
    """

    @staticmethod
    def determine_adaptation_action(
        prior_mastery: float,
        posterior_mastery: float,
        target_mastery: float,
        adaptation_count: int,
        has_unmet_prerequisites: bool,
        current_difficulty: str,
    ) -> Dict[str, Any]:
        """
        Pure, deterministic decision function evaluating reassessment convergence.
        Returns:
            result: 'MASTERED' | 'GAP_REDUCED' | 'STAGNANT' | 'REGRESSED'
            action: 'NONE' | 'DIFFICULTY_BACKOFF' | 'PREREQUISITE_REMEDIATION' | 'SPACED_REPETITION'
            reason: Pedagogical explanation
            next_difficulty: Optional[str]
            next_available_at: Optional[datetime]
        """
        # Branch A: Gap Closed / Mastered
        if posterior_mastery >= target_mastery:
            return {
                "result": "MASTERED",
                "action": "NONE",
                "reason": f"Target mastery satisfied ({posterior_mastery:.2f} >= {target_mastery:.2f}). Competency requirement achieved.",
                "next_difficulty": None,
                "next_available_at": None,
                "next_action": "ADVANCE_NEXT_GAP",
            }

        # Branch B: Gap Reduced but not closed
        if posterior_mastery > prior_mastery:
            delta = posterior_mastery - prior_mastery
            return {
                "result": "GAP_REDUCED",
                "action": "NONE",
                "reason": f"Mastery progressed from {prior_mastery:.2f} to {posterior_mastery:.2f} (+{delta:.2f}). Continue targeted practice.",
                "next_difficulty": current_difficulty,
                "next_available_at": None,
                "next_action": "CONTINUE_PRACTICE",
            }

        # Branch C: Stagnant or Regressed -> Trigger Adaptive Intervention
        result = "REGRESSED" if posterior_mastery < prior_mastery else "STAGNANT"

        # Priority 1: Prerequisite Remediation if unmastered prerequisite exists
        if has_unmet_prerequisites:
            return {
                "result": result,
                "action": "PREREQUISITE_REMEDIATION",
                "reason": "Assessment indicates cognitive blockage from unmastered prerequisite concepts. Recommending foundational remediation.",
                "next_difficulty": "BEGINNER",
                "next_available_at": None,
                "next_action": "REVIEW_PREREQUISITES",
            }

        # Priority 2: Difficulty Backoff
        if current_difficulty == "ADVANCED":
            return {
                "result": result,
                "action": "DIFFICULTY_BACKOFF",
                "reason": "High error rate on advanced items. Stepping down difficulty to Intermediate to reinforce core principles.",
                "next_difficulty": "INTERMEDIATE",
                "next_available_at": None,
                "next_action": "RETRY_LOWER_DIFFICULTY",
            }
        elif current_difficulty == "INTERMEDIATE":
            return {
                "result": result,
                "action": "DIFFICULTY_BACKOFF",
                "reason": "Stepping down difficulty to Beginner to build foundational mechanics.",
                "next_difficulty": "BEGINNER",
                "next_available_at": None,
                "next_action": "RETRY_LOWER_DIFFICULTY",
            }

        # Priority 3: Spaced Repetition if already at Beginner or multiple stagnant attempts
        delay = datetime.now(timezone.utc) + timedelta(hours=24)
        return {
            "result": result,
            "action": "SPACED_REPETITION",
            "reason": "Repeated attempts without improvement. Scheduling a 24-hour memory consolidation delay to prevent fatigue.",
            "next_difficulty": "BEGINNER",
            "next_available_at": delay,
            "next_action": "SPACED_REPETITION_SCHEDULED",
        }

    @classmethod
    async def get_practice_questions_for_competency(
        cls, db: AsyncSession, learner_id: str, competency_id: uuid.UUID
    ) -> PracticeQuestionSetDTO:
        """
        Retrieves 3-5 targeted practice items aligned with the candidate's active
        learning plan module and current difficulty tier.
        """
        # 1. Find candidate's active module for this competency
        mod_q = await db.execute(
            select(LearningPlanModule)
            .join(LearningPlan, LearningPlan.id == LearningPlanModule.learning_plan_id)
            .options(
                selectinload(LearningPlanModule.competency),
                selectinload(LearningPlanModule.learning_plan),
            )
            .where(
                LearningPlan.learner_id == learner_id,
                LearningPlanModule.competency_id == competency_id,
                LearningPlan.status.in_(["ACTIVE", "ADAPTING"]),
            )
        )
        module = mod_q.scalar_one_or_none()
        if not module:
            raise NotFoundException(
                message=f"No active learning plan module found for competency '{competency_id}'."
            )

        # Strict ownership check
        if module.learning_plan.learner_id != learner_id:
            raise ForbiddenException(message="Access denied to this learning module.")

        diff = module.difficulty_level or "BEGINNER"

        # 2. Query questions matching skill and difficulty
        q_query = await db.execute(
            select(AssessmentQuestion)
            .where(
                AssessmentQuestion.skill_id == competency_id,
                AssessmentQuestion.difficulty == diff,
                AssessmentQuestion.is_active == True,
            )
            .limit(5)
        )
        questions = q_query.scalars().all()

        # Fallback: if not enough questions at this exact difficulty, query any active questions for this skill
        if len(questions) < 3:
            fallback_q = await db.execute(
                select(AssessmentQuestion)
                .where(
                    AssessmentQuestion.skill_id == competency_id,
                    AssessmentQuestion.is_active == True,
                )
                .limit(5)
            )
            questions = fallback_q.scalars().all()

        if not questions:
            raise NotFoundException(
                message=f"No practice questions currently available for competency '{module.competency.name}'."
            )

        # 3. Format into DTO without leaking correct answers or explanations
        items = []
        for q in questions:
            opts = json.loads(q.options_json) if q.options_json else []
            items.append(
                PracticeQuestionItemDTO(
                    id=q.id,
                    competency_id=q.skill_id,
                    competency_name=module.competency.name if module.competency else "Skill",
                    question_text=q.question_text,
                    options=opts,
                    difficulty=q.difficulty,
                )
            )

        return PracticeQuestionSetDTO(
            module_id=module.id,
            competency_id=competency_id,
            competency_name=module.competency.name if module.competency else "Skill",
            difficulty_level=diff,
            current_mastery=module.current_mastery,
            target_mastery=module.target_mastery,
            gap=module.gap,
            questions=items,
        )

    @classmethod
    async def submit_practice_attempt(
        cls,
        db: AsyncSession,
        learner_id: str,
        competency_id: uuid.UUID,
        req: PracticeSubmitRequestDTO,
    ) -> PracticeSubmitResponseDTO:
        """
        Evaluates submitted practice answers, updates BKT Bayesian knowledge state,
        evaluates gap convergence delta, triggers deterministic adaptive interventions,
        and recalculates candidate role alignment.
        """
        if not req.answers:
            raise BadRequestException(message="At least one question answer is required.")

        # 1. Fetch active module and verify ownership
        mod_q = await db.execute(
            select(LearningPlanModule)
            .join(LearningPlan, LearningPlan.id == LearningPlanModule.learning_plan_id)
            .options(
                selectinload(LearningPlanModule.competency),
                selectinload(LearningPlanModule.learning_plan).selectinload(LearningPlan.role),
            )
            .where(
                LearningPlan.learner_id == learner_id,
                LearningPlanModule.competency_id == competency_id,
                LearningPlan.status.in_(["ACTIVE", "ADAPTING"]),
            )
        )
        module = mod_q.scalar_one_or_none()
        if not module:
            raise NotFoundException(
                message=f"No active learning plan module found for competency '{competency_id}'."
            )

        if module.learning_plan.learner_id != learner_id:
            raise ForbiddenException(message="Access denied to this learning module.")

        # 2. Fetch questions to grade
        q_ids = [a.question_id for a in req.answers]
        questions_q = await db.execute(
            select(AssessmentQuestion).where(AssessmentQuestion.id.in_(q_ids))
        )
        questions_by_id = {q.id: q for q in questions_q.scalars().all()}

        # 3. Retrieve prior BKT mastery
        mastery_q = await db.execute(
            select(LearnerSkillMastery).where(
                LearnerSkillMastery.learner_id == learner_id,
                LearnerSkillMastery.skill_id == competency_id,
            )
        )
        mastery_row = mastery_q.scalar_one_or_none()
        prior_mastery = mastery_row.mastery_probability if mastery_row else module.current_mastery

        # 4. Grade answers & invoke BKT update sequentially
        current_m = prior_mastery
        correct_count = 0
        total_count = len(req.answers)
        feedback_items: List[PracticeQuestionFeedbackDTO] = []

        for ans in req.answers:
            q = questions_by_id.get(ans.question_id)
            if not q:
                continue

            is_correct = ans.selected_answer.strip().lower() == q.correct_answer.strip().lower()
            if is_correct:
                correct_count += 1

            # Bayesian update via authoritative BKT engine
            prior_step = current_m
            current_m = bkt_engine.update_mastery(current_mastery=current_m, correct=is_correct)
            current_m = min(1.0, max(0.0, current_m))

            feedback_items.append(
                PracticeQuestionFeedbackDTO(
                    question_id=q.id,
                    question_text=q.question_text,
                    selected_answer=ans.selected_answer,
                    correct_answer=q.correct_answer,
                    is_correct=is_correct,
                    explanation=q.explanation,
                )
            )

        posterior_mastery = round(current_m, 4)
        accuracy = round(correct_count / total_count, 3) if total_count > 0 else 0.0

        # 5. Persist updated BKT mastery to learner_skill_mastery & history
        now = datetime.now(timezone.utc)
        if mastery_row:
            mastery_row.mastery_probability = posterior_mastery
            mastery_row.questions_attempted += total_count
            mastery_row.correct_answers += correct_count
            mastery_row.incorrect_answers += (total_count - correct_count)
            mastery_row.last_assessed_at = now
        else:
            mastery_row = LearnerSkillMastery(
                learner_id=learner_id,
                skill_id=competency_id,
                mastery_probability=posterior_mastery,
                questions_attempted=total_count,
                correct_answers=correct_count,
                incorrect_answers=total_count - correct_count,
                last_assessed_at=now,
            )
            db.add(mastery_row)

        history_entry = LearnerSkillHistory(
            learner_id=learner_id,
            skill_id=competency_id,
            question_id=req.answers[0].question_id if req.answers else None,
            previous_mastery=prior_mastery,
            new_mastery=posterior_mastery,
            is_correct=correct_count > (total_count / 2),
        )
        db.add(history_entry)

        # 6. Calculate Convergence Gaps
        prior_gap = max(0.0, module.target_mastery - prior_mastery)
        posterior_gap = max(0.0, module.target_mastery - posterior_mastery)
        gap_delta = round(prior_gap - posterior_gap, 4)

        # 7. Check if unmet prerequisites exist for this competency
        prereq_q = await db.execute(
            select(CompetencyPrerequisite).where(
                CompetencyPrerequisite.competency_id == competency_id
            )
        )
        prereqs = prereq_q.scalars().all()
        has_unmet_prereq = False
        for p in prereqs:
            p_mast_q = await db.execute(
                select(LearnerSkillMastery).where(
                    LearnerSkillMastery.learner_id == learner_id,
                    LearnerSkillMastery.skill_id == p.prerequisite_competency_id,
                )
            )
            p_row = p_mast_q.scalar_one_or_none()
            p_val = p_row.mastery_probability if p_row else 0.30
            if p_val < p.minimum_mastery:
                has_unmet_prereq = True
                break

        # 8. Trigger Deterministic Convergence & Adaptation Logic
        decision = cls.determine_adaptation_action(
            prior_mastery=prior_mastery,
            posterior_mastery=posterior_mastery,
            target_mastery=module.target_mastery,
            adaptation_count=module.adaptation_count,
            has_unmet_prerequisites=has_unmet_prereq,
            current_difficulty=module.difficulty_level,
        )

        result = decision["result"]
        action = decision["action"]

        # 9. Update module & plan progression
        module.current_mastery = posterior_mastery
        module.gap = posterior_gap
        plan = module.learning_plan

        if result == "MASTERED":
            module.status = "MASTERED"
            module.completed_at = now
            # Unlock next pending module in roadmap
            next_mod_q = await db.execute(
                select(LearningPlanModule)
                .where(
                    LearningPlanModule.learning_plan_id == plan.id,
                    LearningPlanModule.sequence_order > module.sequence_order,
                    LearningPlanModule.status == "PENDING",
                )
                .order_by(LearningPlanModule.sequence_order.asc())
            )
            next_mod = next_mod_q.scalars().first()
            if next_mod:
                next_mod.status = "IN_PROGRESS"
                next_mod.started_at = now
            else:
                # All modules completed
                all_done_q = await db.execute(
                    select(func.count(LearningPlanModule.id)).where(
                        LearningPlanModule.learning_plan_id == plan.id,
                        LearningPlanModule.status != "MASTERED",
                    )
                )
                remaining = all_done_q.scalar() or 0
                if remaining == 0:
                    plan.status = "COMPLETED"
                    plan.completed_at = now
        elif result == "GAP_REDUCED":
            module.status = "IN_PRACTICE"
        else:
            # Stagnant or Regressed -> Adapt
            module.status = "NEEDS_ADAPTATION"
            module.adaptation_count += 1
            plan.status = "ADAPTING"
            if decision.get("next_difficulty"):
                module.difficulty_level = decision["next_difficulty"]
            if decision.get("next_available_at"):
                module.next_available_at = decision["next_available_at"]

        # 10. Persist Reassessment Attempt Record
        attempt = ReassessmentAttempt(
            learning_plan_module_id=module.id,
            assessment_submission_id=None,
            prior_mastery=prior_mastery,
            posterior_mastery=posterior_mastery,
            prior_gap=prior_gap,
            posterior_gap=posterior_gap,
            gap_delta=gap_delta,
            target_mastery=module.target_mastery,
            questions_count=total_count,
            correct_count=correct_count,
            accuracy=accuracy,
            result=result,
            adaptation_action=action,
            attempted_at=now,
        )
        db.add(attempt)

        await db.commit()

        # 11. Recalculate deterministic role match score
        role_match_score = None
        if plan.role:
            try:
                role_match = await RoleMatchingService.calculate_single_role_match(
                    db=db, learner_id=learner_id, role=plan.role
                )
                role_match_score = role_match.match_score
            except Exception as e:
                logger.warning(f"Could not recompute role match: {e}")

        # 12. Structured Observability Logging
        logger.info(
            "Adaptive Reassessment Completed",
            extra={
                "learner_id": learner_id,
                "plan_id": str(plan.id),
                "module_id": str(module.id),
                "competency_id": str(competency_id),
                "prior_mastery": prior_mastery,
                "posterior_mastery": posterior_mastery,
                "gap_delta": gap_delta,
                "result": result,
                "adaptation_action": action,
                "role_match_score": role_match_score,
            },
        )

        return PracticeSubmitResponseDTO(
            module_id=module.id,
            competency_id=competency_id,
            competency_name=module.competency.name if module.competency else "Competency",
            prior_mastery=round(prior_mastery, 4),
            posterior_mastery=round(posterior_mastery, 4),
            prior_gap=round(prior_gap, 4),
            posterior_gap=round(posterior_gap, 4),
            gap_delta=round(gap_delta, 4),
            target_mastery=round(module.target_mastery, 4),
            questions_count=total_count,
            correct_count=correct_count,
            accuracy=accuracy,
            result=result,
            adaptation_action=action,
            adaptation_reason=decision.get("reason"),
            next_difficulty=decision.get("next_difficulty"),
            next_available_at=decision.get("next_available_at"),
            next_recommended_action=decision.get("next_action", "CONTINUE"),
            role_match_score=role_match_score,
            feedback=feedback_items,
        )
