from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
import uuid
from sqlalchemy import ARRAY, Boolean, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.district import District
    from src.models.placement import Placement


class Employer(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Corporate hiring partner and industry network entity model."""
    __tablename__ = "employers"

    company_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
        doc="Corporate entity legal/trading name",
    )
    industry_sector: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="Industry sector: 'IT-ITeS' | 'Automotive' | 'Renewable Energy' | 'Healthcare' | 'Logistics'",
    )
    tier: Mapped[str] = mapped_column(
        String(30),
        default="Enterprise",
        nullable=False,
        index=True,
        doc="Employer tier: 'Enterprise' | 'Mid-Market' | 'Startup' | 'PSU'",
    )
    contact_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    contact_person: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Partner onboarding active status",
    )

    # Relationships
    mandates: Mapped[List["HiringMandate"]] = relationship(
        "HiringMandate",
        back_populates="employer",
        cascade="all, delete-orphan",
    )
    placements: Mapped[List["Placement"]] = relationship(
        "Placement",
        back_populates="employer",
    )

    def __repr__(self) -> str:
        return f"<Employer(id={self.id}, name='{self.company_name}', sector='{self.industry_sector}')>"


class HiringMandate(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Active corporate job vacancy mandate and competency requirements model."""
    __tablename__ = "hiring_mandates"

    employer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
        doc="Job role e.g. 'Junior Cloud Operations Analyst'",
    )
    sector: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    district_id: Mapped[Optional[str]] = mapped_column(
        String(50),
        ForeignKey("districts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Target employment location district code",
    )
    state: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="Target deployment state e.g. 'Uttar Pradesh'",
    )
    openings_count: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False,
        doc="Number of verified job openings",
    )
    min_nsqf_level: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        doc="Minimum acceptable NSQF certification tier",
    )
    required_competencies_json: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="JSON list of required competency codes/names e.g. ['COMP-DATA-PY', 'COMP-CLOUD-AWS']",
    )
    salary_min_lpa: Mapped[float] = mapped_column(
        Float,
        default=3.0,
        nullable=False,
        doc="Minimum annual compensation (LPA INR)",
    )
    salary_max_lpa: Mapped[float] = mapped_column(
        Float,
        default=4.5,
        nullable=False,
        doc="Maximum annual compensation (LPA INR)",
    )
    retention_benchmark_days: Mapped[int] = mapped_column(
        Integer,
        default=180,
        nullable=False,
        doc="Longitudinal retention milestone target in days",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
        doc="Active hiring status flag",
    )

    # Relationships
    employer: Mapped["Employer"] = relationship(
        "Employer",
        back_populates="mandates",
    )
    district: Mapped[Optional["District"]] = relationship("District")

    __table_args__ = (
        Index("ix_hiring_mandates_sector_state", "sector", "state"),
        Index("ix_hiring_mandates_active_sector", "is_active", "sector"),
    )

    def __repr__(self) -> str:
        return f"<HiringMandate(id={self.id}, title='{self.job_title}', employer='{self.employer_id}')>"
