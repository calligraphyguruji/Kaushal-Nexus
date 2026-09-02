from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
import random
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.core.logging import logger


@dataclass
class WagePredictionResult:
    """Wage forecasting result payload with confidence interval and disclaimers."""
    predicted_ctc_lpa: float
    min_expected_ctc_lpa: float
    max_expected_ctc_lpa: float
    confidence_score: float  # 0.0 to 1.0
    feature_contributions: Dict[str, float]
    model_version: str
    disclaimer: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class WagePredictionService(ABC):
    """
    Abstract Interface for AI/ML Wage Projection and Starting Compensation Estimation.
    Allows downstream services (matching engine, learner 360) to consume predictions
    without coupling to specific scikit-learn models.
    """

    @abstractmethod
    def train(self, dataset: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Train or retrain regression pipeline on skilling compensation dataset."""
        pass

    @abstractmethod
    def predict_wage(self, features: Dict[str, Any]) -> WagePredictionResult:
        """Predicts expected starting CTC (in LPA INR) for a candidate profile."""
        pass

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        """Returns ML model versioning metadata, evaluation metrics, and disclaimers."""
        pass


class ScikitLearnWagePredictionService(WagePredictionService):
    """
    scikit-learn Ridge Regression baseline model for starting CTC estimation.
    
    Trained on synthetic wage distribution datasets representing Indian vocational skilling cohorts.
    Features considered:
      - employment_readiness_score (0 - 100)
      - nsqf_level_numeric (3 - 7)
      - training_hours (100 - 600)
      - skill_alignment_ratio (0.0 - 1.0)
      - district_tier_weight (Tier 1: 1.0, Tier 2: 0.75, Tier 3: 0.5)
      - sector_premium_weight (IT: 1.25, BFSI: 1.15, Healthcare: 1.10, Manufacturing: 1.00, Logistics: 0.90)
    
    NOTE: Mock/demo model for algorithmic prototyping. Not certified production accurate.
    """

    FEATURE_NAMES = [
        "readiness_score",
        "nsqf_level",
        "training_hours",
        "skill_alignment",
        "district_tier_weight",
        "sector_weight",
    ]

    SECTOR_WEIGHTS = {
        "it-ites": 1.25,
        "information technology": 1.25,
        "bfsi": 1.15,
        "banking & finance": 1.15,
        "healthcare": 1.10,
        "smart manufacturing": 1.00,
        "automotive": 1.00,
        "renewable energy": 1.05,
        "logistics": 0.90,
    }

    DISTRICT_TIER_WEIGHTS = {
        "tier 1": 1.00,
        "tier 2": 0.75,
        "tier 3": 0.50,
    }

    def __init__(self) -> None:
        self.model_name = "KaushalNexus-WagePredictor-Ridge"
        self.version = "0.3.0-demo"
        self.algorithm = "StandardScaler + Ridge Regression (L2 Regularization)"
        self.disclaimer = (
            "Statistical baseline model trained on synthetic benchmark cohorts. "
            "Demonstrates wage projection workflows and compensation band estimation for SIH PS135; "
            "not certified as production ground truth."
        )

        self.pipeline = Pipeline(
            [
                ("scaler", StandardScaler()),
                ("regressor", Ridge(alpha=1.0)),
            ]
        )

        self.metrics: Dict[str, Any] = {}
        self.is_trained = False
        self.train()

    def _extract_feature_vector(self, f: Dict[str, Any]) -> List[float]:
        """Maps incoming dictionary of candidate features to normalized feature vector."""
        readiness = float(f.get("employment_readiness_score", f.get("readiness_score", 70)))
        
        # Parse NSQF Level numeric (e.g. "NSQF Level 5" -> 5)
        nsqf_raw = str(f.get("nsqf_level", "NSQF Level 4"))
        nsqf_num = 4.0
        for digit in ["3", "4", "5", "6", "7"]:
            if digit in nsqf_raw:
                nsqf_num = float(digit)
                break

        hours = float(f.get("training_hours", 250))
        skill_align = float(f.get("skill_alignment", f.get("skill_alignment_ratio", 0.80)))
        if skill_align > 1.0:  # Normalized percentage
            skill_align /= 100.0

        # District tier weight
        tier_str = str(f.get("district_tier", f.get("tier", "Tier 1"))).lower().strip()
        dt_weight = self.DISTRICT_TIER_WEIGHTS.get(tier_str, 0.85)

        # Sector weight
        sector_str = str(f.get("sector", f.get("industry_sector", "IT-ITeS"))).lower().strip()
        sec_weight = 1.0
        for s_key, s_val in self.SECTOR_WEIGHTS.items():
            if s_key in sector_str or sector_str in s_key:
                sec_weight = s_val
                break

        return [readiness, nsqf_num, hours, skill_align, dt_weight, sec_weight]

    def _generate_synthetic_training_data(self, n_samples: int = 350) -> Tuple[np.ndarray, np.ndarray]:
        """Generates realistic synthetic vocational placement compensation datasets."""
        np.random.seed(42)
        X = np.zeros((n_samples, len(self.FEATURE_NAMES)), dtype=np.float32)
        y = np.zeros(n_samples, dtype=np.float32)

        for i in range(n_samples):
            readiness = float(np.random.uniform(40, 98))
            nsqf = float(np.random.choice([3, 4, 5, 6, 7], p=[0.1, 0.35, 0.35, 0.15, 0.05]))
            hours = float(np.random.uniform(120, 500))
            skill_align = float(np.random.uniform(0.40, 1.0))
            tier_weight = float(np.random.choice([1.0, 0.75, 0.50], p=[0.4, 0.4, 0.2]))
            sec_weight = float(np.random.choice([1.25, 1.15, 1.10, 1.00, 0.90]))

            X[i] = [readiness, nsqf, hours, skill_align, tier_weight, sec_weight]

            # Linear formulation with domain noise
            base_ctc = (
                1.80
                + (0.022 * readiness)
                + (0.35 * (nsqf - 3.0))
                + (0.0015 * hours)
                + (0.90 * skill_align)
                + (0.45 * tier_weight)
                + (0.60 * (sec_weight - 1.0))
                + float(np.random.normal(0, 0.15))
            )
            # Clip between ₹2.4 LPA and ₹8.0 LPA
            y[i] = max(2.4, min(8.5, round(base_ctc, 2)))

        return X, y

    def train(self, dataset: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Trains Ridge regression model on synthetic benchmark dataset."""
        if dataset and len(dataset) >= 10:
            X = np.array([self._extract_feature_vector(item) for item in dataset])
            y = np.array([float(item.get("starting_ctc_lpa", 3.5)) for item in dataset])
        else:
            X, y = self._generate_synthetic_training_data(n_samples=400)

        self.pipeline.fit(X, y)
        self.is_trained = True

        # Compute evaluation metrics
        preds = self.pipeline.predict(X)
        r2 = round(float(r2_score(y, preds)), 3)
        mae = round(float(mean_absolute_error(y, preds)), 3)

        self.metrics = {
            "samples_trained": len(X),
            "r2_score": r2,
            "mae_lpa": mae,
            "mean_target_ctc_lpa": round(float(np.mean(y)), 2),
        }

        logger.info(
            f"Trained {self.model_name} [v{self.version}] on {len(X)} samples. "
            f"R²: {r2}, MAE: ₹{mae} LPA"
        )
        return self.metrics

    def predict_wage(self, features: Dict[str, Any]) -> WagePredictionResult:
        """Estimates starting compensation band based on candidate profile."""
        if not self.is_trained:
            self.train()

        feature_vector = np.array([self._extract_feature_vector(features)])
        raw_pred = float(self.pipeline.predict(feature_vector)[0])
        predicted_ctc = round(float(np.clip(raw_pred, 2.2, 9.5)), 2)

        # Expected compensation band (+- 10-12%)
        spread = round(predicted_ctc * 0.12, 2)
        min_ctc = round(max(2.0, predicted_ctc - spread), 2)
        max_ctc = round(predicted_ctc + spread, 2)

        # Feature contributions
        reg = self.pipeline.named_steps["regressor"]
        scaler = self.pipeline.named_steps["scaler"]
        scaled_features = scaler.transform(feature_vector)[0]
        coefs = reg.coef_

        contributions: Dict[str, float] = {}
        for name, coef, val in zip(self.FEATURE_NAMES, coefs, scaled_features):
            contributions[name] = round(float(coef * val), 3)

        readiness = float(features.get("employment_readiness_score", features.get("readiness_score", 70)))
        confidence = round(min(0.95, max(0.60, 0.50 + (readiness / 200.0))), 2)

        return WagePredictionResult(
            predicted_ctc_lpa=predicted_ctc,
            min_expected_ctc_lpa=min_ctc,
            max_expected_ctc_lpa=max_ctc,
            confidence_score=confidence,
            feature_contributions=contributions,
            model_version=self.version,
            disclaimer=self.disclaimer,
        )

    def get_metadata(self) -> Dict[str, Any]:
        """Returns ML model versioning and evaluation metadata."""
        return {
            "model_name": self.model_name,
            "version": self.version,
            "algorithm": self.algorithm,
            "feature_names": self.FEATURE_NAMES,
            "metrics": self.metrics,
            "disclaimer": self.disclaimer,
            "is_production_ready": False,
        }


# Global singleton instance
wage_prediction_service: WagePredictionService = ScikitLearnWagePredictionService()
