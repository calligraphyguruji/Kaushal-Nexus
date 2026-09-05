from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import StandardScaler

from src.core.logging import logger


class DomainFeatureEngineer(BaseEstimator, TransformerMixin):
    """
    Computes domain-specific interaction ratios and derived indicators
    from BKT knowledge tracing, practice behavior, projects, and career velocity.
    """

    DERIVED_FEATURE_NAMES = [
        "bkt_spread",
        "mastery_velocity_ratio",
        "skill_mastery_rate",
        "engagement_density",
        "practice_success_rate",
        "interview_rate",
        "project_verification_rate",
        "profile_readiness_composite",
    ]

    def fit(self, X: pd.DataFrame, y: Optional[pd.Series] = None):
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        df = X.copy()

        # 1. BKT mastery spread
        max_m = df.get("bkt_max_mastery", 0.0)
        min_m = df.get("bkt_min_mastery", 0.0)
        df["bkt_spread"] = (max_m - min_m).clip(lower=0.0)

        # 2. Mastery velocity ratio (short-term momentum vs monthly trend)
        d7 = df.get("mastery_delta_7d", 0.0)
        d30 = df.get("mastery_delta_30d", 0.0)
        df["mastery_velocity_ratio"] = d7 / (d30.abs() + 0.05)

        # 3. Mastered skill saturation rate
        mastered = df.get("bkt_mastered_skill_count", 0.0)
        assessed = df.get("bkt_skills_assessed_count", 1.0).replace(0, 1.0)
        df["skill_mastery_rate"] = (mastered / assessed).clip(0.0, 1.0)

        # 4. Learning engagement density (hours per activity)
        hrs = df.get("learning_hours_completed", 0.0)
        acts = df.get("learning_activities_count", 1.0).replace(0, 1.0)
        df["engagement_density"] = (hrs / acts).clip(0.0, 10.0)

        # 5. Practice gap reduction efficacy
        gap_red = df.get("gap_reduction_count", 0.0)
        attempts = df.get("practice_attempt_count", 1.0).replace(0, 1.0)
        df["practice_success_rate"] = (gap_red / attempts).clip(0.0, 1.0)

        # 6. Interview conversion velocity
        interviews = df.get("interview_count", 0.0)
        apps = df.get("application_count", 1.0).replace(0, 1.0)
        df["interview_rate"] = (interviews / apps).clip(0.0, 1.0)

        # 7. Portfolio verification integrity
        ver_proj = df.get("verified_project_count", 0.0)
        tot_proj = df.get("project_count", 1.0).replace(0, 1.0)
        df["project_verification_rate"] = (ver_proj / tot_proj).clip(0.0, 1.0)

        # 8. Composite candidate readiness index
        role_score = df.get("role_match_score", 50.0) / 100.0
        exp = df.get("experience_years", 0.0).clip(0, 5) / 5.0
        github = df.get("has_github", 0.0)
        resume = df.get("has_active_resume", 0.0)
        bkt_mean = df.get("bkt_mean_mastery", 0.5)

        df["profile_readiness_composite"] = (
            0.35 * bkt_mean +
            0.25 * role_score +
            0.15 * df["project_verification_rate"] +
            0.10 * exp +
            0.10 * github +
            0.05 * resume
        ).clip(0.0, 1.0)

        return df


class TemporalSplitter:
    """
    Partitions time-series snapshot datasets into Train, Validation, and Holdout Test
    strictly along the temporal dimension (prediction cutoff date).
    Prevents lookahead bias and future-data autocorrelation leakage.
    """

    @classmethod
    def split(
        cls,
        df: pd.DataFrame,
        cutoff_col: str = "prediction_cutoff",
        target_col: str = "target_placed",
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
    ) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series, pd.DataFrame, pd.Series, Dict[str, Any]]:
        """
        Splits df chronologically into:
        Train (earliest train_ratio), Validation (next val_ratio), Test (remaining 1 - train - val).
        """
        sorted_df = df.copy()
        sorted_df[cutoff_col] = pd.to_datetime(sorted_df[cutoff_col], utc=True)
        sorted_df.sort_values(by=cutoff_col, inplace=True)
        sorted_df.reset_index(drop=True, inplace=True)

        n = len(sorted_df)
        train_end_idx = int(n * train_ratio)
        val_end_idx = int(n * (train_ratio + val_ratio))

        train_df = sorted_df.iloc[:train_end_idx].copy()
        val_df = sorted_df.iloc[train_end_idx:val_end_idx].copy()
        test_df = sorted_df.iloc[val_end_idx:].copy()

        # Meta-info
        train_cutoff_min = train_df[cutoff_col].min().strftime("%Y-%m-%d")
        train_cutoff_max = train_df[cutoff_col].max().strftime("%Y-%m-%d")
        val_cutoff_min = val_df[cutoff_col].min().strftime("%Y-%m-%d")
        val_cutoff_max = val_df[cutoff_col].max().strftime("%Y-%m-%d")
        test_cutoff_min = test_df[cutoff_col].min().strftime("%Y-%m-%d")
        test_cutoff_max = test_df[cutoff_col].max().strftime("%Y-%m-%d")

        split_info = {
            "total_records": n,
            "train_count": len(train_df),
            "val_count": len(val_df),
            "test_count": len(test_df),
            "train_cutoff_range": f"{train_cutoff_min} to {train_cutoff_max}",
            "val_cutoff_range": f"{val_cutoff_min} to {val_cutoff_max}",
            "test_cutoff_range": f"{test_cutoff_min} to {test_cutoff_max}",
            "train_positives": int(train_df[target_col].sum()),
            "val_positives": int(val_df[target_col].sum()),
            "test_positives": int(test_df[target_col].sum()),
        }

        logger.info(
            f"Temporal Split executed: Train={len(train_df)} ({train_cutoff_max}), "
            f"Val={len(val_df)} ({val_cutoff_max}), Test={len(test_df)} ({test_cutoff_max})"
        )

        # Exclude non-feature columns
        non_feature_cols = [target_col, cutoff_col, "learner_id", "snapshot_id"]

        X_train = train_df.drop(columns=[c for c in non_feature_cols if c in train_df.columns])
        y_train = train_df[target_col]

        X_val = val_df.drop(columns=[c for c in non_feature_cols if c in val_df.columns])
        y_val = val_df[target_col]

        X_test = test_df.drop(columns=[c for c in non_feature_cols if c in test_df.columns])
        y_test = test_df[target_col]

        return X_train, y_train, X_val, y_val, X_test, y_test, split_info


class TabularDataPreprocessor:
    """
    Standardizes feature preprocessing, imputation, and derived ratio generation.
    """

    def __init__(self):
        self.engineer = DomainFeatureEngineer()
        self.feature_columns: List[str] = []
        self.medians: Dict[str, float] = {}
        self.scaler = StandardScaler()

    def fit(self, X: pd.DataFrame) -> "TabularDataPreprocessor":
        engineered = self.engineer.transform(X)
        self.feature_columns = [
            c for c in engineered.columns if pd.api.types.is_numeric_dtype(engineered[c])
        ]
        # Compute medians for imputation
        for col in self.feature_columns:
            self.medians[col] = float(engineered[col].median()) if not engineered[col].empty else 0.0

        imputed = engineered[self.feature_columns].fillna(self.medians)
        self.scaler.fit(imputed)
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        engineered = self.engineer.transform(X)
        # Ensure all columns exist
        for col in self.feature_columns:
            if col not in engineered.columns:
                engineered[col] = self.medians.get(col, 0.0)

        df = engineered[self.feature_columns].fillna(self.medians)
        return df

    def transform_scaled(self, X: pd.DataFrame) -> np.ndarray:
        df = self.transform(X)
        return self.scaler.transform(df)


preprocessor = TabularDataPreprocessor()
