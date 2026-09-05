from datetime import datetime, timedelta, timezone
import uuid
import pytest
from httpx import AsyncClient
import numpy as np
import pandas as pd

from src.ml.data_quality import DataQualityAnalyzer, data_quality_analyzer
from src.ml.dataset_generator import PlacementDatasetGenerator, dataset_generator
from src.ml.explainability import ModelExplainabilityEngine, model_explainability_engine
from src.ml.model_registry import PlacementModelRegistry, model_registry
from src.ml.placement_models import (
    PlacementModelEvaluator,
    PlacementModelTrainer,
    placement_model_trainer,
)
from src.ml.preprocessor import (
    DomainFeatureEngineer,
    TabularDataPreprocessor,
    TemporalSplitter,
)
from src.schemas.placement_ml_dto import (
    DataQualityReportDTO,
    LearnerPlacementPredictionDTO,
    TrainMLRequestDTO,
    TrainMLResponseDTO,
)
from src.services.placement_prediction_service import (
    PlacementPredictionService,
    placement_prediction_service,
)


# ==============================================================================
# 1. Data Quality Analysis Unit Tests
# ==============================================================================

def test_data_quality_analysis_metrics():
    """Verify Data Quality Analyzer detects stats, distributions, outliers, and variance."""
    df = dataset_generator.generate_synthetic_historical_cohort(n_samples=250, random_seed=123)
    assert not df.empty
    assert len(df) == 250
    assert "target_placed" in df.columns

    report = data_quality_analyzer.analyze(df)
    assert isinstance(report, DataQualityReportDTO)
    assert report.total_records == 250
    assert report.positive_records > 0
    assert report.negative_records > 0
    assert 0.10 <= report.positive_rate <= 0.60
    assert report.imbalance_ratio > 0
    assert report.health_status in ("EXCELLENT", "HEALTHY")
    assert len(report.features_quality) > 30

    # Validate feature stats
    bkt_mean_stats = next(f for f in report.features_quality if f.name == "bkt_mean_mastery")
    assert bkt_mean_stats.missing_count == 0
    assert 0.0 < bkt_mean_stats.mean < 1.0
    assert bkt_mean_stats.correlation_with_target > 0.10  # Positive correlation with placement


# ==============================================================================
# 2. Temporal Train / Validation / Test Split Tests
# ==============================================================================

def test_temporal_split_strictly_preserves_chronology():
    """Verify temporal splitter partitions strictly chronologically with zero lookahead overlap."""
    df = dataset_generator.generate_synthetic_historical_cohort(n_samples=300, random_seed=456)

    X_train, y_train, X_val, y_val, X_test, y_test, split_info = TemporalSplitter.split(
        df=df,
        cutoff_col="prediction_cutoff",
        target_col="target_placed",
        train_ratio=0.70,
        val_ratio=0.15,
    )

    assert len(X_train) == 210
    assert len(X_val) == 45
    assert len(X_test) == 45

    # Check timestamps: max(train) <= min(val) and max(val) <= min(test)
    train_max = df.iloc[:210]["prediction_cutoff"].max()
    val_min = df.iloc[210:255]["prediction_cutoff"].min()
    val_max = df.iloc[210:255]["prediction_cutoff"].max()
    test_min = df.iloc[255:]["prediction_cutoff"].min()

    assert train_max <= val_min, f"Temporal leak: train_max {train_max} > val_min {val_min}"
    assert val_max <= test_min, f"Temporal leak: val_max {val_max} > test_min {test_min}"


# ==============================================================================
# 3. Model Training, Baseline Comparisons, and Tuning Tests
# ==============================================================================

def test_model_training_and_comparisons():
    """Verify training compares Dummy, Logistic Regression, Random Forest, Default XGB, and Tuned XGB."""
    df = dataset_generator.generate_synthetic_historical_cohort(n_samples=350, random_seed=789)

    X_train_raw, y_train, X_val_raw, y_val, X_test_raw, y_test, _ = TemporalSplitter.split(
        df=df, train_ratio=0.70, val_ratio=0.15
    )

    preprocessor = TabularDataPreprocessor()
    preprocessor.fit(X_train_raw)

    X_train = preprocessor.transform(X_train_raw)
    X_val = preprocessor.transform(X_val_raw)
    X_test = preprocessor.transform(X_test_raw)

    X_train_scaled = preprocessor.transform_scaled(X_train_raw)
    X_val_scaled = preprocessor.transform_scaled(X_val_raw)
    X_test_scaled = preprocessor.transform_scaled(X_test_raw)

    comparisons, calibrated_model, best_params, calib_curve = placement_model_trainer.train_and_compare_all(
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        X_test=X_test,
        y_test=y_test,
        X_train_scaled=X_train_scaled,
        X_val_scaled=X_val_scaled,
        X_test_scaled=X_test_scaled,
        calibration_method="isotonic",
        tune_hyperparameters=False,
    )

    assert len(comparisons) == 6
    model_types = [c.model_type for c in comparisons]
    assert "baseline_dummy" in model_types
    assert "logistic_regression" in model_types
    assert "random_forest" in model_types
    assert "xgboost_default" in model_types
    assert "xgboost_tuned" in model_types
    assert "xgboost_calibrated" in model_types

    # Verify XGBoost beats dummy baseline on ROC-AUC
    dummy_row = next(c for c in comparisons if c.model_type == "baseline_dummy")
    xgb_row = next(c for c in comparisons if c.model_type == "xgboost_tuned")

    assert dummy_row.metrics.roc_auc == 0.5
    assert xgb_row.metrics.roc_auc > 0.60
    assert xgb_row.metrics.f1_score > 0.0


# ==============================================================================
# 4. Probability Calibration & ECE Tests
# ==============================================================================

def test_probability_calibration_ece():
    """Verify probability calibration produces decile bins and valid ECE scores."""
    y_true = np.array([0, 0, 0, 1, 0, 1, 1, 1, 0, 1])
    y_prob = np.array([0.1, 0.2, 0.15, 0.85, 0.35, 0.75, 0.9, 0.8, 0.25, 0.95])

    ece, bins = PlacementModelEvaluator.calculate_ece(y_true, y_prob, n_bins=5)
    assert 0.0 <= ece <= 1.0
    assert len(bins) == 5
    assert any(b.sample_count > 0 for b in bins)


# ==============================================================================
# 5. Local Explainability (TreeSHAP) Tests
# ==============================================================================

def test_local_explainability_drivers_and_recommendations():
    """Verify local TreeSHAP attribution derives positive drivers, risk factors, and actionable advice."""
    df = dataset_generator.generate_synthetic_historical_cohort(n_samples=250, random_seed=999)
    X_train_raw, y_train, X_val_raw, y_val, X_test_raw, y_test, _ = TemporalSplitter.split(df)

    preprocessor = TabularDataPreprocessor()
    preprocessor.fit(X_train_raw)

    X_train = preprocessor.transform(X_train_raw)
    X_val = preprocessor.transform(X_val_raw)
    X_test = preprocessor.transform(X_test_raw)

    comparisons, calibrated_model, _, _ = placement_model_trainer.train_and_compare_all(
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        X_test=X_test,
        y_test=y_test,
        X_train_scaled=preprocessor.transform_scaled(X_train_raw),
        X_val_scaled=preprocessor.transform_scaled(X_val_raw),
        X_test_scaled=preprocessor.transform_scaled(X_test_raw),
        tune_hyperparameters=False,
    )

    sample_row = X_test.iloc[[0]]
    prob = float(calibrated_model.predict_proba(sample_row)[0][1])

    pos_drivers, risk_factors, recommendations = model_explainability_engine.explain_learner_prediction(
        model=calibrated_model,
        features_df=sample_row,
        placement_prob=prob,
    )

    assert isinstance(pos_drivers, list)
    assert isinstance(risk_factors, list)
    assert len(recommendations) >= 1
    for rec in recommendations:
        assert rec.category in ("PRACTICE_DRILL", "PROJECT", "APPLICATION", "ROLE_ALIGNMENT", "RESUME")
        assert rec.potential_probability_boost > 0.0
        assert rec.priority in ("HIGH", "MEDIUM", "LOW")


# ==============================================================================
# 6. Model Versioning & Registry Persistence Tests
# ==============================================================================

def test_model_registry_save_and_reload(tmp_path):
    """Verify model registry serializes artifacts and reloads them cleanly."""
    registry = PlacementModelRegistry(registry_dir=tmp_path)

    df = dataset_generator.generate_synthetic_historical_cohort(n_samples=150, random_seed=111)
    X_train_raw, y_train, X_val_raw, y_val, X_test_raw, y_test, split_info = TemporalSplitter.split(df)

    preprocessor = TabularDataPreprocessor()
    preprocessor.fit(X_train_raw)
    X_train = preprocessor.transform(X_train_raw)
    X_val = preprocessor.transform(X_val_raw)
    X_test = preprocessor.transform(X_test_raw)

    comparisons, calibrated_model, best_params, calib_curve = placement_model_trainer.train_and_compare_all(
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        X_test=X_test,
        y_test=y_test,
        X_train_scaled=preprocessor.transform_scaled(X_train_raw),
        X_val_scaled=preprocessor.transform_scaled(X_val_raw),
        X_test_scaled=preprocessor.transform_scaled(X_test_raw),
        tune_hyperparameters=False,
    )

    calibrated_row = next(c for c in comparisons if c.model_type == "xgboost_calibrated")

    # Save to registry
    meta_dto = registry.save_model(
        model=calibrated_model,
        preprocessor=preprocessor,
        model_version="xgb-placement-test-v1",
        metrics=calibrated_row.metrics,
        hyperparameters=best_params,
        calibration_curve=calib_curve,
        top_feature_importances=[],
        temporal_splits=split_info,
        dataset_size=150,
    )

    assert meta_dto.model_version == "xgb-placement-test-v1"

    # Reload into fresh registry instance
    fresh_registry = PlacementModelRegistry(registry_dir=tmp_path)
    loaded = fresh_registry.load_active_model()
    assert loaded is True
    assert fresh_registry.active_model is not None
    assert fresh_registry.active_preprocessor is not None

    meta = fresh_registry.get_metadata()
    assert meta is not None
    assert meta.model_version == "xgb-placement-test-v1"


# ==============================================================================
# 7. End-to-End API Integration Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_placement_ml_api_endpoints(
    client: AsyncClient,
    auth_headers_admin: dict,
):
    """
    Test all Phase 5 REST endpoints:
    1. POST /api/v1/ml/placement/train
    2. GET /api/v1/ml/placement/data-quality
    3. GET /api/v1/ml/placement/model
    4. GET /api/v1/ml/placement/runs
    5. GET /api/v1/learners/me/placement-prediction
    """
    # 0. Register candidate for learner auth
    email = f"phase5.learner.{uuid.uuid4().hex[:8]}@test.com"
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password1234!", "full_name": "Phase 5 Learner", "role": "LEARNER"},
    )
    assert reg.status_code == 201
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password1234!"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    learner_auth_headers = {"Authorization": f"Bearer {token}"}

    # 1. Data Quality
    dq_res = await client.get("/api/v1/ml/placement/data-quality", headers=auth_headers_admin)
    assert dq_res.status_code == 200
    dq_json = dq_res.json()
    assert dq_json["total_records"] >= 100
    assert dq_json["health_status"] in ("EXCELLENT", "HEALTHY")

    # 2. Train Model
    train_payload = {
        "feature_version": "v1",
        "label_type": "INTERNSHIP_ACCEPTED",
        "horizon_days": 90,
        "tune_hyperparameters": False,
        "calibration_method": "isotonic",
        "sample_size": 300,
        "use_synthetic_cohort": True,
    }
    train_res = await client.post(
        "/api/v1/ml/placement/train",
        json=train_payload,
        headers=auth_headers_admin,
    )
    assert train_res.status_code == 200
    train_data = train_res.json()
    assert "model_version" in train_data
    assert train_data["selected_model"] == "Calibrated XGBoost"
    assert len(train_data["models_comparison"]) >= 4

    # 3. Get Active Model Metadata
    model_res = await client.get("/api/v1/ml/placement/model", headers=auth_headers_admin)
    assert model_res.status_code == 200
    model_json = model_res.json()
    assert model_json["is_active"] is True
    assert "metrics" in model_json
    assert "calibration" in model_json

    # 4. List Historical Runs
    runs_res = await client.get("/api/v1/ml/placement/runs", headers=auth_headers_admin)
    assert runs_res.status_code == 200
    runs_json = runs_res.json()
    assert isinstance(runs_json, list)
    assert len(runs_json) >= 1

    # 5. Candidate Self Placement Prediction
    pred_res = await client.get("/api/v1/learners/me/placement-prediction", headers=learner_auth_headers)
    assert pred_res.status_code == 200
    pred_json = pred_res.json()
    assert "placement_probability" in pred_json
    assert 0.0 <= pred_json["placement_probability"] <= 1.0
    assert "readiness_tier" in pred_json
    assert "top_positive_drivers" in pred_json
    assert "top_risk_factors" in pred_json
    assert "actionable_recommendations" in pred_json
    assert len(pred_json["actionable_recommendations"]) >= 1

    # 6. Unauthorized check (Learners cannot access training)
    unauth_train = await client.post(
        "/api/v1/ml/placement/train",
        json=train_payload,
        headers=learner_auth_headers,
    )
    assert unauth_train.status_code == 403
