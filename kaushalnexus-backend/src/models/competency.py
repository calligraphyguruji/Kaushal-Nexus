import uuid
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.learner import Learner


class Competency(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """National competency standard & skill dictionary model."""
    __tablename__ = "competencies"

    code: Mapped[str] = mapped_column(
        String(60),
        unique=True,
        index=True,
        nullable=False,
        doc="Standardized competency code e.g. 'COMP-DATA-PY'",
    )
    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
        doc="Competency skill name e.g. 'Python for Analytics'",
    )
    sector: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="Industry sector e.g. 'IT-ITeS', 'Smart Manufacturing'",
    )
    nqr_code: Mapped[Optional[str]] = mapped_column(
        String(80),
        nullable=True,
        index=True,
        doc="National Qualifications Register reference code",
    )

    # Relationships
    learner_skills: Mapped[List["LearnerSkill"]] = relationship(
        "LearnerSkill",
        back_populates="competency",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_competencies_sector_code", "sector", "code"),
    )

    def __repr__(self) -> str:
        return f"<Competency(code='{self.code}', name='{self.name}', sector='{self.sector}')>"


class LearnerSkill(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Verified competency assessment score attained by a candidate."""
    __tablename__ = "learner_skills"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Learner foreign key",
    )
    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Competency foreign key",
    )
    score_percentage: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Verified assessment score (0-100)",
    )
    verified_by: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
        doc="Accrediting assessment agency / lab name",
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="NCVET verification flag",
    )
    assessed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp when assessment was verified",
    )

    # Relationships
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="skills",
    )
    competency: Mapped["Competency"] = relationship(
        "Competency",
        back_populates="learner_skills",
    )

    __table_args__ = (
        UniqueConstraint("learner_id", "competency_id", name="uq_learner_competency"),
        Index("ix_learner_skills_score", "score_percentage"),
        Index("ix_learner_skills_verified", "is_verified"),
    )

    def __repr__(self) -> str:
        return f"<LearnerSkill(learner_id='{self.learner_id}', score={self.score_percentage}%)>"
