from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
import uuid
from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.learner import Learner
    from src.models.role import Role


class LearnerOutcome(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Ground-truth longitudinal outcome record for a learner.
    Stored strictly downstream and separately from pre-prediction features to guarantee
    zero data leakage for XGBoost / ML tabular models.
    """
    __tablename__ = "learner_outcomes"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Candidate beneficiary identifier e.g. 'KN-2026-00561'",
    )
    role_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Target role associated with outcome, if applicable",
    )
    outcome_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Outcome milestone e.g. 'INTERNSHIP_OFFER' | 'INTERNSHIP_PLACED' | 'ASSESSMENT_COMPLETED' | 'RETAINED_90_DAY' | 'NOT_PLACED'",
    )
    outcome_value: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False,
        doc="Numerical outcome representation (e.g. 1.0 for binary placement, or salary/score)",
    )
    outcome_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="Timestamp when outcome event officially occurred",
    )
    source: Mapped[str] = mapped_column(
        String(100),
        default="DIRECT_PORTAL",
        nullable=False,
        doc="Verification source e.g. 'DIRECT_PORTAL' | 'EPFO_INTEGRATION' | 'EMPLOYER_SUBMISSION' | 'NCVET_AUDIT'",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="VERIFIED",
        server_default="VERIFIED",
        nullable=False,
        doc="Verification status: 'PENDING' | 'VERIFIED' | 'REJECTED'",
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        server_default="1.0",
        nullable=False,
        doc="Confidence weighting based on source attribution (0.0 - 1.0)",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Auditor or employer notes regarding outcome",
    )

    # Relationships
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="outcomes",
    )
    role: Mapped[Optional["Role"]] = relationship(
        "Role",
    )

    __table_args__ = (
        Index("ix_learner_outcomes_type_date", "outcome_type", "outcome_date"),
    )

    def __repr__(self) -> str:
        return f"<LearnerOutcome(learner='{self.learner_id}', type='{self.outcome_type}', val={self.outcome_value})>"
