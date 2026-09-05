from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.config import settings
from src.core.exceptions import BadRequestException, NotFoundException
from src.core.logging import logger
from src.ml.bkt import bkt_engine
from src.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentSubmission,
    LearnerSkillHistory,
    LearnerSkillMastery,
)
from src.models.competency import Competency
from src.models.learner import Learner
from src.schemas.assessment_dto import (
    AnswerSubmissionItemDTO,
    AssessmentDetailResponseDTO,
    AssessmentListItemDTO,
    AssessmentQuestionResponseDTO,
    AssessmentSubmitRequestDTO,
    AssessmentSubmitResponseDTO,
    QuestionEvaluationResultDTO,
    QuickAttemptRequestDTO,
    QuickAttemptResponseDTO,
)
from src.schemas.bkt_dto import (
    BKTFeatureVectorResponseDTO,
    LearnerSkillGapsResponseDTO,
    LearnerSkillMasteryItemDTO,
    LearnerSkillsResponseDTO,
    SkillGapItemDTO,
)


class AssessmentService:
    """
    Core service orchestrating assessment administration, question evaluation,
    and Bayesian Knowledge Tracing (BKT) skill mastery updates.
    """

    @staticmethod
    async def list_assessments(
        db: AsyncSession,
        sector: Optional[str] = None,
    ) -> List[AssessmentListItemDTO]:
        """Lists active assessments with total question counts."""
        query = (
            select(Assessment)
            .where(Assessment.is_active.is_(True))
            .options(selectinload(Assessment.questions))
            .order_by(Assessment.title)
        )
        if sector and sector.strip():
            query = query.where(Assessment.sector.ilike(f"%{sector.strip()}%"))

        result = await db.execute(query)
        assessments = result.scalars().all()

        items: List[AssessmentListItemDTO] = []
        for a in assessments:
            active_q_count = len([q for q in a.questions if q.is_active])
            items.append(
                AssessmentListItemDTO(
                    id=a.id,
                    code=a.code,
                    title=a.title,
                    description=a.description,
                    sector=a.sector,
                    duration_minutes=a.duration_minutes,
                    total_questions=active_q_count,
                    is_active=a.is_active,
                )
            )
        return items

    @staticmethod
    async def get_assessment_by_id(
        db: AsyncSession,
        assessment_id: uuid.UUID,
    ) -> AssessmentDetailResponseDTO:
        """Retrieves assessment details and questions for testing (safe against client answer leaks)."""
        stmt = (
            select(Assessment)
            .where(Assessment.id == assessment_id)
            .options(
                selectinload(Assessment.questions).selectinload(AssessmentQuestion.skill)
            )
        )
        result = await db.execute(stmt)
        assessment = result.scalar_one_or_none()
        if not assessment:
            raise NotFoundException(message=f"Assessment with ID '{assessment_id}' not found.")

        questions_dto: List[AssessmentQuestionResponseDTO] = []
        for q in assessment.questions:
            if not q.is_active:
                continue
            try:
                options = json.loads(q.options_json) if q.options_json else []
            except Exception:
                options = []

            questions_dto.append(
                AssessmentQuestionResponseDTO(
                    id=q.id,
                    skill_id=q.skill_id,
                    skill_name=q.skill.name if q.skill else "General Competency",
                    question_text=q.question_text,
                    options=options,
                    difficulty=q.difficulty,
                )
            )

        return AssessmentDetailResponseDTO(
            id=assessment.id,
            code=assessment.code,
            title=assessment.title,
            description=assessment.description,
            sector=assessment.sector,
            duration_minutes=assessment.duration_minutes,
            questions=questions_dto,
        )

    @classmethod
    async def process_submission(
        cls,
        db: AsyncSession,
        assessment_id: uuid.UUID,
        req: AssessmentSubmitRequestDTO,
    ) -> AssessmentSubmitResponseDTO:
        """
        Evaluates a batch assessment submission, applies sequential BKT updates per skill,
        logs longitudinal history, and commits atomically within a single transaction.
        """
        # 1. Verify Learner exists
        learner_stmt = select(Learner).where(Learner.id == req.learner_id)
        learner_res = await db.execute(learner_stmt)
        learner = learner_res.scalar_one_or_none()
        if not learner:
            raise NotFoundException(message=f"Candidate with ID '{req.learner_id}' not found.")

        # 2. Verify Assessment exists
        assess_stmt = select(Assessment).where(Assessment.id == assessment_id)
        assess_res = await db.execute(assess_stmt)
        assessment = assess_res.scalar_one_or_none()
        if not assessment:
            raise NotFoundException(message=f"Assessment with ID '{assessment_id}' not found.")

        # 3. Load all questions for this assessment
        q_ids = [a.question_id for a in req.answers]
        questions_stmt = (
            select(AssessmentQuestion)
            .where(AssessmentQuestion.id.in_(q_ids))
            .options(selectinload(AssessmentQuestion.skill))
        )
        q_res = await db.execute(questions_stmt)
        question_map = {q.id: q for q in q_res.scalars().all()}

        if not question_map:
            raise BadRequestException(message="No valid questions found matching submission IDs.")

        # 4. Process each answer and track skill mastery updates sequentially
        evaluation_results: List[QuestionEvaluationResultDTO] = []
        correct_count = 0
        total_questions = len(req.answers)
        now_dt = datetime.now(timezone.utc)

        # Cache learner's current mastery records in memory during batch processing
        skills_touched: Dict[uuid.UUID, LearnerSkillMastery] = {}

        # Fetch existing masteries for touched skills
        skill_ids = list({q.skill_id for q in question_map.values()})
        existing_masteries_stmt = select(LearnerSkillMastery).where(
            LearnerSkillMastery.learner_id == req.learner_id,
            LearnerSkillMastery.skill_id.in_(skill_ids),
        )
        em_res = await db.execute(existing_masteries_stmt)
        for m in em_res.scalars().all():
            skills_touched[m.skill_id] = m

        submission_responses_log: List[Dict[str, Any]] = []

        for item in req.answers:
            q = question_map.get(item.question_id)
            if not q:
                continue

            # Answer evaluation (case-insensitive strip)
            is_correct = (
                item.selected_answer.strip().lower() == q.correct_answer.strip().lower()
            )
            if is_correct:
                correct_count += 1

            skill_id = q.skill_id
            # Fetch or initialize mastery state
            if skill_id not in skills_touched:
                init_mastery = bkt_engine.get_initial_mastery()
                mastery_record = LearnerSkillMastery(
                    learner_id=req.learner_id,
                    skill_id=skill_id,
                    mastery_probability=init_mastery,
                    questions_attempted=0,
                    correct_answers=0,
                    incorrect_answers=0,
                    last_assessed_at=now_dt,
                )
                db.add(mastery_record)
                skills_touched[skill_id] = mastery_record

            mastery_record = skills_touched[skill_id]
            prev_mastery = mastery_record.mastery_probability

            # Run Bayesian Knowledge Tracing update
            new_mastery = bkt_engine.update_mastery(
                current_mastery=prev_mastery,
                correct=is_correct,
            )

            # Update state
            mastery_record.mastery_probability = new_mastery
            mastery_record.questions_attempted += 1
            if is_correct:
                mastery_record.correct_answers += 1
            else:
                mastery_record.incorrect_answers += 1
            mastery_record.last_assessed_at = now_dt

            # Log audit history for downstream ML / XGBoost without data leakage
            history_record = LearnerSkillHistory(
                learner_id=req.learner_id,
                skill_id=skill_id,
                question_id=q.id,
                previous_mastery=prev_mastery,
                is_correct=is_correct,
                new_mastery=new_mastery,
                created_at=now_dt,
            )
            db.add(history_record)

            status_str = bkt_engine.classify_mastery(new_mastery)

            evaluation_results.append(
                QuestionEvaluationResultDTO(
                    question_id=q.id,
                    skill_name=q.skill.name if q.skill else "Skill",
                    is_correct=is_correct,
                    selected_answer=item.selected_answer,
                    correct_answer=q.correct_answer,
                    explanation=q.explanation,
                    previous_mastery=prev_mastery,
                    new_mastery=new_mastery,
                    mastery_status=status_str,
                )
            )

            submission_responses_log.append({
                "question_id": str(q.id),
                "selected_answer": item.selected_answer,
                "is_correct": is_correct,
            })

        # Calculate traditional test score %
        score_pct = round((correct_count / total_questions) * 100.0, 1) if total_questions > 0 else 0.0

        # Save AssessmentSubmission
        sub_record = AssessmentSubmission(
            learner_id=req.learner_id,
            assessment_id=assessment_id,
            score_percentage=score_pct,
            total_questions=total_questions,
            correct_count=correct_count,
            responses_json=json.dumps(submission_responses_log),
        )
        db.add(sub_record)

        # Commit transaction
        await db.commit()
        await db.refresh(sub_record)

        # Build updated masteries DTO
        updated_dtos: List[LearnerSkillMasteryItemDTO] = []
        for s_id, m in skills_touched.items():
            skill_obj = question_map[req.answers[0].question_id].skill if s_id == question_map[req.answers[0].question_id].skill_id else None
            # Fetch skill name if not loaded
            if not skill_obj:
                s_res = await db.execute(select(Competency).where(Competency.id == s_id))
                skill_obj = s_res.scalar_one_or_none()

            updated_dtos.append(
                LearnerSkillMasteryItemDTO(
                    skill_id=m.skill_id,
                    skill=skill_obj.name if skill_obj else "Competency",
                    sector=skill_obj.sector if skill_obj else None,
                    mastery_probability=m.mastery_probability,
                    status=bkt_engine.classify_mastery(m.mastery_probability),
                    questions_attempted=m.questions_attempted,
                    correct_answers=m.correct_answers,
                    incorrect_answers=m.incorrect_answers,
                    last_assessed_at=m.last_assessed_at,
                )
            )

        return AssessmentSubmitResponseDTO(
            submission_id=sub_record.id,
            learner_id=req.learner_id,
            assessment_id=assessment_id,
            score_percentage=score_pct,
            total_questions=total_questions,
            correct_count=correct_count,
            results=evaluation_results,
            updated_masteries=updated_dtos,
            submitted_at=now_dt.isoformat(),
        )

    @classmethod
    async def process_quick_attempt(
        cls,
        db: AsyncSession,
        req: QuickAttemptRequestDTO,
    ) -> QuickAttemptResponseDTO:
        """Evaluates a single question answer and applies atomic BKT update."""
        learner_stmt = select(Learner).where(Learner.id == req.learner_id)
        learner_res = await db.execute(learner_stmt)
        if not learner_res.scalar_one_or_none():
            raise NotFoundException(message=f"Candidate '{req.learner_id}' not found.")

        q_stmt = (
            select(AssessmentQuestion)
            .where(AssessmentQuestion.id == req.question_id)
            .options(selectinload(AssessmentQuestion.skill))
        )
        q_res = await db.execute(q_stmt)
        question = q_res.scalar_one_or_none()
        if not question:
            raise NotFoundException(message=f"Question '{req.question_id}' not found.")

        is_correct = (
            req.selected_answer.strip().lower() == question.correct_answer.strip().lower()
        )
        now_dt = datetime.now(timezone.utc)

        # Retrieve or initialize mastery
        m_stmt = select(LearnerSkillMastery).where(
            LearnerSkillMastery.learner_id == req.learner_id,
            LearnerSkillMastery.skill_id == question.skill_id,
        )
        m_res = await db.execute(m_stmt)
        mastery_record = m_res.scalar_one_or_none()

        if not mastery_record:
            init_mastery = bkt_engine.get_initial_mastery()
            mastery_record = LearnerSkillMastery(
                learner_id=req.learner_id,
                skill_id=question.skill_id,
                mastery_probability=init_mastery,
                questions_attempted=0,
                correct_answers=0,
                incorrect_answers=0,
                last_assessed_at=now_dt,
            )
            db.add(mastery_record)

        prev_mastery = mastery_record.mastery_probability
        new_mastery = bkt_engine.update_mastery(
            current_mastery=prev_mastery,
            correct=is_correct,
        )

        mastery_record.mastery_probability = new_mastery
        mastery_record.questions_attempted += 1
        if is_correct:
            mastery_record.correct_answers += 1
        else:
            mastery_record.incorrect_answers += 1
        mastery_record.last_assessed_at = now_dt

        history_record = LearnerSkillHistory(
            learner_id=req.learner_id,
            skill_id=question.skill_id,
            question_id=question.id,
            previous_mastery=prev_mastery,
            is_correct=is_correct,
            new_mastery=new_mastery,
            created_at=now_dt,
        )
        db.add(history_record)

        await db.commit()
        await db.refresh(mastery_record)

        return QuickAttemptResponseDTO(
            learner_id=req.learner_id,
            question_id=question.id,
            skill_id=question.skill_id,
            skill_name=question.skill.name if question.skill else "Skill",
            is_correct=is_correct,
            selected_answer=req.selected_answer,
            correct_answer=question.correct_answer,
            explanation=question.explanation,
            previous_mastery=prev_mastery,
            new_mastery=new_mastery,
            mastery_status=bkt_engine.classify_mastery(new_mastery),
            questions_attempted=mastery_record.questions_attempted,
        )

    @staticmethod
    async def get_learner_skills(
        db: AsyncSession,
        learner_id: str,
    ) -> LearnerSkillsResponseDTO:
        """Retrieves all assessed skills and current BKT mastery estimates for a candidate."""
        stmt = (
            select(LearnerSkillMastery)
            .where(LearnerSkillMastery.learner_id == learner_id)
            .options(selectinload(LearnerSkillMastery.skill))
            .order_by(LearnerSkillMastery.mastery_probability.desc())
        )
        result = await db.execute(stmt)
        records = result.scalars().all()

        skills: List[LearnerSkillMasteryItemDTO] = []
        for r in records:
            skills.append(
                LearnerSkillMasteryItemDTO(
                    skill_id=r.skill_id,
                    skill=r.skill.name if r.skill else "Competency",
                    sector=r.skill.sector if r.skill else None,
                    mastery_probability=r.mastery_probability,
                    status=bkt_engine.classify_mastery(r.mastery_probability),
                    questions_attempted=r.questions_attempted,
                    correct_answers=r.correct_answers,
                    incorrect_answers=r.incorrect_answers,
                    last_assessed_at=r.last_assessed_at,
                )
            )

        return LearnerSkillsResponseDTO(
            learner_id=learner_id,
            user_id=learner_id,
            skills=skills,
        )

    @staticmethod
    async def get_learner_skill_gaps(
        db: AsyncSession,
        learner_id: str,
        role_id_or_title: Optional[str] = None,
    ) -> LearnerSkillGapsResponseDTO:
        """Calculates competency deficits against target benchmark role."""
        target_role = role_id_or_title or "Python Developer Intern"

        # Load current masteries
        stmt = (
            select(LearnerSkillMastery)
            .where(LearnerSkillMastery.learner_id == learner_id)
            .options(selectinload(LearnerSkillMastery.skill))
        )
        result = await db.execute(stmt)
        records = result.scalars().all()

        mastery_map: Dict[str, float] = {
            r.skill.name: r.mastery_probability for r in records if r.skill
        }

        gap_data = bkt_engine.calculate_skill_gaps(target_role, mastery_map)

        skill_gaps = [
            SkillGapItemDTO(
                skill=g["skill"],
                current_mastery=g["current_mastery"],
                required_mastery=g["required_mastery"],
                gap=g["gap"],
                priority=g["priority"],
            )
            for g in gap_data["skill_gaps"]
        ]

        return LearnerSkillGapsResponseDTO(
            learner_id=learner_id,
            role=gap_data["role"],
            overall_alignment=gap_data["overall_alignment"],
            skill_gaps=skill_gaps,
        )

    @staticmethod
    async def get_learner_bkt_features(
        db: AsyncSession,
        learner_id: str,
    ) -> BKTFeatureVectorResponseDTO:
        """Exports clean feature vector for ML tabular models (e.g. XGBoost readiness predictor)."""
        stmt = (
            select(LearnerSkillMastery)
            .where(LearnerSkillMastery.learner_id == learner_id)
            .options(selectinload(LearnerSkillMastery.skill))
        )
        result = await db.execute(stmt)
        records = result.scalars().all()

        mastery_map = {
            r.skill.name: r.mastery_probability for r in records if r.skill
        }
        features = bkt_engine.extract_feature_vector(mastery_map)

        return BKTFeatureVectorResponseDTO(
            learner_id=learner_id,
            features=features,
            total_skills_assessed=len(records),
            generated_at=datetime.now(timezone.utc).isoformat(),
        )


assessment_service = AssessmentService()
