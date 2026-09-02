from datetime import datetime, timezone
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.learner import Learner


class ConsentType(str, Enum):
    """Authoritative skilling beneficiary data collection consent categories."""
    EMPLOYMENT_TRACKING = "EMPLOYMENT_TRACKING"
    WAGE_TRACKING = "WAGE_TRACKING"
    RETENTION_TRACKING = "RETENTION_TRACKING"
    ANALYTICS = "ANALYTICS"
    GOVERNMENT_REPORTING = "GOVERNMENT_REPORTING"
    FOLLOW_UP_COMMUNICATION = "FOLLOW_UP_COMMUNICATION"


class Consent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Candidate Consent & Privacy Authorization Record.
    Tracks explicit beneficiary permission for longitudinal tracking,
    salary verification, outcome follow-ups, and statutory reporting.
    """
    __tablename__ = "consents"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Candidate beneficiary identifier e.g. 'KN-2026-00561'",
    )
    consent_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Category: EMPLOYMENT_TRACKING | WAGE_TRACKING | RETENTION_TRACKING | ANALYTICS | GOVERNMENT_REPORTING | FOLLOW_UP_COMMUNICATION",
    )
    purpose: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Clear, transparent reason for data collection",
    )
    granted: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Whether consent is active and granted",
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        doc="Timestamp when consent was granted",
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp when consent was revoked by candidate or admin",
    )
    version: Mapped[str] = mapped_column(
        String(20),
        default="v1.0",
        nullable=False,
        doc="Privacy policy / terms version e.g. 'v1.0'",
    )
    source: Mapped[str] = mapped_column(
        String(50),
        default="LEARNER_PORTAL",
        nullable=False,
        doc="Capture source: LEARNER_PORTAL | REGISTRATION_FORM | SMS_CONSENT | ASSISTED_ADMIN",
    )

    # Relationship
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="consents",
    )

    __table_args__ = (
        Index("ix_consents_learner_type", "learner_id", "consent_type"),
        Index("ix_consents_learner_granted", "learner_id", "granted"),
    )

    def __repr__(self) -> str:
        return f"<Consent(id={self.id}, learner='{self.learner_id}', type='{self.consent_type}', granted={self.granted})>"
