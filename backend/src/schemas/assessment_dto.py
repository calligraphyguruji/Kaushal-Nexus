from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from src.schemas.bkt_dto import LearnerSkillMasteryItemDTO


class AssessmentQuestionResponseDTO(BaseModel):
    """Assessment question presentation model (excludes correct_answer to prevent client cheating)."""
    id: uuid.UUID
    skill_id: uuid.UUID
    skill_name: str
    question_text: str
    options: List[str]
    difficulty: str

    model_config = ConfigDict(from_attributes=True)


class AssessmentListItemDTO(BaseModel):
    """Summary item for available assessments list."""
    id: uuid.UUID
    code: str
    title: str
    description: Optional[str] = None
    sector: str
    duration_minutes: int
    total_questions: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class AssessmentDetailResponseDTO(BaseModel):
    """Full assessment payload with questions for candidate test-taking."""
    id: uuid.UUID
    code: str
    title: str
    description: Optional[str] = None
    sector: str
    duration_minutes: int
    questions: List[AssessmentQuestionResponseDTO]

    model_config = ConfigDict(from_attributes=True)


class AnswerSubmissionItemDTO(BaseModel):
    """Candidate answer to a single question."""
    question_id: uuid.UUID
    selected_answer: str


class AssessmentSubmitRequestDTO(BaseModel):
    """Batch assessment answers submission payload."""
    learner_id: str = Field(..., description="Beneficiary ID e.g. 'KN-2026-00561'")
    answers: List[AnswerSubmissionItemDTO] = Field(..., min_length=1)


class QuestionEvaluationResultDTO(BaseModel):
    """Detailed result of evaluating a single answer including BKT delta."""
    question_id: uuid.UUID
    skill_name: str
    is_correct: bool
    selected_answer: str
    correct_answer: str
    explanation: Optional[str] = None
    previous_mastery: float
    new_mastery: float
    mastery_status: str


class AssessmentSubmitResponseDTO(BaseModel):
    """Complete assessment evaluation with test score % and updated BKT skill masteries."""
    submission_id: uuid.UUID
    learner_id: str
    assessment_id: uuid.UUID
    score_percentage: float = Field(..., ge=0.0, le=100.0, description="Traditional test score %")
    total_questions: int
    correct_count: int
    results: List[QuestionEvaluationResultDTO]
    updated_masteries: List[LearnerSkillMasteryItemDTO]
    submitted_at: str


class QuickAttemptRequestDTO(BaseModel):
    """Direct single-item attempt for interactive practice or real-time BKT demonstrations."""
    learner_id: str
    question_id: uuid.UUID
    selected_answer: str


class QuickAttemptResponseDTO(BaseModel):
    """Immediate evaluation result for a single attempt."""
    learner_id: str
    question_id: uuid.UUID
    skill_id: uuid.UUID
    skill_name: str
    is_correct: bool
    selected_answer: str
    correct_answer: str
    explanation: Optional[str] = None
    previous_mastery: float
    new_mastery: float
    mastery_status: str
    questions_attempted: int
