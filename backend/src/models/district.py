from typing import List, TYPE_CHECKING
from sqlalchemy import Float, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.training_center import TrainingCenter
    from src.models.learner import Learner


class District(Base, TimestampMixin):
    """Geospatial district and administrative region model."""
    __tablename__ = "districts"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        index=True,
        doc="District code e.g. 'UP-VARANASI'",
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="District name e.g. 'Varanasi'",
    )
    state: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="State name e.g. 'Uttar Pradesh'",
    )
    region: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="Geographic cluster e.g. 'Eastern UP'",
    )
    tier: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        doc="Performance tier e.g. 'Tier 1', 'Tier 2', 'Tier 3'",
    )
    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=True,
        doc="District center latitude",
    )
    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=True,
        doc="District center longitude",
    )

    # Relationships
    training_centers: Mapped[List["TrainingCenter"]] = relationship(
        "TrainingCenter",
        back_populates="district",
        cascade="all, delete-orphan",
    )
    learners: Mapped[List["Learner"]] = relationship(
        "Learner",
        back_populates="district",
    )

    __table_args__ = (
        Index("ix_districts_state_region", "state", "region"),
        Index("ix_districts_tier_region", "tier", "region"),
    )

    def __repr__(self) -> str:
        return f"<District(id='{self.id}', name='{self.name}', tier='{self.tier}')>"
