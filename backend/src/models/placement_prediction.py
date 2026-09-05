from datetime import datetime, timezone
from typing import Any, Dict, Optional, TYPE_CHECKING
import uuid
from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.learner import Learner


class PlacementPrediction(Base):
    """
    Audit record of calibrated XGBoost placement probability and readiness scores.
    Enables tracking prediction drift, calibration stability, and outcome feedback.
    """
    __tablename__ = "placement_predictions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    model_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="Model version identifier e.g. 'xgb-placement-v1.0'",
    )
    target: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="INTERNSHIP_ACCEPTED",
    )
    probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Calibrated posterior probability P(Placement <= T + 90d)",
    )
    feature_version: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="v1",
    )
    prediction_timestamp: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    readiness_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        doc="Multi-component career readiness score [0.0, 1.0]",
    )
    prediction_context: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        doc="Drivers, risk factors, top features snapshot",
    )
    actual_outcome: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        doc="Empirically verified outcome e.g. 'INTERNSHIP_ACCEPTED', 'EMPLOYMENT_ACCEPTED'",
    )
    actual_outcome_date: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
    )
    outcome_matched_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
    )

    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="placement_predictions",
    )

    __table_args__ = (
        Index("ix_pred_model_time", "model_id", "prediction_timestamp"),
        Index("ix_pred_learner_time", "learner_id", "prediction_timestamp"),
    )


class ModelMonitoringSnapshot(Base):
    """
    Longitudinal snapshot of model health, calibration quality, and feature drift.
    """
    __tablename__ = "model_monitoring_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    model_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    evaluation_date: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    prediction_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    mean_probability: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    actual_outcome_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    roc_auc: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pr_auc: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    brier_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ece: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    drift_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="NORMAL",
    )
    monitoring_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="HEALTHY",
    )
    metrics_json: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
    )


class ModelPromotionEvent(Base):
    """
    Audit log of model promotion, rollback, and retirement operations.
    """
    __tablename__ = "model_promotion_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    model_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    previous_model_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        doc="'PROMOTED', 'ROLLED_BACK', 'RETIRED'",
    )
    actor_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
    )
