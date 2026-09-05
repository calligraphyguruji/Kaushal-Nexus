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
    from src.models.learner import Learner
    from src.models.role import Role
    from src.models.competency import Competency
    from src.models.assessment import AssessmentSubmission


class CompetencyPrerequisite(Base, UUIDPrimaryKeyMixin):
    """
    Directed prerequisite relationship between two competency standards.
    E.g., 'Python OOP' requires 'Python Basics' with minimum mastery 0.60.
    """
    __tablename__ = "competency_prerequisites"

    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Target / dependent competency standard",
    )
    prerequisite_competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Required foundational competency standard",
    )
    minimum_mastery: Mapped[float] = mapped_column(
        Float,
        default=0.60,
        nullable=False,
        doc="Minimum BKT mastery threshold required in the prerequisite",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    competency: Mapped["Competency"] = relationship(
        "Competency",
        foreign_keys=[competency_id],
        lazy="joined",
    )
    prerequisite_competency: Mapped["Competency"] = relationship(
        "Competency",
        foreign_keys=[prerequisite_competency_id],
        lazy="joined",
    )

    __table_args__ = (
        UniqueConstraint(
            "competency_id",
            "prerequisite_competency_id",
            name="uq_competency_prerequisite",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<CompetencyPrerequisite(competency_id={self.competency_id}, "
            f"prerequisite_id={self.prerequisite_competency_id}, min_mastery={self.minimum_mastery})>"
        )


class LearningResource(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Curated educational resource mapped to one or more competency standards.
    Supports official documentation, interactive practice, articles, courses, etc.
    """
    __tablename__ = "learning_resources"

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        doc="Resource title e.g. 'FastAPI Official Tutorial & Dependency Injection'",
    )
    provider: Mapped[str] = mapped_column(
        String(100),
        default="Official Docs",
        nullable=False,
        doc="Author or platform e.g. 'Python Software Foundation', 'MDN', 'Coursera'",
    )
    resource_type: Mapped[str] = mapped_column(
        String(30),
        default="DOCUMENTATION",
        nullable=False,
        index=True,
        doc="Type: 'COURSE' | 'VIDEO' | 'DOCUMENTATION' | 'ARTICLE' | 'BOOK' | 'PRACTICE' | 'PROJECT' | 'QUIZ'",
    )
    url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Target external or hosted content URL",
    )
    difficulty: Mapped[str] = mapped_column(
        String(20),
        default="BEGINNER",
        nullable=False,
        index=True,
        doc="Difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'",
    )
    estimated_hours: Mapped[float] = mapped_column(
        Float,
        default=2.0,
        nullable=False,
        doc="Estimated reading/working hours",
    )
    quality_score: Mapped[float] = mapped_column(
        Float,
        default=4.5,
        nullable=False,
        doc="Quality / rating benchmark score (1.0 - 5.0)",
    )
    language: Mapped[str] = mapped_column(
        String(10),
        default="en",
        nullable=False,
        doc="Content language code e.g. 'en', 'hi'",
    )
    is_free: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Whether content is freely accessible without subscription",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Brief synopsis of what this resource covers",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
        doc="Active flag",
    )

    # Relationships
    skills: Mapped[List["ResourceSkill"]] = relationship(
        "ResourceSkill",
        back_populates="resource",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<LearningResource(title='{self.title}', provider='{self.provider}', difficulty='{self.difficulty}')>"


class ResourceSkill(Base, UUIDPrimaryKeyMixin):
    """Many-to-many join mapping learning resources to standardized competencies."""
    __tablename__ = "resource_skills"

    resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("learning_resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relevance_score: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False,
        doc="Alignment score (0.0 to 1.0) of this resource to the competency",
    )

    # Relationships
    resource: Mapped["LearningResource"] = relationship(
        "LearningResource",
        back_populates="skills",
    )
    competency: Mapped["Competency"] = relationship(
        "Competency",
        lazy="joined",
    )

    __table_args__ = (
        UniqueConstraint("resource_id", "competency_id", name="uq_resource_competency"),
    )

    def __repr__(self) -> str:
        return f"<ResourceSkill(resource_id={self.resource_id}, competency_id={self.competency_id})>"


class LearningPlan(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Personalized remedial learning plan generated from BKT skill gaps for an aspiring role.
    Normally 1 active plan per candidate per aspiring role.
    """
    __tablename__ = "learning_plans"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Candidate foreign key",
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Target aspiring role benchmark",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="ACTIVE",
        nullable=False,
        index=True,
        doc="Plan status: 'ACTIVE' | 'COMPLETED' | 'ADAPTING' | 'PAUSED'",
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Generation timestamp",
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Completion timestamp when all required competencies are mastered",
    )

    # Relationships
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="learning_plans",
    )
    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="learning_plans",
        lazy="joined",
    )
    modules: Mapped[List["LearningPlanModule"]] = relationship(
        "LearningPlanModule",
        back_populates="learning_plan",
        cascade="all, delete-orphan",
        order_by="LearningPlanModule.sequence_order",
    )

    def __repr__(self) -> str:
        return f"<LearningPlan(id={self.id}, learner_id='{self.learner_id}', status='{self.status}')>"


class LearningPlanModule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Individual competency remediation module within an active Learning Plan.
    Tracks sequential order, mastery progression, BKT gaps, difficulty, and adaptation status.
    """
    __tablename__ = "learning_plan_modules"

    learning_plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("learning_plans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sequence_order: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        doc="Topological execution order in the learning plan roadmap",
    )
    prior_mastery: Mapped[float] = mapped_column(
        Float,
        default=0.30,
        nullable=False,
        doc="Initial BKT mastery when module was generated",
    )
    current_mastery: Mapped[float] = mapped_column(
        Float,
        default=0.30,
        nullable=False,
        doc="Live updated BKT mastery state",
    )
    target_mastery: Mapped[float] = mapped_column(
        Float,
        default=0.70,
        nullable=False,
        doc="Required threshold for the target role",
    )
    gap: Mapped[float] = mapped_column(
        Float,
        default=0.40,
        nullable=False,
        doc="Active gap: max(0, target_mastery - current_mastery)",
    )
    priority_score: Mapped[float] = mapped_column(
        Float,
        default=0.40,
        nullable=False,
        doc="Weighted priority: role_weight * gap",
    )
    role_weight: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False,
        doc="Importance weight from target role requirements",
    )
    estimated_hours: Mapped[float] = mapped_column(
        Float,
        default=4.0,
        nullable=False,
        doc="Estimated planning study and practice hours",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        nullable=False,
        index=True,
        doc="Status: 'PENDING' | 'IN_PROGRESS' | 'IN_PRACTICE' | 'REASSESSED' | 'MASTERED' | 'NEEDS_ADAPTATION' | 'SKIPPED'",
    )
    adaptation_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of times adaptive intervention was triggered for this module",
    )
    difficulty_level: Mapped[str] = mapped_column(
        String(20),
        default="BEGINNER",
        nullable=False,
        index=True,
        doc="Current practice difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'",
    )
    next_available_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Spaced repetition unlock timestamp if adaptation scheduled a delay",
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    learning_plan: Mapped["LearningPlan"] = relationship(
        "LearningPlan",
        back_populates="modules",
    )
    competency: Mapped["Competency"] = relationship(
        "Competency",
        lazy="joined",
    )
    reassessment_attempts: Mapped[List["ReassessmentAttempt"]] = relationship(
        "ReassessmentAttempt",
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="ReassessmentAttempt.attempted_at",
    )
    activities: Mapped[List["LearningActivity"]] = relationship(
        "LearningActivity",
        back_populates="module",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<LearningPlanModule(id={self.id}, competency_id={self.competency_id}, "
            f"order={self.sequence_order}, status='{self.status}', diff='{self.difficulty_level}')>"
        )


class ReassessmentAttempt(Base, UUIDPrimaryKeyMixin):
    """
    Log of targeted practice/reassessment submissions evaluating competency acquisition.
    Captures exact prior vs posterior BKT mastery deltas, accuracy, and adaptation decisions.
    """
    __tablename__ = "reassessment_attempts"

    learning_plan_module_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("learning_plan_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assessment_submission_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessment_submissions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Reference to standard assessment_submissions row if registered",
    )
    prior_mastery: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="BKT mastery immediately before drill attempt",
    )
    posterior_mastery: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="BKT mastery immediately after Bayesian update",
    )
    prior_gap: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Prior gap before attempt: max(0, target - prior_mastery)",
    )
    posterior_gap: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Posterior gap after attempt: max(0, target - posterior_mastery)",
    )
    gap_delta: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Gap delta: prior_gap - posterior_gap (positive = improved)",
    )
    target_mastery: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    questions_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    correct_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    accuracy: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        doc="Fraction of correct responses (0.0 to 1.0)",
    )
    result: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
        doc="Result: 'GAP_REDUCED' | 'MASTERED' | 'STAGNANT' | 'REGRESSED'",
    )
    adaptation_action: Mapped[str] = mapped_column(
        String(40),
        default="NONE",
        nullable=False,
        index=True,
        doc="Action: 'NONE' | 'DIFFICULTY_BACKOFF' | 'PREREQUISITE_REMEDIATION' | 'SPACED_REPETITION'",
    )
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # Relationships
    module: Mapped["LearningPlanModule"] = relationship(
        "LearningPlanModule",
        back_populates="reassessment_attempts",
    )
    assessment_submission: Mapped[Optional["AssessmentSubmission"]] = relationship(
        "AssessmentSubmission",
    )

    def __repr__(self) -> str:
        return (
            f"<ReassessmentAttempt(id={self.id}, result='{self.result}', "
            f"delta={self.gap_delta:+.2f}, action='{self.adaptation_action}')>"
        )


class LearningActivity(Base, UUIDPrimaryKeyMixin):
    """
    Log of candidate engagement with educational content and practice.
    Note: Activity alone NEVER modifies BKT knowledge state; only empirical assessment does.
    """
    __tablename__ = "learning_activities"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    module_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("learning_plan_modules.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    resource_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("learning_resources.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    activity_type: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        index=True,
        doc="Type: 'RESOURCE_STARTED' | 'RESOURCE_COMPLETED' | 'PRACTICE_STARTED' | 'PRACTICE_COMPLETED' | 'PROJECT_COMPLETED'",
    )
    time_spent_minutes: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Self-reported or logged engagement time in minutes",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # Relationships
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="learning_activities",
    )
    module: Mapped[Optional["LearningPlanModule"]] = relationship(
        "LearningPlanModule",
        back_populates="activities",
    )
    resource: Mapped[Optional["LearningResource"]] = relationship(
        "LearningResource",
    )

    def __repr__(self) -> str:
        return f"<LearningActivity(learner_id='{self.learner_id}', type='{self.activity_type}', minutes={self.time_spent_minutes})>"
