import uuid
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import Boolean, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.district import District
    from src.models.learner import Learner


class TrainingCenter(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Accredited vocational training partner / PMKK center model."""
    __tablename__ = "training_centers"

    center_code: Mapped[str] = mapped_column(
        String(60),
        unique=True,
        index=True,
        nullable=False,
        doc="Accreditation code e.g. 'PMKK-VARANASI-01'",
    )
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True,
        doc="Training center institution name",
    )
    district_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("districts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="District location foreign key",
    )
    address: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Physical address",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Center accreditation active status",
    )

    # Relationships
    district: Mapped["District"] = relationship(
        "District",
        back_populates="training_centers",
    )
    learners: Mapped[List["Learner"]] = relationship(
        "Learner",
        back_populates="training_center",
    )

    __table_args__ = (
        Index("ix_training_centers_district_active", "district_id", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<TrainingCenter(code='{self.center_code}', name='{self.name}')>"
