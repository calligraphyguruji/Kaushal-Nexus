from datetime import datetime, timezone
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.learner import Learner


class FollowUpType(str, Enum):
    """Longitudinal milestone follow-up categories."""
    POST_TRAINING = "POST_TRAINING"
    THIRTY_DAY = "30_DAY"
    NINETY_DAY = "90_DAY"
    ONE_EIGHTY_DAY = "180_DAY"
    THREE_SIXTY_FIVE_DAY = "365_DAY"
    RETENTION_CHECK = "RETENTION_CHECK"
    WAGE_CHECK = "WAGE_CHECK"
    PLACEMENT_CHECK = "PLACEMENT_CHECK"


class FollowUpStatus(str, Enum):
    """Lifecycle status of follow-up outreach."""
    SCHEDULED = "SCHEDULED"
    SENT = "SENT"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"
    CANCELLED = "CANCELLED"


class FollowUpChannel(str, Enum):
    """Outreach channel mechanism."""
    IN_APP = "IN_APP"
    EMAIL = "EMAIL"
    SMS = "SMS"
    ASSISTED_CALL = "ASSISTED_CALL"


class OutcomeResponseCategory(str, Enum):
    """Candidate response outcome classification."""
    EMPLOYED = "EMPLOYED"
    SELF_EMPLOYED = "SELF_EMPLOYED"
    APPRENTICESHIP = "APPRENTICESHIP"
    UNEMPLOYED = "UNEMPLOYED"
    FURTHER_EDUCATION = "FURTHER_EDUCATION"
    JOB_SEARCHING = "JOB_SEARCHING"
    UNKNOWN = "UNKNOWN"


class OutcomeFollowUp(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Automated & Assisted Longitudinal Outcome Follow-up Record.
    Tracks scheduled and completed outreach to vocational beneficiaries
    to assess sustained post-skilling employment, self-employment, and wages.
    """
    __tablename__ = "outcome_follow_ups"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Candidate beneficiary identifier e.g. 'KN-2026-00561'",
    )
    follow_up_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Interval tier: POST_TRAINING | 30_DAY | 90_DAY | 180_DAY | 365_DAY | RETENTION_CHECK | WAGE_CHECK | PLACEMENT_CHECK",
    )
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        doc="Target calendar date/time when follow-up outreach is due",
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp when outreach was dispatched",
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp when response was collected and verified",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default=FollowUpStatus.SCHEDULED.value,
        nullable=False,
        index=True,
        doc="SCHEDULED | SENT | COMPLETED | FAILED | SKIPPED | CANCELLED",
    )
    channel: Mapped[str] = mapped_column(
        String(30),
        default=FollowUpChannel.IN_APP.value,
        nullable=False,
        doc="Communication channel: IN_APP | EMAIL | SMS | ASSISTED_CALL",
    )
    response_status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        doc="Beneficiary status: EMPLOYED | SELF_EMPLOYED | APPRENTICESHIP | UNEMPLOYED | FURTHER_EDUCATION | JOB_SEARCHING | UNKNOWN",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Counselor or system observation notes",
    )
    attempt_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of outreach attempts made",
    )

    # Relationship
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="follow_ups",
    )

    __table_args__ = (
        Index("ix_follow_ups_learner_status", "learner_id", "status"),
        Index("ix_follow_ups_scheduled_status", "scheduled_at", "status"),
    )

    def __repr__(self) -> str:
        return f"<OutcomeFollowUp(id={self.id}, learner='{self.learner_id}', type='{self.follow_up_type}', status='{self.status}')>"
