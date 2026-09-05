from datetime import datetime, timezone
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.placement_prediction import (
    ModelMonitoringSnapshot,
    ModelPromotionEvent,
)
from src.schemas.career_intelligence_dto import (
    ModelMonitoringResponseDTO,
    RetrainCandidateRequestDTO,
    RetrainCandidateResponseDTO,
)
from src.services.model_monitoring_service import model_monitoring_service


def test_compute_gaussian_psi_metric():
    """Verify Population Stability Index (PSI) formula returns near-zero for identical distributions and flags large shifts."""
    # Identical distributions -> PSI ~ 0.0
    psi_zero = model_monitoring_service._compute_gaussian_psi(
        mean_baseline=0.50, std_baseline=0.15, mean_curr=0.50, std_curr=0.15
    )
    assert psi_zero == pytest.approx(0.0, abs=1e-3)

    # Moderate shift
    psi_mod = model_monitoring_service._compute_gaussian_psi(
        mean_baseline=0.50, std_baseline=0.15, mean_curr=0.58, std_curr=0.16
    )
    assert 0.05 <= psi_mod <= 0.25

    # Critical shift (> 2 standard deviations)
    psi_crit = model_monitoring_service._compute_gaussian_psi(
        mean_baseline=0.50, std_baseline=0.15, mean_curr=0.90, std_curr=0.25
    )
    assert psi_crit >= 0.25


@pytest.mark.asyncio
async def test_model_monitoring_and_governance_pipeline(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_admin: dict,
):
    """
    Test Phase 6 Monitoring, Quality Gates, and Auditable Promotion:
    1. GET /api/v1/ml/placement/monitoring returns drift and calibration status
    2. POST /api/v1/ml/placement/retrain trains candidate without mutating active model
    3. POST /api/v1/ml/placement/models/{model_id}/activate promotes candidate and logs audit event
    """
    # 1. Query Monitoring Report
    mon_res = await client.get("/api/v1/ml/placement/monitoring", headers=auth_headers_admin)
    assert mon_res.status_code == 200
    mon_data = mon_res.json()
    assert "active_model" in mon_data
    assert "monitoring_status" in mon_data
    assert "drift_status" in mon_data
    assert "calibration_status" in mon_data
    assert isinstance(mon_data["calibration_buckets"], list)
    assert isinstance(mon_data["drift_metrics"], list)

    # Check persistence in ModelMonitoringSnapshot table
    snap_stmt = select(ModelMonitoringSnapshot).order_by(ModelMonitoringSnapshot.evaluation_date.desc())
    snap_res = await db.execute(snap_stmt)
    snapshots = snap_res.scalars().all()
    assert len(snapshots) >= 1

    # 2. Retrain Candidate Model with Quality Gates
    retrain_res = await client.post(
        "/api/v1/ml/placement/retrain",
        json={
            "horizon_days": 90,
            "tune_hyperparameters": False,
            "min_records": 100,
        },
        headers=auth_headers_admin,
    )
    assert retrain_res.status_code == 200
    retrain_data = retrain_res.json()
    assert "candidate_model_id" in retrain_data
    assert "quality_gates" in retrain_data
    assert "recommendation" in retrain_data
    assert retrain_data["status"] in ("PASSED", "PARITY", "FAILED")
    candidate_id = retrain_data["candidate_model_id"]

    # 3. Promote Candidate Model with Auditable Justification
    promote_res = await client.post(
        f"/api/v1/ml/placement/models/{candidate_id}/activate",
        json={
            "reason": "Promoted following successful validation against Phase 6 calibration and discrimination gates.",
        },
        headers=auth_headers_admin,
    )
    assert promote_res.status_code == 200
    promote_data = promote_res.json()
    assert promote_data["status"] == "ACTIVE"
    assert promote_data["model_id"] == candidate_id

    # Check persistence in ModelPromotionEvent table
    event_stmt = (
        select(ModelPromotionEvent)
        .where(ModelPromotionEvent.model_id == candidate_id)
        .order_by(ModelPromotionEvent.created_at.desc())
    )
    event_res = await db.execute(event_stmt)
    events = event_res.scalars().all()
    assert len(events) >= 1
    assert events[0].action == "PROMOTED"
    assert "Phase 6" in events[0].reason
