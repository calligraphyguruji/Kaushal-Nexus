import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.competency import Competency
    from src.models.district import District


class SkillGapAnalytic(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Regional & Sectoral Skill Gap deficit calculations and demand divergence."""
    __tablename__ = "skill_gap_analytics"

    district_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("districts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="District location foreign key",
    )
    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Competency standard foreign key",
    )
    employer_demand_pct: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Active employer demand index percentage (0-100)",
    )
    workforce_supply_pct: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Certified workforce supply percentage (0-100)",
    )
    deficit_pct: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        index=True,
        doc="Calculated deficit: employer_demand_pct - workforce_supply_pct",
    )
    severity: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
        doc="Severity: 'Critical' | 'High' | 'Moderate' | 'Aligned'",
    )
    learners_affected: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of registered candidates in district requiring this competency",
    )
    priority_rank: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        index=True,
        doc="Intervention priority ranking score",
    )
    suggested_action: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Recommended policy or curriculum intervention",
    )

    # Relationships
    district: Mapped["District"] = relationship("District")
    competency: Mapped["Competency"] = relationship("Competency")

    __table_args__ = (
        Index("ix_skill_gap_district_severity", "district_id", "severity"),
        Index("ix_skill_gap_deficit_severity", "deficit_pct", "severity"),
    )

    def __repr__(self) -> str:
        return f"<SkillGapAnalytic(district='{self.district_id}', deficit={self.deficit_pct}%, severity='{self.severity}')>"


class SkillGapIntervention(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Policy, curriculum, or training center intervention deployed to close identified skill gaps."""
    __tablename__ = "skill_gap_interventions"

    district_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("districts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competencies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    intervention_type: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
        index=True,
        doc="'BRIDGE_COURSE' | 'TRAINER_DEPLOYMENT' | 'LAB_EQUIPMENT_UPGRADE' | 'CURRICULUM_UPDATE'",
    )
    target_capacity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Number of learner seats targeted",
    )
    budget_allocated_inr: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        doc="Allocated budget in INR",
    )
    target_completion_weeks: Mapped[int] = mapped_column(
        Integer,
        default=4,
        nullable=False,
        doc="Target completion duration in weeks",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="DEPLOYED",
        nullable=False,
        index=True,
        doc="'DEPLOYED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'",
    )
    deployed_by: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
        doc="User or officer executing the intervention",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    district: Mapped["District"] = relationship("District")
    competency: Mapped["Competency"] = relationship("Competency")

    def __repr__(self) -> str:
        return f"<SkillGapIntervention(id={self.id}, type='{self.intervention_type}', status='{self.status}')>"
