import uuid
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.district import District
    from src.models.training_center import TrainingCenter
    from src.models.competency import LearnerSkill
    from src.models.placement import Placement
    from src.models.consent import Consent
    from src.models.follow_up import OutcomeFollowUp
    from src.models.self_employment import SelfEmploymentOutcome
    from src.models.outcomes import NonPlacementReason


class Learner(Base, TimestampMixin):
    """Certified skilling candidate / beneficiary 360 dossier model."""
    __tablename__ = "learners"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        index=True,
        doc="Unique beneficiary identifier e.g. 'KN-2026-00561'",
    )
    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
        doc="Full legal name of candidate",
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=True,
        doc="Unique email address",
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(25),
        nullable=True,
        doc="Contact phone number",
    )
    education_level: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        doc="Highest education e.g. 'B.Sc Computer Science', 'Diploma Mechanical'",
    )
    training_center_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("training_centers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Training center foreign key",
    )
    district_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("districts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="District location foreign key",
    )
    nsqf_level: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        doc="National Skills Qualification Framework tier e.g. 'NSQF Level 5'",
    )
    employment_readiness_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Algorithmically scored readiness index (0-100)",
    )
    overall_progress: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Curriculum training completion percentage (0-100)",
    )
    ncvet_credential_id: Mapped[Optional[str]] = mapped_column(
        String(80),
        nullable=True,
        index=True,
        doc="Authenticated National Skills Registry / NCVET credential ID",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="In Training",
        nullable=False,
        index=True,
        doc="Cohort status: 'In Training' | 'Assessment Passed' | 'Interview Ready' | 'Placed & Verified' | 'Retained (180-Day)'",
    )

    # Relationships
    training_center: Mapped[Optional["TrainingCenter"]] = relationship(
        "TrainingCenter",
        back_populates="learners",
    )
    district: Mapped["District"] = relationship(
        "District",
        back_populates="learners",
    )
    skills: Mapped[List["LearnerSkill"]] = relationship(
        "LearnerSkill",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    placements: Mapped[List["Placement"]] = relationship(
        "Placement",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    consents: Mapped[List["Consent"]] = relationship(
        "Consent",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    follow_ups: Mapped[List["OutcomeFollowUp"]] = relationship(
        "OutcomeFollowUp",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    self_employment_outcomes: Mapped[List["SelfEmploymentOutcome"]] = relationship(
        "SelfEmploymentOutcome",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    non_placement_reasons: Mapped[List["NonPlacementReason"]] = relationship(
        "NonPlacementReason",
        back_populates="learner",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_learners_district_status", "district_id", "status"),
        Index("ix_learners_status_readiness", "status", "employment_readiness_score"),
    )

    def __repr__(self) -> str:
        return f"<Learner(id='{self.id}', name='{self.full_name}', readiness={self.employment_readiness_score}%)>"
