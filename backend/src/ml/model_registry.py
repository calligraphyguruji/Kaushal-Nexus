import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib

from src.core.logging import logger
from src.schemas.placement_ml_dto import (
    ActiveModelMetadataDTO,
    CalibrationCurveDTO,
    FeatureImportanceItemDTO,
    ModelMetricsDTO,
)


class PlacementModelRegistry:
    """
    Manages versioning, serialization, hot-reloading, and audit trails
    for the calibrated XGBoost placement prediction model.
    """

    DEFAULT_REGISTRY_DIR = Path("models_registry/placement_model")

    def __init__(self, registry_dir: Optional[Path] = None):
        self.registry_dir = registry_dir or self.DEFAULT_REGISTRY_DIR
        self.registry_dir.mkdir(parents=True, exist_ok=True)
        self.active_model: Optional[Any] = None
        self.active_preprocessor: Optional[Any] = None
        self.active_metadata: Optional[Dict[str, Any]] = None

    def save_model(
        self,
        model: Any,
        preprocessor: Any,
        model_version: str,
        metrics: ModelMetricsDTO,
        hyperparameters: Dict[str, Any],
        calibration_curve: CalibrationCurveDTO,
        top_feature_importances: List[FeatureImportanceItemDTO],
        temporal_splits: Dict[str, Any],
        dataset_size: int,
    ) -> ActiveModelMetadataDTO:
        """Serializes model, preprocessor, and version metadata to disk."""
        model_path = self.registry_dir / "active_model.joblib"
        preprocessor_path = self.registry_dir / "active_preprocessor.joblib"
        meta_path = self.registry_dir / "active_metadata.json"
        history_path = self.registry_dir / "training_history.json"

        # 1. Save binary artifacts
        joblib.dump(model, model_path)
        joblib.dump(preprocessor, preprocessor_path)

        # 2. Prepare metadata
        metadata_dict = {
            "model_version": model_version,
            "algorithm": "XGBoost + Isotonic CalibratedClassifierCV",
            "trained_at": metrics.best_threshold,  # Placeholder or datetime
            "dataset_records": dataset_size,
            "temporal_splits": temporal_splits,
            "metrics": metrics.model_dump(),
            "hyperparameters": hyperparameters,
            "calibration": calibration_curve.model_dump(),
            "feature_importances": [f.model_dump() for f in top_feature_importances],
            "is_active": True,
        }

        from datetime import datetime, timezone
        metadata_dict["trained_at"] = datetime.now(timezone.utc).isoformat()

        with open(meta_path, "w") as f:
            json.dump(metadata_dict, f, indent=2)

        # 2b. Also save into versions archive
        version_dir = self.registry_dir / "versions" / model_version
        version_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, version_dir / "model.joblib")
        joblib.dump(preprocessor, version_dir / "preprocessor.joblib")
        with open(version_dir / "metadata.json", "w") as f:
            json.dump(metadata_dict, f, indent=2)

        # 3. Append to historical registry
        history_records = []
        if history_path.exists():
            try:
                with open(history_path, "r") as f:
                    history_records = json.load(f)
            except Exception:
                history_records = []

        history_records.append({
            "model_version": model_version,
            "trained_at": metadata_dict["trained_at"],
            "dataset_records": dataset_size,
            "roc_auc": metrics.roc_auc,
            "pr_auc": metrics.pr_auc,
            "brier_score": metrics.brier_score,
            "ece": metrics.ece,
            "f1_score": metrics.f1_score,
        })

        with open(history_path, "w") as f:
            json.dump(history_records, f, indent=2)

        # Update in-memory pointers
        self.active_model = model
        self.active_preprocessor = preprocessor
        self.active_metadata = metadata_dict

        logger.info(f"Successfully saved and registered model version '{model_version}'")

        return ActiveModelMetadataDTO(**metadata_dict)

    def save_candidate_model(
        self,
        model: Any,
        preprocessor: Any,
        model_version: str,
        metrics: ModelMetricsDTO,
        hyperparameters: Dict[str, Any],
        calibration_curve: CalibrationCurveDTO,
        top_feature_importances: List[FeatureImportanceItemDTO],
        temporal_splits: Dict[str, Any],
        dataset_size: int,
    ) -> Dict[str, Any]:
        """Saves a candidate model for evaluation without making it active."""
        candidate_model_path = self.registry_dir / "candidate_model.joblib"
        candidate_preproc_path = self.registry_dir / "candidate_preprocessor.joblib"
        candidate_meta_path = self.registry_dir / "candidate_metadata.json"

        joblib.dump(model, candidate_model_path)
        joblib.dump(preprocessor, candidate_preproc_path)

        from datetime import datetime, timezone
        metadata_dict = {
            "model_version": model_version,
            "algorithm": "XGBoost + Isotonic CalibratedClassifierCV",
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "dataset_records": dataset_size,
            "temporal_splits": temporal_splits,
            "metrics": metrics.model_dump(),
            "hyperparameters": hyperparameters,
            "calibration": calibration_curve.model_dump(),
            "feature_importances": [f.model_dump() for f in top_feature_importances],
            "is_active": False,
        }

        with open(candidate_meta_path, "w") as f:
            json.dump(metadata_dict, f, indent=2)

        # Also store into versions archive
        version_dir = self.registry_dir / "versions" / model_version
        version_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, version_dir / "model.joblib")
        joblib.dump(preprocessor, version_dir / "preprocessor.joblib")
        with open(version_dir / "metadata.json", "w") as f:
            json.dump(metadata_dict, f, indent=2)

        logger.info(f"Saved candidate model '{model_version}' to registry.")
        return metadata_dict

    def get_candidate_metadata(self) -> Optional[Dict[str, Any]]:
        candidate_meta_path = self.registry_dir / "candidate_metadata.json"
        if candidate_meta_path.exists():
            try:
                with open(candidate_meta_path, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to read candidate metadata: {e}")
        return None

    def promote_candidate(self, target_version: Optional[str] = None) -> Dict[str, Any]:
        """
        Promotes the candidate model (or specific version) to become the active model.
        """
        import shutil

        if target_version:
            version_dir = self.registry_dir / "versions" / target_version
            if not version_dir.exists():
                raise ValueError(f"Model version '{target_version}' not found in versions archive.")
            src_model = version_dir / "model.joblib"
            src_preproc = version_dir / "preprocessor.joblib"
            src_meta = version_dir / "metadata.json"
        else:
            src_model = self.registry_dir / "candidate_model.joblib"
            src_preproc = self.registry_dir / "candidate_preprocessor.joblib"
            src_meta = self.registry_dir / "candidate_metadata.json"

        if not (src_model.exists() and src_preproc.exists() and src_meta.exists()):
            raise ValueError("Candidate model artifacts not found.")

        dest_model = self.registry_dir / "active_model.joblib"
        dest_preproc = self.registry_dir / "active_preprocessor.joblib"
        dest_meta = self.registry_dir / "active_metadata.json"

        shutil.copy2(src_model, dest_model)
        shutil.copy2(src_preproc, dest_preproc)

        with open(src_meta, "r") as f:
            meta = json.load(f)
        meta["is_active"] = True

        with open(dest_meta, "w") as f:
            json.dump(meta, f, indent=2)

        self.load_active_model()
        logger.info(f"Successfully promoted model '{meta.get('model_version')}' to ACTIVE.")
        return meta

    def load_active_model(self) -> bool:
        """Loads the active model and preprocessor from disk into memory."""
        model_path = self.registry_dir / "active_model.joblib"
        preprocessor_path = self.registry_dir / "active_preprocessor.joblib"
        meta_path = self.registry_dir / "active_metadata.json"

        if not (model_path.exists() and preprocessor_path.exists() and meta_path.exists()):
            return False

        try:
            self.active_model = joblib.load(model_path)
            self.active_preprocessor = joblib.load(preprocessor_path)
            with open(meta_path, "r") as f:
                self.active_metadata = json.load(f)
            logger.info(f"Loaded active model version: {self.active_metadata.get('model_version')}")
            return True
        except Exception as e:
            logger.error(f"Failed to load active model from registry: {e}")
            return False

    def get_metadata(self) -> Optional[ActiveModelMetadataDTO]:
        if not self.active_metadata:
            self.load_active_model()
        if self.active_metadata:
            return ActiveModelMetadataDTO(**self.active_metadata)
        return None

    def get_training_history(self) -> List[Dict[str, Any]]:
        history_path = self.registry_dir / "training_history.json"
        if history_path.exists():
            try:
                with open(history_path, "r") as f:
                    return json.load(f)
            except Exception:
                return []
        return []


model_registry = PlacementModelRegistry()
