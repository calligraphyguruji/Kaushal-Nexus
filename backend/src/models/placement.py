from datetime import date, datetime
from typing import List, Optional, TYPE_CHECKING
import uuid
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.employer import Employer, HiringMandate
    from src.models.learner import Learner
    from src.models.outcomes import PlacementSeparation


class Placement(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Verified Candidate Placement & Employment Record.
    Tracks corporate hiring, salary trajectory, and EPFO compliance.
    """
    __tablename__ = "placements"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Candidate identifier e.g. 'KN-2026-00561'",
    )
    employer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Corporate hiring partner UUID",
    )
    hiring_mandate_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hiring_mandates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Associated vacancy mandate UUID",
    )
    job_title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
        doc="Designation / role e.g. 'Junior Cloud DevOps Engineer'",
    )
    joined_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
        doc="Official date of joining at employer organization",
    )
    starting_ctc_lpa: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Starting annual compensation in Lakhs (INR), e.g. 4.2",
    )
    current_ctc_lpa: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Current updated annual compensation in Lakhs (INR)",
    )
    employment_type: Mapped[str] = mapped_column(
        String(50),
        default="Full-Time",
        nullable=False,
        doc="'Full-Time' | 'Contractual' | 'Apprenticeship'",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="Active",
        nullable=False,
        index=True,
        doc="'Active' | 'Retained (180-Day)' | 'Retained (365-Day)' | 'Separated'",
    )
    uan: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        index=True,
        doc="Universal Account Number (EPFO 12-digit ID)",
    )
    epfo_verification_status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        nullable=False,
        index=True,
        doc="'VERIFIED' | 'PENDING' | 'FAILED' | 'EXEMPTED'",
    )
    epfo_last_verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp of most recent EPFO verification query",
    )
    epfo_transaction_ref: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        doc="Audit reference ID from EPFO verification bridge",
    )

    # Relationships
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="placements",
    )
    employer: Mapped["Employer"] = relationship(
        "Employer",
        back_populates="placements",
    )
    mandate: Mapped[Optional["HiringMandate"]] = relationship("HiringMandate")
    retention_checkpoints: Mapped[List["RetentionCheckpoint"]] = relationship(
        "RetentionCheckpoint",
        back_populates="placement",
        cascade="all, delete-orphan",
        order_by="RetentionCheckpoint.milestone_months",
    )
    separations: Mapped[List["PlacementSeparation"]] = relationship(
        "PlacementSeparation",
        back_populates="placement",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_placements_learner_status", "learner_id", "status"),
        Index("ix_placements_employer_joined", "employer_id", "joined_date"),
    )

    def __repr__(self) -> str:
        return f"<Placement(id={self.id}, learner='{self.learner_id}', title='{self.job_title}', ctc={self.starting_ctc_lpa}LPA)>"


class RetentionCheckpoint(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Longitudinal Retention Milestone Checkpoint.
    Evaluated at 3M (90-Day), 6M (180-Day), and 12M (365-Day) intervals.
    """
    __tablename__ = "retention_checkpoints"

    placement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("placements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    checkpoint_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        doc="Milestone tier: '3M' | '6M' | '12M'",
    )
    milestone_months: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Milestone in months: 3, 6, or 12",
    )
    checkpoint_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
        doc="Target evaluation date for checkpoint",
    )
    is_active_at_checkpoint: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Whether candidate is active/retained at this milestone",
    )
    epfo_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="EPFO electronic passbook / active contribution verified flag",
    )
    current_ctc_lpa: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Annual CTC at this milestone checkpoint (LPA INR)",
    )
    wage_increment_percentage: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        doc="Percentage wage growth relative to starting CTC",
    )
    epfo_contribution_months: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of verified monthly EPF contribution deposits",
    )
    verification_status: Mapped[str] = mapped_column(
        String(30),
        default="VERIFIED",
        nullable=False,
        doc="'VERIFIED' | 'PENDING' | 'DISCREPANCY' | 'SEPARATED'",
    )
    remarks: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="Auditor or automated system evaluation remarks",
    )
    evaluated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp when checkpoint was evaluated",
    )

    # Relationships
    placement: Mapped["Placement"] = relationship(
        "Placement",
        back_populates="retention_checkpoints",
    )

    __table_args__ = (
        Index(
            "ix_retention_checkpoints_placement_type",
            "placement_id",
            "checkpoint_type",
            unique=True,
        ),
    )

    def __repr__(self) -> str:
        return f"<RetentionCheckpoint(placement={self.placement_id}, type='{self.checkpoint_type}', active={self.is_active_at_checkpoint}, increment={self.wage_increment_percentage}%)>"
