from datetime import datetime
import json
import uuid
import pytest
from httpx import AsyncClient
import redis.asyncio as aioredis

from src.core.config import settings
from src.core.redis import (
    check_redis_connection,
    get_async_task_status,
    get_sync_redis,
    init_redis_pool,
    update_sync_task_status,
)
from src.workers.celery_app import celery_app, execute_celery_test_task
from src.workers.epfo_sync_task import sync_epfo_batch_task, verify_single_placement_epfo_task
from src.workers.report_generator import (
    generate_employer_network_report_task,
    generate_longitudinal_impact_report_task,
)
from src.workers.sid_pipeline import (
    sync_sid_learner_batch_task,
    verify_ncvet_credentials_task,
)


# ==============================================================================
# Redis Connection & Progress Tracking Unit Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_redis_connection_and_diagnostics():
    """Verify async Redis pool connection and diagnostic metrics."""
    pool = await init_redis_pool()
    assert pool is not None

    diag = await check_redis_connection()
    assert diag["status"] == "connected"
    assert diag["healthy"] is True
    assert diag["latency_ms"] >= 0.0
    assert "redis_version" in diag


def test_sync_redis_connection_and_caching():
    """Verify thread-safe sync Redis client for Celery workers."""
    sync_client = get_sync_redis()
    assert sync_client.ping() is True

    test_key = f"test:kn:{uuid.uuid4().hex[:6]}"
    sync_client.setex(test_key, 60, "kaushal_nexus_test_val")
    val = sync_client.get(test_key)
    assert val == "kaushal_nexus_test_val"
    sync_client.delete(test_key)


@pytest.mark.asyncio
async def test_redis_task_status_tracking():
    """Verify task progress lifecycle updates and retrieval via Redis."""
    task_id = f"task-{uuid.uuid4().hex[:8]}"
    
    # 1. Update status synchronously (as done inside Celery worker)
    update_sync_task_status(
        task_id=task_id,
        status="RUNNING",
        progress=45,
        stage="Processing milestone records",
        details={"processed": 45, "total": 100},
    )

    # 2. Retrieve asynchronously (as done by FastAPI endpoint)
    status_data = await get_async_task_status(task_id)
    assert status_data is not None
    assert status_data["task_id"] == task_id
    assert status_data["status"] == "RUNNING"
    assert status_data["progress"] == 45
    assert status_data["stage"] == "Processing milestone records"
    assert status_data["details"]["processed"] == 45


# ==============================================================================
# Celery Configuration & Task Discovery Tests
# ==============================================================================

def test_celery_configuration():
    """Verify Celery broker, result backend, and registered task names."""
    assert celery_app.conf.broker_url == settings.CELERY_BROKER_URL
    assert celery_app.conf.result_backend == settings.CELERY_RESULT_BACKEND
    assert celery_app.conf.task_serializer == "json"
    assert celery_app.conf.result_serializer == "json"

    registered_tasks = celery_app.tasks.keys()
    assert "src.workers.celery_app.execute_celery_test_task" in registered_tasks
    assert "src.workers.epfo_sync_task.sync_epfo_batch_task" in registered_tasks
    assert "src.workers.sid_pipeline.sync_sid_learner_batch_task" in registered_tasks
    assert "src.workers.report_generator.generate_longitudinal_impact_report_task" in registered_tasks


# ==============================================================================
# Celery Task Execution Verification (via Redis Broker & Backend)
# ==============================================================================

def test_celery_test_task_execution():
    """Verify simple test task executes properly and stores result."""
    result = execute_celery_test_task.apply(args=[15, 27])
    assert result.successful()
    data = result.result
    assert data["task"] == "execute_celery_test_task"
    assert data["input_x"] == 15
    assert data["input_y"] == 27
    assert data["calculation_result"] == 42
    assert data["status"] == "SUCCESS"


def test_epfo_sync_worker_mock_execution():
    """Verify EPFO batch sync worker processes mock remittances and emits structured audit."""
    result = sync_epfo_batch_task.apply(kwargs={"batch_size": 15, "mock_sector": "IT-ITeS"})
    assert result.successful()
    summary = result.result

    assert summary["total_records_evaluated"] == 15
    assert summary["verified_active_count"] > 0
    assert summary["compliance_rate_pct"] > 0.0
    assert summary["source"] == "MOCK_EPFO_STAGING_BRIDGE"


def test_sid_pipeline_worker_mock_execution():
    """Verify Skill India Digital ingestion worker processes mock candidate records."""
    result = sync_sid_learner_batch_task.apply(
        kwargs={"batch_size": 20, "center_code": "PMKK-UP-NOIDA-01"}
    )
    assert result.successful()
    data = result.result

    assert data["total_learners_synced"] == 20
    assert data["center_code"] == "PMKK-UP-NOIDA-01"
    assert data["total_training_hours_logged"] > 0
    assert data["status"] == "COMPLETED"
    assert "sid_batch_reference" in data


def test_report_generator_worker_execution():
    """Verify longitudinal impact report generator creates structured metrics digest."""
    result = generate_longitudinal_impact_report_task.apply(
        kwargs={"district_id": "UP-VARANASI", "quarter": "2026-Q1", "report_format": "PDF"}
    )
    assert result.successful()
    report = result.result

    assert report["district_id"] == "UP-VARANASI"
    assert report["quarter"] == "2026-Q1"
    assert report["format"] == "PDF"
    assert "kpi_summary" in report
    assert report["kpi_summary"]["verified_placement_rate_pct"] > 0.0
    assert report["status"] == "COMPLETED"


# ==============================================================================
# REST API Integration Tests for Background Task Dispatch & Monitoring
# ==============================================================================

@pytest.mark.asyncio
async def test_trigger_celery_task_endpoint(client: AsyncClient, auth_headers_admin: dict):
    """Test POST /api/v1/tasks/test-celery dispatches task to Redis/Celery queue."""
    resp = await client.post(
        "/api/v1/tasks/test-celery",
        json={"x": 20, "y": 30},
        headers=auth_headers_admin,
    )
    assert resp.status_code == 202
    data = resp.json()
    assert "task_id" in data
    assert data["status"] == "QUEUED"
    assert data["task_name"] == "execute_celery_test_task"

    # Query task status endpoint
    task_id = data["task_id"]
    status_resp = await client.get(
        f"/api/v1/tasks/{task_id}",
        headers=auth_headers_admin,
    )
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["task_id"] == task_id
    assert status_data["status"] in ["PENDING", "QUEUED", "RUNNING", "COMPLETED", "SUCCESS"]


@pytest.mark.asyncio
async def test_trigger_epfo_and_sid_and_report_endpoints(
    client: AsyncClient, auth_headers: dict
):
    """Test triggering background workers via REST endpoints."""
    # 1. EPFO Sync
    resp1 = await client.post(
        "/api/v1/tasks/epfo-sync",
        json={"batch_size": 10, "sector": "Automotive"},
        headers=auth_headers,
    )
    assert resp1.status_code == 202
    assert resp1.json()["task_name"] == "sync_epfo_batch_task"

    # 2. SID Pipeline Sync
    resp2 = await client.post(
        "/api/v1/tasks/sid-sync",
        json={"batch_size": 15, "center_code": "PMKK-VARANASI-01"},
        headers=auth_headers,
    )
    assert resp2.status_code == 202
    assert resp2.json()["task_name"] == "sync_sid_learner_batch_task"

    # 3. Report Generation
    resp3 = await client.post(
        "/api/v1/tasks/generate-report",
        json={"district_id": "UP-LUCKNOW", "quarter": "2026-Q1", "report_format": "PDF"},
        headers=auth_headers,
    )
    assert resp3.status_code == 202
    assert resp3.json()["task_name"] == "generate_longitudinal_impact_report_task"


@pytest.mark.asyncio
async def test_report_download_endpoint(client: AsyncClient, auth_headers: dict):
    """Test GET /api/v1/tasks/reports/download/{report_id} returns generated PDF artifact."""
    report_id = f"RPT-TEST-{uuid.uuid4().hex[:6].upper()}"
    resp = await client.get(
        f"/api/v1/tasks/reports/download/{report_id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in resp.headers["content-disposition"]
    assert resp.content.startswith(b"%PDF-")

