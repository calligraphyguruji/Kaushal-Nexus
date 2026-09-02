from datetime import date, datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.district import District
    from src.models.learner import Learner


class SelfEmploymentVerificationStatus(str, Enum):
    """Authoritative self-employment verification statuses."""
    SELF_REPORTED = "SELF_REPORTED"
    DOCUMENT_VERIFIED = "DOCUMENT_VERIFIED"
    ADMIN_VERIFIED = "ADMIN_VERIFIED"
    PENDING = "PENDING"


class BusinessStatus(str, Enum):
    """Enterprise operational viability state."""
    OPERATIONAL = "Operational"
    SCALING = "Scaling"
    EARLY_STAGE = "Early Stage"
    INACTIVE = "Inactive"


class SelfEmploymentOutcome(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Candidate Self-Employment & Micro-Enterprise Outcome Record.
    Tracks entrepreneurial ventures, micro-enterprises, monthly revenue bands,
    and institutional verification details without exposing sensitive bank PII.
    """
    __tablename__ = "self_employment_outcomes"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Candidate beneficiary identifier e.g. 'KN-2026-00561'",
    )
    enterprise_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        doc="Trading name of venture / enterprise",
    )
    business_activity: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        doc="Nature of business or trade activity e.g. 'Electrical Contracting & Repair'",
    )
    sector: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="Industry domain e.g. 'Electronics & Hardware'",
    )
    district_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("districts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Operating district location",
    )
    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
        doc="Date commercial operations commenced",
    )
    monthly_income_range: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        doc="Monthly net earnings bracket e.g. '₹15,000 - ₹25,000'",
    )
    business_status: Mapped[str] = mapped_column(
        String(50),
        default=BusinessStatus.OPERATIONAL.value,
        nullable=False,
        doc="Current enterprise viability status",
    )
    verification_status: Mapped[str] = mapped_column(
        String(30),
        default=SelfEmploymentVerificationStatus.SELF_REPORTED.value,
        nullable=False,
        index=True,
        doc="SELF_REPORTED | DOCUMENT_VERIFIED | ADMIN_VERIFIED | PENDING",
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp of field / document verification",
    )
    verified_by_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        doc="User ID or email of verifying evaluator/admin",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Field officer or assessor verification notes",
    )

    # Relationships
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="self_employment_outcomes",
    )
    district: Mapped["District"] = relationship("District")

    __table_args__ = (
        Index("ix_self_emp_learner_status", "learner_id", "verification_status"),
        Index("ix_self_emp_sector_district", "sector", "district_id"),
    )

    def __repr__(self) -> str:
        return f"<SelfEmploymentOutcome(id={self.id}, learner='{self.learner_id}', enterprise='{self.enterprise_name}', status='{self.verification_status}')>"
