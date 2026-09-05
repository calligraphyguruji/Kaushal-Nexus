import uuid
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.competency import Competency
    from src.models.learner import Learner


class Assessment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Assessment test entity covering one or more technical competencies."""
    __tablename__ = "assessments"

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
        doc="Assessment name e.g. 'Full-Stack Software Engineering Diagnostic'",
    )
    code: Mapped[str] = mapped_column(
        String(60),
        unique=True,
        index=True,
        nullable=False,
        doc="Unique assessment code e.g. 'ASSESS-FS-DEV-01'",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Overview of assessment objectives and competency areas",
    )
    sector: Mapped[str] = mapped_column(
        String(100),
        default="IT-ITeS",
        nullable=False,
        index=True,
        doc="Target industry sector",
    )
    duration_minutes: Mapped[int] = mapped_column(
        Integer,
        default=30,
        nullable=False,
        doc="Allotted time in minutes",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
        doc="Whether assessment is actively available to learners",
    )

    # Relationships
    questions: Mapped[List["AssessmentQuestion"]] = relationship(
        "AssessmentQuestion",
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="AssessmentQuestion.created_at",
    )
    submissions: Mapped[List["AssessmentSubmission"]] = relationship(
        "AssessmentSubmission",
        back_populates="assessment",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Assessment(code='{self.code}', title='{self.title}')>"


class AssessmentQuestion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Individual assessment question mapped directly to a competency or subskill.
    Every question MUST reference a competency standard via skill_id.
    """
    __tablename__ = "assessment_questions"

    assessment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        doc="Associated assessment test foreign key",
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Target competency / subskill standard foreign key",
    )
    question_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Stem / prompt text of the question",
    )
    options_json: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="JSON serialized list of multiple choice options",
    )
    correct_answer: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Exact correct answer string matching one of the options",
    )
    explanation: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Pedagogical explanation of the solution",
    )
    difficulty: Mapped[str] = mapped_column(
        String(20),
        default="MEDIUM",
        nullable=False,
        index=True,
        doc="Difficulty level: 'EASY' | 'MEDIUM' | 'HARD'",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Question active status",
    )

    # Relationships
    assessment: Mapped[Optional["Assessment"]] = relationship(
        "Assessment",
        back_populates="questions",
    )
    skill: Mapped["Competency"] = relationship(
        "Competency",
        lazy="joined",
    )

    __table_args__ = (
        Index("ix_questions_skill_difficulty", "skill_id", "difficulty"),
    )

    def __repr__(self) -> str:
        return f"<AssessmentQuestion(id={self.id}, skill_id='{self.skill_id}', difficulty='{self.difficulty}')>"


class LearnerSkillMastery(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Learner's current Bayesian Knowledge Tracing (BKT) estimated mastery state.
    Strict unique constraint: exactly ONE current mastery record per (learner_id, skill_id).
    Persists across all assessments.
    """
    __tablename__ = "learner_skill_mastery"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Learner beneficiary identifier",
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Competency standard identifier",
    )
    mastery_probability: Mapped[float] = mapped_column(
        Float,
        default=0.30,
        nullable=False,
        doc="Current BKT latent mastery probability [0.0, 1.0]",
    )
    questions_attempted: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Cumulative number of assessment opportunities for this skill",
    )
    correct_answers: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Total correct answers logged",
    )
    incorrect_answers: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Total incorrect answers logged",
    )
    last_assessed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp when learner last answered a question on this skill",
    )

    # Relationships
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="skill_masteries",
    )
    skill: Mapped["Competency"] = relationship(
        "Competency",
        lazy="joined",
    )

    __table_args__ = (
        UniqueConstraint("learner_id", "skill_id", name="uq_learner_skill_mastery"),
        Index("ix_lsm_learner_mastery", "learner_id", "mastery_probability"),
    )

    def __repr__(self) -> str:
        return f"<LearnerSkillMastery(learner='{self.learner_id}', skill='{self.skill_id}', mastery={self.mastery_probability:.2f})>"


class LearnerSkillHistory(Base, UUIDPrimaryKeyMixin):
    """
    Immutable historical audit log of every BKT update.
    Critical for longitudinal student tracking and downstream XGBoost feature preparation
    without data leakage.
    """
    __tablename__ = "learner_skill_history"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessment_questions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    previous_mastery: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="BKT mastery probability prior to this opportunity",
    )
    is_correct: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        doc="Whether learner's answer was correct",
    )
    new_mastery: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Updated BKT mastery probability after Bayesian update",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # Relationships
    skill: Mapped["Competency"] = relationship("Competency", lazy="joined")
    question: Mapped[Optional["AssessmentQuestion"]] = relationship("AssessmentQuestion", lazy="joined")

    __table_args__ = (
        Index("ix_lsh_learner_skill_created", "learner_id", "skill_id", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<LearnerSkillHistory(learner='{self.learner_id}', correct={self.is_correct}, "
            f"{self.previous_mastery:.2f} -> {self.new_mastery:.2f})>"
        )


class AssessmentSubmission(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Log of an assessment test completed by a learner.
    Maintains traditional test percentage score alongside the BKT masteries.
    """
    __tablename__ = "assessment_submissions"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    score_percentage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Raw assessment test score percentage (0-100%)",
    )
    total_questions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    correct_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    responses_json: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="JSON serialized list of item responses with question_id, chosen_answer, is_correct",
    )

    # Relationships
    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="submissions")
    learner: Mapped["Learner"] = relationship("Learner", back_populates="assessment_submissions")

    def __repr__(self) -> str:
        return f"<AssessmentSubmission(learner='{self.learner_id}', score={self.score_percentage:.1f}%)>"
