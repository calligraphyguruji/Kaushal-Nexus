from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional, TYPE_CHECKING
import uuid
from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.learner import Learner
    from src.models.placement import Placement, RetentionCheckpoint


class NonPlacementReasonType(str, Enum):
    """Categorized diagnostic non-placement factors."""
    SKILL_GAP = "SKILL_GAP"
    NO_SUITABLE_VACANCY = "NO_SUITABLE_VACANCY"
    INTERVIEW_FAILURE = "INTERVIEW_FAILURE"
    LOCATION_CONSTRAINT = "LOCATION_CONSTRAINT"
    SALARY_EXPECTATION = "SALARY_EXPECTATION"
    DOCUMENTATION_ISSUE = "DOCUMENTATION_ISSUE"
    CANDIDATE_WITHDREW = "CANDIDATE_WITHDREW"
    COMMUNICATION_ISSUE = "COMMUNICATION_ISSUE"
    PERSONAL_REASON = "PERSONAL_REASON"
    OTHER = "OTHER"


class OutcomeSource(str, Enum):
    """Source capturing the outcome feedback."""
    LEARNER = "LEARNER"
    TRAINING_PROVIDER = "TRAINING_PROVIDER"
    EMPLOYER = "EMPLOYER"
    ADMIN = "ADMIN"
    SYSTEM = "SYSTEM"


class AttritionReasonType(str, Enum):
    """Structured job separation and attrition drivers."""
    BETTER_OPPORTUNITY = "BETTER_OPPORTUNITY"
    LOW_SALARY = "LOW_SALARY"
    RELOCATION = "RELOCATION"
    WORK_ENVIRONMENT = "WORK_ENVIRONMENT"
    PERSONAL_REASON = "PERSONAL_REASON"
    SKILL_MISMATCH = "SKILL_MISMATCH"
    EMPLOYER_TERMINATION = "EMPLOYER_TERMINATION"
    CONTRACT_ENDED = "CONTRACT_ENDED"
    HEALTH_OR_FAMILY_REASON = "HEALTH_OR_FAMILY_REASON"
    FURTHER_EDUCATION = "FURTHER_EDUCATION"
    OTHER = "OTHER"


class NonPlacementReason(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Diagnostic Record for Unplaced or Delayed Placement Candidates.
    Captures exact bottleneck reasons (skill deficits, relocation constraints, interview rejections)
    to power predictive skill-gap intelligence and targeted bridge interventions.
    """
    __tablename__ = "non_placement_reasons"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Candidate beneficiary identifier e.g. 'KN-2026-00561'",
    )
    reason: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Categorized factor e.g. 'SKILL_GAP' | 'INTERVIEW_FAILURE'",
    )
    source: Mapped[str] = mapped_column(
        String(30),
        default=OutcomeSource.TRAINING_PROVIDER.value,
        nullable=False,
        doc="Reporting source: LEARNER | TRAINING_PROVIDER | EMPLOYER | ADMIN | SYSTEM",
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="Timestamp when bottleneck was documented",
    )
    recorded_by: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        doc="User ID or email of recorder",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Contextual notes / feedback from hiring panel or counselor",
    )
    associated_skill_code: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        doc="Optional link to specific competency deficit code e.g. 'COMP-GENAI-01'",
    )

    # Relationship
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="non_placement_reasons",
    )

    __table_args__ = (
        Index("ix_non_placement_learner_reason", "learner_id", "reason"),
    )

    def __repr__(self) -> str:
        return f"<NonPlacementReason(id={self.id}, learner='{self.learner_id}', reason='{self.reason}')>"


class PlacementSeparation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Verified Employment Attrition / Job Separation Record.
    Associates corporate employee turnover with longitudinal retention checkpoints
    (3M, 6M, 12M) to determine root causes such as skill mismatch, compensation, or migration.
    """
    __tablename__ = "placement_separations"

    placement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("placements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Placement record identifier",
    )
    checkpoint_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("retention_checkpoints.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Associated milestone checkpoint where separation occurred",
    )
    reason: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="BETTER_OPPORTUNITY | LOW_SALARY | RELOCATION | WORK_ENVIRONMENT | SKILL_MISMATCH | EMPLOYER_TERMINATION | CONTRACT_ENDED | HEALTH_OR_FAMILY_REASON | FURTHER_EDUCATION | OTHER",
    )
    separation_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
        doc="Effective date employment ceased",
    )
    source: Mapped[str] = mapped_column(
        String(30),
        default=OutcomeSource.EMPLOYER.value,
        nullable=False,
        doc="LEARNER | EMPLOYER | TRAINING_PROVIDER | ADMIN",
    )
    recorded_by: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        doc="User ID or email recording the separation",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Exit interview or employer notification notes",
    )
    associated_skill_gap: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        doc="Identified skill deficiency if reason is SKILL_MISMATCH",
    )

    # Relationships
    placement: Mapped["Placement"] = relationship(
        "Placement",
        back_populates="separations",
    )
    checkpoint: Mapped[Optional["RetentionCheckpoint"]] = relationship("RetentionCheckpoint")

    __table_args__ = (
        Index("ix_placement_separations_placement_date", "placement_id", "separation_date"),
        Index("ix_placement_separations_reason", "reason"),
    )

    def __repr__(self) -> str:
        return f"<PlacementSeparation(id={self.id}, placement={self.placement_id}, reason='{self.reason}')>"
