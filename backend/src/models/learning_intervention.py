from datetime import datetime, timezone
from typing import Any, Dict, Optional, TYPE_CHECKING
import uuid
from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.competency import Competency
    from src.models.learner import Learner
    from src.models.role import Role


class LearningIntervention(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Tracks educational and career interventions from recommendation through execution and outcomes.
    Connects:
      Recommendation -> Intervention -> Learner Action -> Skill Change -> Career Event -> Outcome
    """
    __tablename__ = "learning_interventions"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Candidate beneficiary identifier e.g. 'KN-2026-00561'",
    )
    competency_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competencies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Target competency if intervention is skill-specific",
    )
    role_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Target role benchmark if applicable",
    )
    intervention_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc=(
            "Type: 'PRACTICE_DRILL' | 'LEARNING_MODULE' | 'PROJECT' | "
            "'REASSESSMENT' | 'INTERVIEW_PREPARATION' | 'APPLICATION_SUPPORT' | "
            "'ROLE_ALIGNMENT' | 'RESUME_IMPROVEMENT'"
        ),
    )
    source: Mapped[str] = mapped_column(
        String(50),
        default="CAREER_INTELLIGENCE",
        nullable=False,
        index=True,
        doc="Trigger source: 'CAREER_INTELLIGENCE' | 'EARLY_WARNING' | 'ADAPTIVE_LOOP' | 'MANUAL_STAFF' | 'SELF_DIRECTED'",
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Short human-readable action title",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Detailed intervention guidance or syllabus",
    )
    recommended_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        doc="Timestamp when action was recommended to the learner",
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp when learner commenced intervention activity",
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp when intervention was finalized / completed",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="RECOMMENDED",
        nullable=False,
        index=True,
        doc="Status: 'RECOMMENDED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'SKIPPED'",
    )
    estimated_hours: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False,
        doc="Expected duration in hours",
    )
    actual_hours: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        doc="Observed time logged on intervention",
    )
    baseline_mastery: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        doc="BKT skill mastery immediately preceding intervention start",
    )
    final_mastery: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        doc="BKT skill mastery following intervention completion",
    )
    baseline_gap: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        doc="Target role skill gap immediately preceding intervention",
    )
    final_gap: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        doc="Target role skill gap after intervention completion",
    )
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default="{}",
        nullable=False,
        doc="Contextual parameters (module IDs, drill difficulty, reason codes, etc.)",
    )

    # Relationships
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="interventions",
    )
    competency: Mapped[Optional["Competency"]] = relationship(
        "Competency",
    )
    role: Mapped[Optional["Role"]] = relationship(
        "Role",
    )

    __table_args__ = (
        Index("ix_interventions_learner_status", "learner_id", "status"),
        Index("ix_interventions_type_status", "intervention_type", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<LearningIntervention(id={self.id}, learner='{self.learner_id}', "
            f"type='{self.intervention_type}', status='{self.status}')>"
        )
