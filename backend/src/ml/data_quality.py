from datetime import datetime, timezone
from typing import Dict, List, Optional
import numpy as np
import pandas as pd

from src.core.logging import logger
from src.schemas.placement_ml_dto import (
    DataQualityReportDTO,
    FeatureQualityStatsDTO,
)


class DataQualityAnalyzer:
    """
    Performs comprehensive data quality analysis on the Phase 4/5 ML dataset prior to training.
    Evaluates missing rates, variance, outlier frequency, target correlation, and temporal distribution.
    """

    @classmethod
    def analyze(
        cls,
        df: pd.DataFrame,
        target_col: str = "target_placed",
        cutoff_col: str = "prediction_cutoff",
    ) -> DataQualityReportDTO:
        if df.empty:
            raise ValueError("Cannot perform data quality analysis on an empty DataFrame.")

        total_records = len(df)
        feature_cols = [
            c for c in df.columns
            if c not in (target_col, cutoff_col, "learner_id", "snapshot_id")
            and pd.api.types.is_numeric_dtype(df[c])
        ]

        # Target statistics
        if target_col in df.columns:
            positive_records = int(df[target_col].sum())
            negative_records = total_records - positive_records
            pos_rate = round(positive_records / total_records, 4)
            imbalance_ratio = round(negative_records / max(1, positive_records), 2)
        else:
            positive_records = 0
            negative_records = total_records
            pos_rate = 0.0
            imbalance_ratio = 0.0

        # Temporal bounds & distribution
        earliest_cutoff = None
        latest_cutoff = None
        temporal_dist: Dict[str, int] = {}

        if cutoff_col in df.columns:
            cutoff_series = pd.to_datetime(df[cutoff_col], utc=True)
            earliest_cutoff = cutoff_series.min().strftime("%Y-%m-%d")
            latest_cutoff = cutoff_series.max().strftime("%Y-%m-%d")
            # Group by year-month
            month_counts = cutoff_series.dt.strftime("%Y-%m").value_counts().sort_index()
            temporal_dist = {str(k): int(v) for k, v in month_counts.items()}

        features_quality: List[FeatureQualityStatsDTO] = []
        outlier_summary: Dict[str, int] = {}
        low_variance_features: List[str] = []

        for col in feature_cols:
            series = df[col].dropna()
            count = int(len(series))
            missing_count = int(df[col].isna().sum())
            missing_pct = round((missing_count / total_records) * 100.0, 2)

            if count > 0:
                mean_val = float(series.mean())
                std_val = float(series.std(ddof=0))
                min_val = float(series.min())
                p25 = float(series.quantile(0.25))
                p50 = float(series.median())
                p75 = float(series.quantile(0.75))
                max_val = float(series.max())

                # Outlier detection using IQR
                iqr = p75 - p25
                lower_bound = p25 - 1.5 * iqr
                upper_bound = p75 + 1.5 * iqr
                outliers = int(((series < lower_bound) | (series > upper_bound)).sum())

                # Zero/low variance
                is_zero_var = bool(std_val < 1e-4)

                # Correlation with target
                if target_col in df.columns and not is_zero_var:
                    corr = float(df[col].corr(df[target_col]))
                    corr_val = 0.0 if np.isnan(corr) else round(corr, 4)
                else:
                    corr_val = 0.0
            else:
                mean_val = std_val = min_val = p25 = p50 = p75 = max_val = 0.0
                outliers = 0
                is_zero_var = True
                corr_val = 0.0

            if is_zero_var:
                low_variance_features.append(col)
            if outliers > 0:
                outlier_summary[col] = outliers

            features_quality.append(
                FeatureQualityStatsDTO(
                    name=col,
                    count=count,
                    missing_count=missing_count,
                    missing_pct=missing_pct,
                    mean=round(mean_val, 4),
                    std=round(std_val, 4),
                    min=round(min_val, 4),
                    p25=round(p25, 4),
                    p50=round(p50, 4),
                    p75=round(p75, 4),
                    max=round(max_val, 4),
                    outlier_count_iqr=outliers,
                    is_zero_variance=is_zero_var,
                    correlation_with_target=corr_val,
                )
            )

        # Health Assessment
        if pos_rate >= 0.15 and pos_rate <= 0.60 and len(low_variance_features) <= 2:
            health_status = "EXCELLENT"
        elif pos_rate >= 0.05 and pos_rate <= 0.85:
            health_status = "HEALTHY"
        else:
            health_status = "NEEDS_ATTENTION"

        logger.info(
            f"Data Quality Analysis complete: {total_records} records, "
            f"{len(features_quality)} features, positive_rate={pos_rate:.1%}, health='{health_status}'"
        )

        return DataQualityReportDTO(
            total_records=total_records,
            total_features=len(features_quality),
            positive_records=positive_records,
            negative_records=negative_records,
            positive_rate=pos_rate,
            imbalance_ratio=imbalance_ratio,
            earliest_cutoff=earliest_cutoff,
            latest_cutoff=latest_cutoff,
            features_quality=features_quality,
            outlier_summary=outlier_summary,
            low_variance_features=low_variance_features,
            temporal_distribution=temporal_dist,
            health_status=health_status,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )


data_quality_analyzer = DataQualityAnalyzer()
