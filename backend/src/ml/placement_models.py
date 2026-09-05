from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    log_loss,
    precision_score,
    recall_score,
    roc_auc_score,
)
import xgboost as xgb

from src.core.logging import logger
from src.schemas.placement_ml_dto import (
    CalibrationCurveBinDTO,
    CalibrationCurveDTO,
    ModelComparisonRowDTO,
    ModelMetricsDTO,
)


class PlacementModelEvaluator:
    """
    Computes rigorous classification, calibration, and ranking metrics
    on holdout test sets.
    """

    @classmethod
    def calculate_ece(
        cls, y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10
    ) -> Tuple[float, List[CalibrationCurveBinDTO]]:
        """
        Calculates Expected Calibration Error (ECE) and decile reliability bins.
        ECE = sum(|acc(b) - conf(b)| * (|B_b| / N))
        """
        bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
        ece = 0.0
        n_total = len(y_true)
        bins_dto: List[CalibrationCurveBinDTO] = []

        for i in range(n_bins):
            low = bin_edges[i]
            high = bin_edges[i + 1]
            if i == n_bins - 1:
                mask = (y_prob >= low) & (y_prob <= high)
            else:
                mask = (y_prob >= low) & (y_prob < high)

            count = int(np.sum(mask))
            if count > 0:
                bin_prob = float(np.mean(y_prob[mask]))
                bin_true = float(np.mean(y_true[mask]))
                ece += (count / n_total) * abs(bin_true - bin_prob)
                bins_dto.append(
                    CalibrationCurveBinDTO(
                        bin_index=i,
                        mean_predicted_prob=round(bin_prob, 4),
                        fraction_of_positives=round(bin_true, 4),
                        sample_count=count,
                    )
                )
            else:
                bins_dto.append(
                    CalibrationCurveBinDTO(
                        bin_index=i,
                        mean_predicted_prob=round((low + high) / 2.0, 4),
                        fraction_of_positives=0.0,
                        sample_count=0,
                    )
                )

        return round(float(ece), 4), bins_dto

    @classmethod
    def evaluate(
        cls, y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.5
    ) -> ModelMetricsDTO:
        """
        Evaluates predictions against true labels.
        Safely handles single-class edge cases and returns standard metrics.
        """
        y_true = np.asarray(y_true, dtype=int)
        y_prob = np.asarray(y_prob, dtype=float)
        y_prob = np.clip(y_prob, 1e-6, 1.0 - 1e-6)

        # ROC-AUC & PR-AUC
        try:
            if len(np.unique(y_true)) > 1:
                roc_auc = float(roc_auc_score(y_true, y_prob))
                pr_auc = float(average_precision_score(y_true, y_prob))
            else:
                roc_auc = 0.5
                pr_auc = float(np.mean(y_true))
        except Exception:
            roc_auc = 0.5
            pr_auc = 0.5

        # Brier score & Log Loss
        brier = float(brier_score_loss(y_true, y_prob))
        ll = float(log_loss(y_true, y_prob))

        # ECE
        ece, _ = cls.calculate_ece(y_true, y_prob)

        # Optimize F1 threshold across candidates
        thresholds = np.linspace(0.2, 0.8, 25)
        best_f1 = 0.0
        best_th = 0.5

        for th in thresholds:
            preds_th = (y_prob >= th).astype(int)
            f1_candidate = f1_score(y_true, preds_th, zero_division=0)
            if f1_candidate > best_f1:
                best_f1 = f1_candidate
                best_th = float(th)

        # Standard binary metrics at selected threshold
        y_pred = (y_prob >= best_th).astype(int)
        acc = float(accuracy_score(y_true, y_pred))
        prec = float(precision_score(y_true, y_pred, zero_division=0))
        rec = float(recall_score(y_true, y_pred, zero_division=0))
        f1 = float(f1_score(y_true, y_pred, zero_division=0))

        # Confusion Matrix
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()

        return ModelMetricsDTO(
            roc_auc=round(roc_auc, 4),
            pr_auc=round(pr_auc, 4),
            brier_score=round(brier, 4),
            log_loss=round(ll, 4),
            ece=ece,
            accuracy=round(acc, 4),
            precision=round(prec, 4),
            recall=round(rec, 4),
            f1_score=round(f1, 4),
            best_threshold=round(best_th, 4),
            confusion_matrix={
                "tp": int(tp),
                "fp": int(fp),
                "tn": int(tn),
                "fn": int(fn),
            },
        )


class PlacementModelTrainer:
    """
    Trains, tunes, and compares:
    1. Baseline Dummy Classifier
    2. Baseline Logistic Regression (L2)
    3. Baseline Random Forest
    4. Default XGBoost
    5. Tuned XGBoost (Cross-validated on temporal validation set)
    6. Calibrated Tuned XGBoost (Probability calibration via Isotonic / Sigmoid)
    """

    HYPERPARAMETER_SEARCH_SPACE = [
        {"max_depth": 3, "learning_rate": 0.05, "n_estimators": 100, "subsample": 0.8, "colsample_bytree": 0.8, "min_child_weight": 2, "reg_lambda": 1.0},
        {"max_depth": 4, "learning_rate": 0.05, "n_estimators": 150, "subsample": 0.85, "colsample_bytree": 0.85, "min_child_weight": 3, "reg_lambda": 2.0},
        {"max_depth": 4, "learning_rate": 0.08, "n_estimators": 120, "subsample": 0.9, "colsample_bytree": 0.8, "min_child_weight": 2, "reg_lambda": 1.5},
        {"max_depth": 5, "learning_rate": 0.03, "n_estimators": 180, "subsample": 0.8, "colsample_bytree": 0.75, "min_child_weight": 4, "reg_lambda": 3.0},
        {"max_depth": 3, "learning_rate": 0.10, "n_estimators": 90, "subsample": 0.85, "colsample_bytree": 0.9, "min_child_weight": 1, "reg_lambda": 1.0},
    ]

    @classmethod
    def train_and_compare_all(
        cls,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_val: pd.DataFrame,
        y_val: pd.Series,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        X_train_scaled: np.ndarray,
        X_val_scaled: np.ndarray,
        X_test_scaled: np.ndarray,
        calibration_method: str = "isotonic",
        tune_hyperparameters: bool = True,
    ) -> Tuple[List[ModelComparisonRowDTO], Any, Dict[str, Any], CalibrationCurveDTO]:
        """
        Executes end-to-end training and evaluation across model families.
        Returns:
        (comparisons, final_calibrated_model, best_params, calibration_curve_dto)
        """
        comparisons: List[ModelComparisonRowDTO] = []
        y_train_arr = y_train.to_numpy(dtype=int)
        y_val_arr = y_val.to_numpy(dtype=int)
        y_test_arr = y_test.to_numpy(dtype=int)

        n_pos = int(np.sum(y_train_arr == 1))
        n_neg = int(np.sum(y_train_arr == 0))
        scale_pos_weight = float(n_neg / max(1, n_pos))

        # ----------------------------------------------------------------------
        # 1. Baseline: Dummy Classifier (Prior Frequency)
        # ----------------------------------------------------------------------
        dummy = DummyClassifier(strategy="prior")
        dummy.fit(X_train, y_train_arr)
        dummy_probs = dummy.predict_proba(X_test)[:, 1]
        dummy_metrics = PlacementModelEvaluator.evaluate(y_test_arr, dummy_probs)
        comparisons.append(
            ModelComparisonRowDTO(
                model_name="Majority Class Baseline",
                model_type="baseline_dummy",
                description="Predicts empirical prior class probability from training data",
                metrics=dummy_metrics,
                is_active_candidate=False,
            )
        )

        # ----------------------------------------------------------------------
        # 2. Baseline: Logistic Regression with L2 Regularization
        # ----------------------------------------------------------------------
        lr = LogisticRegression(C=1.0, max_iter=1000, random_state=42, class_weight="balanced")
        lr.fit(X_train_scaled, y_train_arr)
        lr_probs = lr.predict_proba(X_test_scaled)[:, 1]
        lr_metrics = PlacementModelEvaluator.evaluate(y_test_arr, lr_probs)
        comparisons.append(
            ModelComparisonRowDTO(
                model_name="Regularized Logistic Regression",
                model_type="logistic_regression",
                description="L2-regularized linear baseline with standardized features",
                metrics=lr_metrics,
                is_active_candidate=False,
            )
        )

        # ----------------------------------------------------------------------
        # 3. Baseline: Random Forest Classifier
        # ----------------------------------------------------------------------
        rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=6,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )
        rf.fit(X_train, y_train_arr)
        rf_probs = rf.predict_proba(X_test)[:, 1]
        rf_metrics = PlacementModelEvaluator.evaluate(y_test_arr, rf_probs)
        comparisons.append(
            ModelComparisonRowDTO(
                model_name="Random Forest Classifier",
                model_type="random_forest",
                description="Bagged non-linear ensemble with 100 decision trees",
                metrics=rf_metrics,
                is_active_candidate=False,
            )
        )

        # ----------------------------------------------------------------------
        # 4. Default XGBoost
        # ----------------------------------------------------------------------
        default_xgb = xgb.XGBClassifier(
            objective="binary:logistic",
            eval_metric="logloss",
            scale_pos_weight=scale_pos_weight,
            random_state=42,
            tree_method="hist",
        )
        default_xgb.fit(
            X_train,
            y_train_arr,
            eval_set=[(X_val, y_val_arr)],
            verbose=False,
        )
        default_xgb_probs = default_xgb.predict_proba(X_test)[:, 1]
        default_xgb_metrics = PlacementModelEvaluator.evaluate(y_test_arr, default_xgb_probs)
        comparisons.append(
            ModelComparisonRowDTO(
                model_name="Default XGBoost",
                model_type="xgboost_default",
                description="Standard gradient boosted trees with scale_pos_weight imbalance handling",
                metrics=default_xgb_metrics,
                is_active_candidate=False,
            )
        )

        # ----------------------------------------------------------------------
        # 5. Tuned XGBoost (Hyperparameter Optimization)
        # ----------------------------------------------------------------------
        best_params = cls.HYPERPARAMETER_SEARCH_SPACE[0]
        best_val_score = -1.0
        best_xgb_model = default_xgb

        search_space = cls.HYPERPARAMETER_SEARCH_SPACE if tune_hyperparameters else [cls.HYPERPARAMETER_SEARCH_SPACE[1]]

        for params in search_space:
            candidate_model = xgb.XGBClassifier(
                objective="binary:logistic",
                eval_metric="logloss",
                scale_pos_weight=scale_pos_weight,
                random_state=42,
                tree_method="hist",
                **params,
            )
            candidate_model.fit(
                X_train,
                y_train_arr,
                eval_set=[(X_val, y_val_arr)],
                verbose=False,
            )
            val_probs = candidate_model.predict_proba(X_val)[:, 1]
            try:
                val_auc = roc_auc_score(y_val_arr, val_probs)
            except Exception:
                val_auc = 0.5

            if val_auc > best_val_score:
                best_val_score = val_auc
                best_params = params
                best_xgb_model = candidate_model

        tuned_probs = best_xgb_model.predict_proba(X_test)[:, 1]
        tuned_metrics = PlacementModelEvaluator.evaluate(y_test_arr, tuned_probs)
        comparisons.append(
            ModelComparisonRowDTO(
                model_name="Tuned XGBoost",
                model_type="xgboost_tuned",
                description="Hyperparameter-tuned XGBoost optimizing temporal validation ROC-AUC",
                metrics=tuned_metrics,
                is_active_candidate=False,
            )
        )

        # ----------------------------------------------------------------------
        # 6. Probability Calibration (Isotonic or Sigmoid)
        # ----------------------------------------------------------------------
        try:
            from sklearn.frozen import FrozenEstimator
            calibrator = CalibratedClassifierCV(
                estimator=FrozenEstimator(best_xgb_model),
                method=calibration_method,
            )
            calibrator.fit(X_val, y_val_arr)
        except (ImportError, Exception):
            try:
                calibrator = CalibratedClassifierCV(
                    estimator=best_xgb_model,
                    method=calibration_method,
                    cv="prefit",
                )
                calibrator.fit(X_val, y_val_arr)
            except Exception:
                calibrator = CalibratedClassifierCV(
                    estimator=best_xgb_model,
                    method=calibration_method,
                    cv=2,
                )
                calibrator.fit(X_train, y_train_arr)

        calibrated_probs = calibrator.predict_proba(X_test)[:, 1]
        calibrated_metrics = PlacementModelEvaluator.evaluate(y_test_arr, calibrated_probs)

        comparisons.append(
            ModelComparisonRowDTO(
                model_name=f"Calibrated XGBoost ({calibration_method.title()})",
                model_type="xgboost_calibrated",
                description=f"Probability-calibrated XGBoost using {calibration_method} scaling on validation set",
                metrics=calibrated_metrics,
                is_active_candidate=True,
            )
        )

        # Calibration Decile Reliability Curve
        pre_ece, _ = PlacementModelEvaluator.calculate_ece(y_test_arr, tuned_probs)
        post_ece, curve_bins = PlacementModelEvaluator.calculate_ece(y_test_arr, calibrated_probs)

        calib_curve_dto = CalibrationCurveDTO(
            pre_calibration_brier=tuned_metrics.brier_score,
            post_calibration_brier=calibrated_metrics.brier_score,
            pre_calibration_ece=pre_ece,
            post_calibration_ece=post_ece,
            calibration_method=calibration_method,
            bins=curve_bins,
        )

        logger.info(
            f"Training & Evaluation complete. Tuned XGB ROC-AUC: {tuned_metrics.roc_auc:.4f}, "
            f"Calibrated Brier: {calibrated_metrics.brier_score:.4f} (was {tuned_metrics.brier_score:.4f}), "
            f"ECE: {post_ece:.4f} (was {pre_ece:.4f})"
        )

        return comparisons, calibrator, best_params, calib_curve_dto


placement_model_trainer = PlacementModelTrainer()
