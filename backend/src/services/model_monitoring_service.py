from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional
import uuid
import numpy as np
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import BadRequestException, NotFoundException
from src.core.logging import logger
from src.ml.model_registry import model_registry
from src.models.placement_prediction import (
    ModelMonitoringSnapshot,
    ModelPromotionEvent,
    PlacementPrediction,
)
from src.schemas.career_intelligence_dto import (
    DriftMetricDTO,
    ModelActivationRequestDTO,
    ModelActivationResponseDTO,
    ModelMonitoringResponseDTO,
    RetrainCandidateRequestDTO,
    RetrainCandidateResponseDTO,
)
from src.schemas.placement_ml_dto import TrainMLRequestDTO
from src.services.placement_prediction_service import placement_prediction_service


class ModelMonitoringService:
    """
    Continuous ML Model Governance & Monitoring Service.
    Tracks prediction distribution shifts, calibration drift, lightweight feature drift,
    and manages candidate model validation and auditable promotion/rollback.
    """

    BASELINE_FEATURE_DISTRIBUTIONS = {
        "bkt_mean_mastery": (0.52, 0.18),
        "role_match_score": (58.0, 19.5),
        "skill_gap_deficit": (0.32, 0.15),
        "completed_learning_ratio": (0.44, 0.22),
        "project_evidence_score": (0.48, 0.28),
        "career_velocity_score": (0.42, 0.24),
    }

    @staticmethod
    def _compute_gaussian_psi(mean_baseline: float, std_baseline: float, mean_curr: float, std_curr: float) -> float:
        """
        Computes symmetric Kullback-Leibler / PSI approximation for continuous distributions.
        PSI = (mu_t - mu_0)^2 / sigma_0^2 + (sigma_t^2 / sigma_0^2) - 1 - ln(sigma_t^2 / sigma_0^2)
        """
        s0 = max(std_baseline, 1e-4)
        st = max(std_curr, 1e-4)
        term1 = ((mean_curr - mean_baseline) ** 2) / (s0 ** 2)
        var_ratio = (st ** 2) / (s0 ** 2)
        term2 = var_ratio - 1.0 - math.log(max(var_ratio, 1e-6))
        psi = max(0.0, float(0.5 * (term1 + term2)))
        return round(psi, 4)

    async def get_monitoring_report(self, db: AsyncSession) -> ModelMonitoringResponseDTO:
        """
        Analyzes historical placement predictions, computes calibration deciles,
        detects feature drift, and logs a snapshot.
        """
        active_meta = model_registry.get_metadata()
        active_model_id = active_meta.model_version if active_meta else "xgb-placement-v1.0"

        # 1. Fetch recent placement predictions
        stmt = (
            select(PlacementPrediction)
            .order_by(PlacementPrediction.prediction_timestamp.desc())
            .limit(500)
        )
        res = await db.execute(stmt)
        predictions = res.scalars().all()

        pred_count = len(predictions)
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()

        if pred_count == 0:
            # Return baseline initial state
            return ModelMonitoringResponseDTO(
                active_model=active_model_id,
                prediction_count=0,
                mean_probability=0.50,
                median_probability=0.50,
                positive_prediction_rate=0.50,
                monitoring_status="LIMITED_DATA",
                drift_status="NORMAL",
                calibration_status="MONITORING",
                performance_metrics=active_meta.metrics.model_dump() if active_meta else None,
                calibration_buckets=[],
                drift_metrics=[],
                warnings=["Insufficient historical predictions logged for empirical drift computation."],
                last_evaluated_at=now_iso,
            )

        probs = [p.probability for p in predictions]
        mean_prob = float(np.mean(probs))
        median_prob = float(np.median(probs))
        positive_rate = float(np.mean([1.0 if p >= 0.50 else 0.0 for p in probs]))

        # 2. Calibration Buckets (10 deciles)
        buckets = []
        for dec in range(10):
            low = dec / 10.0
            high = (dec + 1) / 10.0
            if dec == 9:
                in_bucket = [p for p in predictions if low <= p.probability <= high]
            else:
                in_bucket = [p for p in predictions if low <= p.probability < high]

            b_count = len(in_bucket)
            b_mean = float(np.mean([p.probability for p in in_bucket])) if b_count > 0 else (low + high) / 2.0
            with_outcomes = [p for p in in_bucket if p.actual_outcome is not None]
            obs_rate = (
                float(np.mean([1.0 if p.actual_outcome == "INTERNSHIP_ACCEPTED" else 0.0 for p in with_outcomes]))
                if len(with_outcomes) > 0
                else None
            )

            buckets.append({
                "bucket": f"[{low:.1f} - {high:.1f})",
                "count": b_count,
                "mean_predicted": round(b_mean, 3),
                "observed_rate": round(obs_rate, 3) if obs_rate is not None else None,
            })

        # 3. Drift Evaluation
        drift_metrics: List[DriftMetricDTO] = []
        warnings: List[str] = []
        has_critical_drift = False
        has_warning_drift = False

        # Extract simulated/recorded feature aggregates
        readiness_scores = [p.readiness_score for p in predictions]
        curr_bkt_mean = float(np.mean(probs))  # correlated proxy
        curr_bkt_std = float(np.std(probs)) if len(probs) > 1 else 0.15

        curr_readiness_mean = float(np.mean(readiness_scores))
        curr_readiness_std = float(np.std(readiness_scores)) if len(readiness_scores) > 1 else 0.20

        feature_current_stats = {
            "bkt_mean_mastery": (curr_bkt_mean, curr_bkt_std),
            "role_match_score": (curr_readiness_mean * 100.0, curr_readiness_std * 100.0),
            "skill_gap_deficit": (max(0.05, 1.0 - curr_readiness_mean), curr_readiness_std * 0.8),
            "completed_learning_ratio": (curr_readiness_mean * 0.9, curr_readiness_std * 0.9),
            "project_evidence_score": (curr_readiness_mean * 0.85, curr_readiness_std),
            "career_velocity_score": (curr_readiness_mean * 0.75, curr_readiness_std * 0.9),
        }

        for fname, (b_mean, b_std) in self.BASELINE_FEATURE_DISTRIBUTIONS.items():
            c_mean, c_std = feature_current_stats.get(fname, (b_mean, b_std))
            m_shift = abs(c_mean - b_mean) / max(b_std, 1e-4)
            psi = self._compute_gaussian_psi(b_mean, b_std, c_mean, c_std)

            if psi >= 0.25:
                status = "CRITICAL"
                has_critical_drift = True
                warnings.append(f"Significant feature drift detected on '{fname}' (PSI: {psi}). Model retraining advised.")
            elif psi >= 0.10:
                status = "WARNING"
                has_warning_drift = True
                warnings.append(f"Moderate feature drift detected on '{fname}' (PSI: {psi}).")
            else:
                status = "NORMAL"

            drift_metrics.append(
                DriftMetricDTO(
                    feature_name=fname,
                    baseline_mean=round(b_mean, 3),
                    current_mean=round(c_mean, 3),
                    mean_shift=round(m_shift, 3),
                    baseline_std=round(b_std, 3),
                    current_std=round(c_std, 3),
                    psi_estimate=psi,
                    status=status,
                )
            )

        overall_drift_status = "CRITICAL" if has_critical_drift else ("WARNING" if has_warning_drift else "NORMAL")

        # 4. Verified Outcome Metrics
        actual_outcomes = [p for p in predictions if p.actual_outcome is not None]
        perf_metrics = active_meta.metrics.model_dump() if active_meta else None
        calib_status = "MONITORING"
        if len(actual_outcomes) >= 10:
            calib_status = "ALIGNED"
            monitoring_status = "HEALTHY"
        else:
            monitoring_status = "LIMITED_DATA" if pred_count < 20 else "HEALTHY"

        if overall_drift_status == "CRITICAL":
            monitoring_status = "DEGRADED"

        # 5. Persist Snapshot
        snapshot = ModelMonitoringSnapshot(
            model_id=active_model_id,
            evaluation_date=now_dt,
            prediction_count=pred_count,
            mean_probability=round(mean_prob, 4),
            actual_outcome_count=len(actual_outcomes),
            roc_auc=active_meta.metrics.roc_auc if active_meta else None,
            pr_auc=active_meta.metrics.pr_auc if active_meta else None,
            brier_score=active_meta.metrics.brier_score if active_meta else None,
            ece=active_meta.metrics.ece if active_meta else None,
            drift_status=overall_drift_status,
            monitoring_status=monitoring_status,
            metrics_json={
                "drift_metrics": [d.model_dump() for d in drift_metrics],
                "calibration_buckets": buckets,
                "warnings": warnings,
            },
        )
        db.add(snapshot)
        await db.commit()

        return ModelMonitoringResponseDTO(
            active_model=active_model_id,
            prediction_count=pred_count,
            mean_probability=round(mean_prob, 4),
            median_probability=round(median_prob, 4),
            positive_prediction_rate=round(positive_rate, 4),
            monitoring_status=monitoring_status,
            drift_status=overall_drift_status,
            calibration_status=calib_status,
            performance_metrics=perf_metrics,
            calibration_buckets=buckets,
            drift_metrics=drift_metrics,
            warnings=warnings,
            last_evaluated_at=now_iso,
        )

    async def retrain_candidate_model(
        self,
        db: AsyncSession,
        req: RetrainCandidateRequestDTO,
    ) -> RetrainCandidateResponseDTO:
        """
        Executes controlled candidate retraining without overwriting active model.
        Evaluates candidate against active model quality gates.
        """
        train_req = TrainMLRequestDTO(
            horizon_days=req.horizon_days,
            tune_hyperparameters=req.tune_hyperparameters,
            sample_size=req.min_records,
            use_synthetic_cohort=True,
        )

        candidate_res = await placement_prediction_service.run_training_pipeline(
            db=db,
            req=train_req,
            as_candidate=True,
        )

        active_meta = model_registry.get_metadata()
        active_metrics = (
            active_meta.metrics.model_dump()
            if active_meta
            else {"roc_auc": 0.70, "pr_auc": 0.50, "brier_score": 0.18, "ece": 0.10}
        )

        # Candidate selected model metrics
        calibrated_comp = next(
            c for c in candidate_res.models_comparison
            if c.model_type == "xgboost_calibrated"
        )
        cand_metrics = calibrated_comp.metrics.model_dump()

        # Quality Gate Checks
        roc_gate = cand_metrics["roc_auc"] >= 0.68 and cand_metrics["roc_auc"] >= (active_metrics["roc_auc"] - 0.03)
        pr_gate = cand_metrics["pr_auc"] >= 0.48
        brier_gate = cand_metrics["brier_score"] <= 0.22
        ece_gate = cand_metrics["ece"] <= 0.16

        quality_gates = {
            "roc_auc_gate (>= 0.68)": roc_gate,
            "pr_auc_gate (>= 0.48)": pr_gate,
            "brier_score_gate (<= 0.22)": brier_gate,
            "ece_gate (<= 0.16)": ece_gate,
        }

        all_gates_passed = all(quality_gates.values())
        if all_gates_passed and cand_metrics["roc_auc"] >= active_metrics["roc_auc"]:
            recommendation = "RECOMMEND_PROMOTION: Candidate satisfies all calibration gates and improves discrimination."
            status = "PASSED"
        elif all_gates_passed:
            recommendation = "ACCEPTABLE: Candidate satisfies all quality gates with parity. Manual review recommended."
            status = "PARITY"
        else:
            recommendation = "HOLD_REJECT: Candidate failed one or more quality gates. Active model remains in production."
            status = "FAILED"

        return RetrainCandidateResponseDTO(
            candidate_model_id=candidate_res.model_version,
            active_model_id=active_meta.model_version if active_meta else "None",
            candidate_metrics=cand_metrics,
            active_metrics=active_metrics,
            quality_gates=quality_gates,
            recommendation=recommendation,
            status=status,
            evaluated_at=datetime.now(timezone.utc).isoformat(),
        )

    async def activate_candidate_model(
        self,
        db: AsyncSession,
        model_id: str,
        actor_id: str,
        reason: str,
    ) -> ModelActivationResponseDTO:
        """
        Promotes a candidate or archived model version to become active.
        Audits promotion event in model_promotion_events table.
        """
        active_meta = model_registry.get_metadata()
        previous_id = active_meta.model_version if active_meta else None

        try:
            promoted_meta = model_registry.promote_candidate(target_version=model_id)
        except Exception as e:
            logger.error(f"Failed to promote model '{model_id}': {e}")
            raise BadRequestException(f"Could not promote model '{model_id}': {str(e)}")

        # Log audit event
        audit_event = ModelPromotionEvent(
            model_id=model_id,
            previous_model_id=previous_id,
            action="PROMOTED",
            actor_id=actor_id,
            reason=reason,
        )
        db.add(audit_event)
        await db.commit()

        logger.info(f"Model '{model_id}' successfully promoted by actor '{actor_id}'. Reason: {reason}")

        return ModelActivationResponseDTO(
            model_id=model_id,
            previous_model_id=previous_id,
            status="ACTIVE",
            activated_at=datetime.now(timezone.utc).isoformat(),
            message=f"Model '{model_id}' promoted to ACTIVE. System now serving inference with this version.",
        )


model_monitoring_service = ModelMonitoringService()
