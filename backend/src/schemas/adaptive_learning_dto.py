import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CompetencyPrerequisiteDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    competency_id: uuid.UUID
    competency_code: Optional[str] = None
    competency_name: Optional[str] = None
    prerequisite_competency_id: uuid.UUID
    prerequisite_code: Optional[str] = None
    prerequisite_name: Optional[str] = None
    minimum_mastery: float = 0.60


class LearningResourceDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    provider: str
    resource_type: str
    url: str
    difficulty: str
    estimated_hours: float
    quality_score: float
    language: str
    is_free: bool
    description: Optional[str] = None


class LearningPlanModuleDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    competency_id: uuid.UUID
    competency_code: str
    competency_name: str
    sequence_order: int
    prior_mastery: float
    current_mastery: float
    target_mastery: float
    gap: float
    priority_score: float
    role_weight: float
    estimated_hours: float
    status: str
    adaptation_count: int
    difficulty_level: str
    next_available_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    resources: List[LearningResourceDTO] = Field(default_factory=list)
    prerequisite_names: List[str] = Field(default_factory=list)


class LearningPlanDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    learner_id: str
    role_id: uuid.UUID
    role_title: str
    role_code: str
    status: str
    overall_progress_pct: float
    estimated_total_hours: float
    estimated_hours_remaining: float
    completed_modules_count: int
    total_modules_count: int
    critical_gaps_count: int
    generated_at: datetime
    completed_at: Optional[datetime] = None
    modules: List[LearningPlanModuleDTO] = Field(default_factory=list)


class PracticeQuestionItemDTO(BaseModel):
    id: uuid.UUID
    competency_id: uuid.UUID
    competency_name: str
    question_text: str
    options: List[str]
    difficulty: str


class PracticeQuestionSetDTO(BaseModel):
    module_id: uuid.UUID
    competency_id: uuid.UUID
    competency_name: str
    difficulty_level: str
    current_mastery: float
    target_mastery: float
    gap: float
    questions: List[PracticeQuestionItemDTO]


class PracticeAnswerSubmissionDTO(BaseModel):
    question_id: uuid.UUID
    selected_answer: str


class PracticeSubmitRequestDTO(BaseModel):
    answers: List[PracticeAnswerSubmissionDTO]
    time_spent_seconds: Optional[int] = 0


class PracticeQuestionFeedbackDTO(BaseModel):
    question_id: uuid.UUID
    question_text: str
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: Optional[str] = None


class PracticeSubmitResponseDTO(BaseModel):
    module_id: uuid.UUID
    competency_id: uuid.UUID
    competency_name: str
    prior_mastery: float
    posterior_mastery: float
    prior_gap: float
    posterior_gap: float
    gap_delta: float
    target_mastery: float
    questions_count: int
    correct_count: int
    accuracy: float
    result: str  # 'GAP_REDUCED' | 'MASTERED' | 'STAGNANT' | 'REGRESSED'
    adaptation_action: str  # 'NONE' | 'DIFFICULTY_BACKOFF' | 'PREREQUISITE_REMEDIATION' | 'SPACED_REPETITION'
    adaptation_reason: Optional[str] = None
    next_difficulty: Optional[str] = None
    next_available_at: Optional[datetime] = None
    next_recommended_action: str
    role_match_score: Optional[float] = None
    feedback: List[PracticeQuestionFeedbackDTO] = Field(default_factory=list)


class LearningActivityCreateDTO(BaseModel):
    module_id: Optional[uuid.UUID] = None
    resource_id: Optional[uuid.UUID] = None
    activity_type: str  # 'RESOURCE_STARTED', 'RESOURCE_COMPLETED', 'PRACTICE_STARTED', 'PRACTICE_COMPLETED', 'PROJECT_COMPLETED'
    time_spent_minutes: int = 0


class LearningActivityDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    learner_id: str
    module_id: Optional[uuid.UUID] = None
    resource_id: Optional[uuid.UUID] = None
    activity_type: str
    time_spent_minutes: int
    created_at: datetime


class LearningProgressDTO(BaseModel):
    learner_id: str
    target_role_title: Optional[str] = None
    role_match_percentage: float
    overall_progress_pct: float
    skills_mastered_count: int
    skills_developing_count: int
    remaining_critical_gaps_count: int
    total_hours_completed: float
    estimated_hours_remaining: float
    recent_bkt_updates: List[Dict[str, Any]] = Field(default_factory=list)
