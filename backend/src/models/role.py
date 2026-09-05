import uuid
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import Boolean, Float, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.competency import Competency
    from src.models.learner import Learner
    from src.models.learning_plan import LearningPlan


class Role(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Target occupation / internship role standard model."""
    __tablename__ = "roles"

    code: Mapped[str] = mapped_column(
        String(60),
        unique=True,
        index=True,
        nullable=False,
        doc="Unique role code e.g. 'ROLE-PY-DEV'",
    )
    title: Mapped[str] = mapped_column(
        String(150),
        index=True,
        nullable=False,
        doc="Official job title e.g. 'Python Developer Intern'",
    )
    sector: Mapped[str] = mapped_column(
        String(100),
        default="IT-ITeS",
        index=True,
        nullable=False,
        doc="Industry sector e.g. 'IT-ITeS', 'Smart Manufacturing'",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Comprehensive job/internship description and learning outcomes",
    )
    min_experience_years: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        doc="Minimum prior experience in years (0.0 for entry-level / intern)",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Whether role is open for selection and matching",
    )

    # Relationships
    requirements: Mapped[List["RoleRequirement"]] = relationship(
        "RoleRequirement",
        back_populates="role",
        cascade="all, delete-orphan",
        order_by="RoleRequirement.weight.desc()",
    )
    aspiring_learners: Mapped[List["Learner"]] = relationship(
        "Learner",
        back_populates="aspiring_role",
    )
    learning_plans: Mapped[List["LearningPlan"]] = relationship(
        "LearningPlan",
        back_populates="role",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Role(code='{self.code}', title='{self.title}', sector='{self.sector}')>"


class RoleRequirement(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Specific skill requirement and BKT threshold for a target role."""
    __tablename__ = "role_requirements"

    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Role foreign key",
    )
    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competencies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Competency standard foreign key",
    )
    required_mastery: Mapped[float] = mapped_column(
        Float,
        default=0.70,
        nullable=False,
        doc="Target BKT mastery threshold e.g. 0.80 (80% mastery)",
    )
    importance: Mapped[str] = mapped_column(
        String(30),
        default="CRITICAL",
        nullable=False,
        doc="Importance tier: 'CRITICAL' | 'IMPORTANT' | 'NICE_TO_HAVE'",
    )
    weight: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False,
        doc="Relative weighting for match score calculation (1.0 to 3.0)",
    )

    # Relationships
    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="requirements",
    )
    competency: Mapped["Competency"] = relationship(
        "Competency",
    )

    __table_args__ = (
        UniqueConstraint("role_id", "competency_id", name="uq_role_competency"),
        Index("ix_role_requirements_role_comp", "role_id", "competency_id"),
    )

    def __repr__(self) -> str:
        return f"<RoleRequirement(role_id={self.role_id}, comp_id={self.competency_id}, req={self.required_mastery})>"
