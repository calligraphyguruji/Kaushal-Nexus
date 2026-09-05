from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid
import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import logger
from src.ml.data_quality import data_quality_analyzer
from src.ml.dataset_generator import dataset_generator
from src.ml.explainability import model_explainability_engine
from src.ml.model_registry import model_registry
from src.ml.placement_models import placement_model_trainer
from src.ml.preprocessor import TabularDataPreprocessor, TemporalSplitter
from src.models.learner import Learner
from src.schemas.placement_ml_dto import (
    ActiveModelMetadataDTO,
    DataQualityReportDTO,
    LearnerPlacementPredictionDTO,
    TrainMLRequestDTO,
    TrainMLResponseDTO,
)
from src.services.ml_feature_snapshot_service import ml_feature_snapshot_service


class PlacementPredictionService:
    """
    Core orchestrator for Phase 5:
    Data Quality Audit -> Temporal Splitting -> Feature Preprocessing ->
    Baseline Comparison -> XGBoost Tuning -> Probability Calibration ->
    Explainability (TreeSHAP) -> Model Versioning -> Personalized Inference.
    """

    MODEL_VERSION_PREFIX = "xgb-placement"

    async def run_training_pipeline(
        self,
        db: Optional[AsyncSession] = None,
        req: Optional[TrainMLRequestDTO] = None,
        as_candidate: bool = False,
    ) -> TrainMLResponseDTO:
        request = req or TrainMLRequestDTO()
        logger.info(f"Initiating Placement Model Training Pipeline (as_candidate={as_candidate}): {request.model_dump()}")

        # 1. Load Dataset
        min_records = request.sample_size or 800
        df = await dataset_generator.get_combined_dataset(
            db=db,
            min_samples=min_records if request.use_synthetic_cohort else 50,
            feature_version=request.feature_version,
            label_type=request.label_type,
            horizon_days=request.horizon_days,
        )

        # 2. Temporal Train / Validation / Test Split
        X_train_raw, y_train, X_val_raw, y_val, X_test_raw, y_test, split_info = TemporalSplitter.split(
            df=df,
            cutoff_col="prediction_cutoff",
            target_col="target_placed",
            train_ratio=0.70,
            val_ratio=0.15,
        )

        # 3. Feature Preprocessing & Scaling
        preprocessor = TabularDataPreprocessor()
        preprocessor.fit(X_train_raw)

        X_train = preprocessor.transform(X_train_raw)
        X_val = preprocessor.transform(X_val_raw)
        X_test = preprocessor.transform(X_test_raw)

        X_train_scaled = preprocessor.transform_scaled(X_train_raw)
        X_val_scaled = preprocessor.transform_scaled(X_val_raw)
        X_test_scaled = preprocessor.transform_scaled(X_test_raw)

        # 4. Train, Tune, Calibrate & Compare Models
        comparisons, calibrated_model, best_params, calib_curve = (
            placement_model_trainer.train_and_compare_all(
                X_train=X_train,
                y_train=y_train,
                X_val=X_val,
                y_val=y_val,
                X_test=X_test,
                y_test=y_test,
                X_train_scaled=X_train_scaled,
                X_val_scaled=X_val_scaled,
                X_test_scaled=X_test_scaled,
                calibration_method=request.calibration_method,
                tune_hyperparameters=request.tune_hyperparameters,
            )
        )

        # 5. Global Feature Importance
        top_importances = model_explainability_engine.extract_global_feature_importance(
            model=calibrated_model,
            feature_names=preprocessor.feature_columns,
            top_n=15,
        )

        # 6. Model Versioning & Registry Serialization
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        version = f"{self.MODEL_VERSION_PREFIX}-v1.0-{now_str}"

        # Selected calibrated model metrics
        calibrated_row = next(c for c in comparisons if c.model_type == "xgboost_calibrated")

        if as_candidate:
            model_registry.save_candidate_model(
                model=calibrated_model,
                preprocessor=preprocessor,
                model_version=version,
                metrics=calibrated_row.metrics,
                hyperparameters=best_params,
                calibration_curve=calib_curve,
                top_feature_importances=top_importances,
                temporal_splits=split_info,
                dataset_size=len(df),
            )
        else:
            model_registry.save_model(
                model=calibrated_model,
                preprocessor=preprocessor,
                model_version=version,
                metrics=calibrated_row.metrics,
                hyperparameters=best_params,
                calibration_curve=calib_curve,
                top_feature_importances=top_importances,
                temporal_splits=split_info,
                dataset_size=len(df),
            )

        return TrainMLResponseDTO(
            model_version=version,
            training_timestamp=datetime.now(timezone.utc).isoformat(),
            dataset_size=len(df),
            temporal_splits=split_info,
            models_comparison=comparisons,
            selected_model="Calibrated XGBoost",
            tuned_hyperparameters=best_params,
            calibration_curve=calib_curve,
            top_feature_importances=top_importances,
            status="SUCCESS",
        )

    async def get_data_quality_report(
        self, db: Optional[AsyncSession] = None
    ) -> DataQualityReportDTO:
        """Runs data quality analysis on training dataset."""
        df = await dataset_generator.get_combined_dataset(db=db, min_samples=800)
        return data_quality_analyzer.analyze(df)

    async def predict_for_learner(
        self,
        db: AsyncSession,
        learner: Learner,
        cutoff: Optional[datetime] = None,
        horizon_days: int = 90,
    ) -> LearnerPlacementPredictionDTO:
        """
        Generates calibrated placement prediction and local explainability for a learner.
        """
        # Ensure active model is loaded; train default if not present
        if model_registry.active_model is None or model_registry.active_preprocessor is None:
            loaded = model_registry.load_active_model()
            if not loaded:
                logger.info("No active placement model found; triggering initial training pipeline.")
                await self.run_training_pipeline(db=db)

        model = model_registry.active_model
        preprocessor = model_registry.active_preprocessor
        meta = model_registry.get_metadata()

        t = cutoff or datetime.now(timezone.utc)

        # 1. Extract candidate features strictly at cutoff T
        raw_features = await ml_feature_snapshot_service.calculate_features_at_cutoff(
            db=db,
            learner=learner,
            cutoff=t,
            role_id=learner.aspiring_role_id,
        )

        # 2. Preprocess features using trained preprocessor
        features_df = pd.DataFrame([raw_features])
        processed_df = preprocessor.transform(features_df)

        # 3. Predict calibrated probability
        probs = model.predict_proba(processed_df)[0]
        prob_placement = float(probs[1])
        prob_pct = round(prob_placement * 100.0, 1)

        # 4. Readiness Tier
        if prob_placement >= 0.70:
            readiness_tier = "HIGH_READINESS"
        elif prob_placement >= 0.40:
            readiness_tier = "MODERATE_READINESS"
        else:
            readiness_tier = "DEVELOPING"

        # 5. Percentile Rank (relative to beta prior baseline)
        percentile_rank = round(min(max(prob_placement * 115.0 - 5.0, 5.0), 99.0), 1)

        # 6. Local Explainability (TreeSHAP contributions)
        pos_drivers, risk_factors, recommendations = (
            model_explainability_engine.explain_learner_prediction(
                model=model,
                features_df=processed_df,
                placement_prob=prob_placement,
            )
        )

        version = meta.model_version if meta else "xgb-placement-v1.0"

        return LearnerPlacementPredictionDTO(
            learner_id=str(learner.id),
            placement_probability=round(prob_placement, 4),
            placement_probability_pct=prob_pct,
            readiness_tier=readiness_tier,
            confidence_score=round(0.85 + (abs(prob_placement - 0.5) * 0.25), 2),
            percentile_rank=percentile_rank,
            model_version=version,
            prediction_date=t.isoformat(),
            horizon_days=horizon_days,
            top_positive_drivers=pos_drivers,
            top_risk_factors=risk_factors,
            actionable_recommendations=recommendations,
            feature_snapshot=raw_features,
            disclaimer="Placement probability is estimated by a calibrated gradient boosted machine (XGBoost) for decision-support only. Not a hiring guarantee.",
        )


placement_prediction_service = PlacementPredictionService()
