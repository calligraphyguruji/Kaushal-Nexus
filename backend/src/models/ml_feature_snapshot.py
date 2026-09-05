from datetime import datetime, timezone
from typing import Any, Dict, Optional, TYPE_CHECKING
import uuid
from sqlalchemy import DateTime, ForeignKey, Index, JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.learner import Learner
    from src.models.role import Role


class MLFeatureSnapshot(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Immutable historical tabular feature snapshot frozen at a designated prediction cutoff time T.
    Guarantees strict zero data leakage for XGBoost / supervised learning models by capturing
    only the information available at or before T.
    """
    __tablename__ = "ml_feature_snapshots"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Candidate identifier",
    )
    snapshot_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        doc="Date snapshot was taken",
    )
    prediction_cutoff: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        doc="Strict prediction cutoff timestamp: no feature may use data occurring after this cutoff",
    )
    role_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Target role used for feature calibration if applicable",
    )
    feature_version: Mapped[str] = mapped_column(
        String(20),
        default="v1",
        nullable=False,
        index=True,
        doc="Feature schema version (e.g. 'v1', 'v2') for reproducible XGBoost experiments",
    )
    features_json: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        doc="Complete dictionary of extracted numerical and categorical features",
    )

    # Relationships
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="feature_snapshots",
    )
    role: Mapped[Optional["Role"]] = relationship("Role")

    __table_args__ = (
        Index("ix_ml_snapshots_learner_cutoff", "learner_id", "prediction_cutoff"),
        Index("ix_ml_snapshots_version_cutoff", "feature_version", "prediction_cutoff"),
    )

    def __repr__(self) -> str:
        return (
            f"<MLFeatureSnapshot(learner='{self.learner_id}', "
            f"version='{self.feature_version}', cutoff='{self.prediction_cutoff}')>"
        )
