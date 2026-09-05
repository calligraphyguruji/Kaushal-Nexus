import csv
from datetime import datetime, timedelta, timezone
import io
from typing import Any, Dict, List, Optional, Tuple
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import logger
from src.models.career_event import (
    ApplicationStatus,
    CareerApplication,
    CareerEvent,
    CareerEventType,
)
from src.models.learner_outcome import LearnerOutcome
from src.models.ml_feature_snapshot import MLFeatureSnapshot
from src.schemas.career_outcome_dto import (
    MLDatasetExportResponseDTO,
    MLDatasetRowDTO,
)


class OutcomeLabelService:
    """
    Supervised Learning Label Generation Service with Strict Forward Observation Windows.
    
    PREVENTS LABEL LEAKAGE:
    Evaluates whether a target career milestone actually occurred within a forward prediction window
    (T, T + horizon_days] strictly following the feature cutoff T.
    The future label is NEVER incorporated into the feature vector.
    """

    DEFAULT_HORIZON_DAYS = 90

    # Categorized positive target definitions
    TARGET_OUTCOME_TYPES = {
        "INTERNSHIP_ACCEPTED": {
            "outcomes": ["INTERNSHIP_ACCEPTED", "INTERNSHIP_PLACED", "INTERNSHIP_OFFER"],
            "events": [
                CareerEventType.INTERNSHIP_ACCEPTED.value,
                CareerEventType.INTERNSHIP_COMPLETED.value,
            ],
            "app_statuses": [ApplicationStatus.ACCEPTED.value],
        },
        "EMPLOYMENT_ACCEPTED": {
            "outcomes": ["EMPLOYMENT_ACCEPTED", "EMPLOYMENT_OFFERED", "PLACED"],
            "events": [
                CareerEventType.EMPLOYMENT_ACCEPTED.value,
                CareerEventType.PLACED.value,
            ],
            "app_statuses": [ApplicationStatus.ACCEPTED.value],
        },
        "PLACED": {
            "outcomes": ["PLACED", "INTERNSHIP_PLACED", "EMPLOYMENT_ACCEPTED"],
            "events": [
                CareerEventType.PLACED.value,
                CareerEventType.INTERNSHIP_COMPLETED.value,
            ],
            "app_statuses": [ApplicationStatus.ACCEPTED.value],
        },
    }

    @classmethod
    async def evaluate_future_label(
        cls,
        db: AsyncSession,
        learner_id: str,
        cutoff: datetime,
        label_type: str = "INTERNSHIP_ACCEPTED",
        horizon_days: int = DEFAULT_HORIZON_DAYS,
    ) -> Tuple[int, Optional[datetime]]:
        """
        Determines if a candidate achieved a target milestone strictly within the forward window:
        cutoff < event_date <= cutoff + horizon_days.
        Returns: (label: 0 or 1, earliest_outcome_date: Optional[datetime])
        """
        config = cls.TARGET_OUTCOME_TYPES.get(label_type, cls.TARGET_OUTCOME_TYPES["INTERNSHIP_ACCEPTED"])
        window_end = cutoff + timedelta(days=horizon_days)

        qualifying_dates: List[datetime] = []

        # 1. Check LearnerOutcome ground truth (verified or high-confidence)
        o_stmt = (
            select(LearnerOutcome)
            .where(
                LearnerOutcome.learner_id == learner_id,
                LearnerOutcome.outcome_type.in_(config["outcomes"]),
                LearnerOutcome.outcome_date > cutoff,
                LearnerOutcome.outcome_date <= window_end,
                LearnerOutcome.status != "REJECTED",
            )
        )
        o_res = await db.execute(o_stmt)
        for o in o_res.scalars().all():
            qualifying_dates.append(o.outcome_date)

        # 2. Check CareerEvents
        e_stmt = (
            select(CareerEvent)
            .where(
                CareerEvent.learner_id == learner_id,
                CareerEvent.event_type.in_(config["events"]),
                CareerEvent.event_date > cutoff,
                CareerEvent.event_date <= window_end,
            )
        )
        e_res = await db.execute(e_stmt)
        for e in e_res.scalars().all():
            qualifying_dates.append(e.event_date)

        # 3. Check CareerApplications with accepted status
        a_stmt = (
            select(CareerApplication)
            .where(
                CareerApplication.learner_id == learner_id,
                CareerApplication.status.in_(config["app_statuses"]),
                CareerApplication.updated_at > cutoff,
                CareerApplication.updated_at <= window_end,
            )
        )
        a_res = await db.execute(a_stmt)
        for a in a_res.scalars().all():
            qualifying_dates.append(a.updated_at)

        if qualifying_dates:
            earliest = min(qualifying_dates)
            return 1, earliest

        return 0, None

    @classmethod
    async def build_ml_dataset(
        cls,
        db: AsyncSession,
        feature_version: str = "v1",
        label_type: str = "INTERNSHIP_ACCEPTED",
        horizon_days: int = DEFAULT_HORIZON_DAYS,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> MLDatasetExportResponseDTO:
        """
        Constructs a leakage-free supervised training dataset pairing historical snapshots
        at cutoff T with future empirical ground-truth outcomes within (T, T + horizon_days].
        """
        start_time = datetime.now(timezone.utc)

        stmt = select(MLFeatureSnapshot).where(
            MLFeatureSnapshot.feature_version == feature_version
        )
        if date_from:
            stmt = stmt.where(MLFeatureSnapshot.prediction_cutoff >= date_from)
        if date_to:
            stmt = stmt.where(MLFeatureSnapshot.prediction_cutoff <= date_to)

        stmt = stmt.order_by(MLFeatureSnapshot.prediction_cutoff.asc())
        res = await db.execute(stmt)
        snapshots = res.scalars().all()

        rows: List[MLDatasetRowDTO] = []
        positive_count = 0
        negative_count = 0
        all_feature_keys = set()

        for s in snapshots:
            label, observed_date = await cls.evaluate_future_label(
                db=db,
                learner_id=s.learner_id,
                cutoff=s.prediction_cutoff,
                label_type=label_type,
                horizon_days=horizon_days,
            )
            if label == 1:
                positive_count += 1
            else:
                negative_count += 1

            all_feature_keys.update(s.features_json.keys())

            rows.append(
                MLDatasetRowDTO(
                    learner_id=s.learner_id,
                    snapshot_id=s.id,
                    snapshot_date=s.snapshot_date,
                    prediction_cutoff=s.prediction_cutoff,
                    feature_version=s.feature_version,
                    features=s.features_json,
                    label=label,
                    label_type=label_type,
                    label_horizon_days=horizon_days,
                    observed_outcome_date=observed_date,
                    leakage_safe=True,
                )
            )

        total = len(rows)
        ratio = round(positive_count / total, 4) if total > 0 else 0.0

        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
        logger.info(
            f"Compiled ML dataset: version='{feature_version}', records={total}, "
            f"positive={positive_count}, negative={negative_count}, duration={elapsed:.2f}s"
        )

        return MLDatasetExportResponseDTO(
            dataset_version=f"{feature_version}-{label_type}-{horizon_days}d",
            total_records=total,
            positive_count=positive_count,
            negative_count=negative_count,
            positive_ratio=ratio,
            feature_names=sorted(list(all_feature_keys)),
            records=rows,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    @classmethod
    async def export_dataset_csv(
        cls,
        db: AsyncSession,
        feature_version: str = "v1",
        label_type: str = "INTERNSHIP_ACCEPTED",
        horizon_days: int = DEFAULT_HORIZON_DAYS,
    ) -> str:
        """Exports the ML dataset as a tabular CSV string ready for offline exploratory analysis."""
        dataset = await cls.build_ml_dataset(
            db=db,
            feature_version=feature_version,
            label_type=label_type,
            horizon_days=horizon_days,
        )

        output = io.StringIO()
        fieldnames = [
            "learner_id",
            "snapshot_id",
            "prediction_cutoff",
            "label",
            "label_type",
            "observed_outcome_date",
        ] + dataset.feature_names

        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for r in dataset.records:
            row_dict = {
                "learner_id": r.learner_id,
                "snapshot_id": str(r.snapshot_id),
                "prediction_cutoff": r.prediction_cutoff.isoformat(),
                "label": r.label,
                "label_type": r.label_type,
                "observed_outcome_date": (
                    r.observed_outcome_date.isoformat() if r.observed_outcome_date else ""
                ),
            }
            for k in dataset.feature_names:
                row_dict[k] = r.features.get(k, 0.0)
            writer.writerow(row_dict)

        return output.getvalue()


outcome_label_service = OutcomeLabelService()
