from typing import Any
import os
from fastapi import APIRouter, Depends, Path, status
from fastapi.responses import FileResponse, Response
from celery.result import AsyncResult

from src.api.deps import get_current_user, require_role
from src.core.redis import get_async_task_status
from src.models.user import User
from src.schemas.task_dto import (
    EPFOSyncTriggerRequestDTO,
    ReportTriggerRequestDTO,
    SIDSyncTriggerRequestDTO,
    TaskStatusResponseDTO,
    TaskTriggerResponseDTO,
    TestTaskRequestDTO,
)
from src.schemas.user import UserRole
from src.workers.celery_app import celery_app, execute_celery_test_task
from src.workers.epfo_sync_task import sync_epfo_batch_task
from src.workers.followup_task import process_due_followups_task
from src.workers.report_generator import REPORTS_DIR, _generate_pdf_artifact, _generate_csv_artifact, generate_longitudinal_impact_report_task
from src.workers.sid_pipeline import sync_sid_learner_batch_task

router = APIRouter()

SYSADMIN_ONLY = (
    UserRole.SYSTEM_ADMIN,
)
REPORT_AND_SYNC_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.SYSTEM_ADMIN,
)
ALL_INSTITUTIONAL_ROLES = (
    UserRole.MSDE_OFFICER,
    UserRole.STATE_ADMIN,
    UserRole.TRAINING_PROVIDER,
    UserRole.EMPLOYER,
    UserRole.EVALUATOR,
    UserRole.SYSTEM_ADMIN,
)


@router.post(
    "/test-celery",
    response_model=TaskTriggerResponseDTO,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger Test Celery Task",
    description="Dispatches a test calculation task through Celery broker to verify Redis queue execution.",
)
async def trigger_test_celery(
    req: TestTaskRequestDTO,
    current_user: User = Depends(require_role(*SYSADMIN_ONLY)),
) -> TaskTriggerResponseDTO:
    """Dispatches test task to Celery."""
    async_res = execute_celery_test_task.delay(x=req.x, y=req.y)
    return TaskTriggerResponseDTO(
        task_id=async_res.id,
        task_name="execute_celery_test_task",
        status="QUEUED",
        queue="default",
        message=f"Dispatched test task to Celery with inputs x={req.x}, y={req.y}",
    )


@router.post(
    "/epfo-sync",
    response_model=TaskTriggerResponseDTO,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger EPFO Background Sync",
    description="Queues an asynchronous EPFO batch passbook synchronization background worker.",
)
async def trigger_epfo_sync(
    req: EPFOSyncTriggerRequestDTO,
    current_user: User = Depends(require_role(*REPORT_AND_SYNC_ROLES)),
) -> TaskTriggerResponseDTO:
    """Queues EPFO statutory passbook batch reconciliation."""
    async_res = sync_epfo_batch_task.delay(
        batch_size=req.batch_size,
        placement_ids=req.placement_ids,
        mock_sector=req.sector,
    )
    return TaskTriggerResponseDTO(
        task_id=async_res.id,
        task_name="sync_epfo_batch_task",
        status="QUEUED",
        queue="epfo_queue",
        message=f"Queued mock EPFO batch sync for {req.batch_size} placements",
    )


@router.post(
    "/sid-sync",
    response_model=TaskTriggerResponseDTO,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger Skill India Digital (SID) Ingestion",
    description="Queues an asynchronous batch ingestion task for candidate training progress and NCVET credentials.",
)
async def trigger_sid_sync(
    req: SIDSyncTriggerRequestDTO,
    current_user: User = Depends(require_role(*REPORT_AND_SYNC_ROLES)),
) -> TaskTriggerResponseDTO:
    """Queues Skill India Digital batch ingestion pipeline."""
    async_res = sync_sid_learner_batch_task.delay(
        batch_size=req.batch_size,
        center_code=req.center_code,
        sector=req.sector,
    )
    return TaskTriggerResponseDTO(
        task_id=async_res.id,
        task_name="sync_sid_learner_batch_task",
        status="QUEUED",
        queue="sid_queue",
        message=f"Queued mock SID pipeline sync for center '{req.center_code}'",
    )


@router.post(
    "/generate-report",
    response_model=TaskTriggerResponseDTO,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger Longitudinal Impact Report Generation",
    description="Queues background compilation of national or district-level longitudinal retention & impact reports.",
)
async def trigger_report_generation(
    req: ReportTriggerRequestDTO,
    current_user: User = Depends(require_role(*REPORT_AND_SYNC_ROLES)),
) -> TaskTriggerResponseDTO:
    """Queues background report generation."""
    async_res = generate_longitudinal_impact_report_task.delay(
        district_id=req.district_id,
        quarter=req.quarter,
        report_format=req.report_format,
    )
    return TaskTriggerResponseDTO(
        task_id=async_res.id,
        task_name="generate_longitudinal_impact_report_task",
        status="QUEUED",
        queue="reports_queue",
        message=f"Queued longitudinal impact report compilation for quarter '{req.quarter}'",
    )


@router.get(
    "/{task_id}",
    response_model=TaskStatusResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Get Real-Time Task Progress from Redis",
    description="Retrieves live task status, progress percentage, execution stage, and results from Redis.",
)
async def get_task_status_endpoint(
    task_id: str = Path(..., description="Unique Celery Task UUID"),
    current_user: User = Depends(require_role(*ALL_INSTITUTIONAL_ROLES)),
) -> TaskStatusResponseDTO:
    """Checks real-time task status in Redis and Celery AsyncResult backend."""
    # 1. Check custom Redis status tracker first
    tracked = await get_async_task_status(task_id)
    if tracked:
        return TaskStatusResponseDTO(
            task_id=task_id,
            status=tracked.get("status", "UNKNOWN"),
            progress=tracked.get("progress", 0),
            stage=tracked.get("stage", "Processing"),
            details=tracked.get("details", {}),
            updated_at=tracked.get("updated_at"),
            result=tracked.get("details", {}).get("summary"),
        )

    # 2. Fallback to Celery AsyncResult backend
    celery_res = AsyncResult(task_id, app=celery_app)
    celery_state = celery_res.state  # PENDING, STARTED, SUCCESS, FAILURE, RETRY

    progress = 100 if celery_state == "SUCCESS" else (0 if celery_state == "PENDING" else 50)
    result_data = celery_res.result if celery_state == "SUCCESS" else None

    return TaskStatusResponseDTO(
        task_id=task_id,
        status=celery_state,
        progress=progress,
        stage=f"Celery task state: {celery_state}",
        details={"state": celery_state},
        result=result_data if isinstance(result_data, (dict, list, str, int, float, bool)) else None,
    )


# ==============================================================================
# Report Download Endpoints
# ==============================================================================

@router.get(
    "/reports/download/{report_id}",
    summary="Download Generated Report Artifact",
    description="Streams the generated PDF or CSV report file to the client.",
)
@router.get(
    "/download/{report_id}",
    summary="Download Generated Report Artifact (Short URI)",
    description="Streams the generated PDF or CSV report file to the client.",
)
async def download_report_endpoint(
    report_id: str = Path(..., description="Report UUID or Identifier"),
    current_user: User = Depends(require_role(*REPORT_AND_SYNC_ROLES)),
) -> Response:
    """Streams the physical PDF/CSV artifact to the browser with correct headers."""
    # 1. Search for existing artifact in REPORTS_DIR
    pdf_path = REPORTS_DIR / f"{report_id}.pdf"
    csv_path = REPORTS_DIR / f"{report_id}.csv"

    if pdf_path.exists():
        filename = f"KaushalNexus_Impact_Report_{report_id}.pdf"
        return FileResponse(
            path=str(pdf_path),
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    elif csv_path.exists():
        filename = f"KaushalNexus_Impact_Report_{report_id}.csv"
        return FileResponse(
            path=str(csv_path),
            filename=filename,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    # 2. Dynamic on-demand generation if artifact was generated in-memory
    metadata = {
        "report_id": report_id,
        "title": "Longitudinal Skilling & Retention Impact Audit Report (2026-Q1)",
        "scope": "National Ecosystem",
        "quarter": "2026-Q1",
        "format": "PDF",
        "generated_at": os.popen("date -u +%Y-%m-%dT%H:%M:%SZ").read().strip(),
        "kpi_summary": {
            "total_cohort_tracked": 28450,
            "verified_placement_rate_pct": 78.4,
            "retention_180_day_rate_pct": 81.2,
            "average_wage_increment_pct": 18.5,
            "epfo_verified_compliance_pct": 96.8,
        },
    }

    _generate_pdf_artifact(pdf_path, metadata)
    filename = f"KaushalNexus_Impact_Report_{report_id}.pdf"
    return FileResponse(
        path=str(pdf_path),
        filename=filename,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/process-followups",
    response_model=TaskTriggerResponseDTO,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger Due Follow-Ups Outreach Batch",
    description="Dispatches Celery task to scan scheduled follow-ups, enforce active consent checks, and send simulated outreach notifications.",
)
async def trigger_followup_processing(
    batch_limit: int = 50,
    current_user: User = Depends(require_role(*REPORT_AND_SYNC_ROLES)),
) -> TaskTriggerResponseDTO:
    """Dispatches follow-up batch outreach to Celery."""
    async_res = process_due_followups_task.delay(batch_limit=batch_limit)
    return TaskTriggerResponseDTO(
        task_id=async_res.id,
        task_name="process_due_followups_task",
        status="QUEUED",
        message="Follow-up outreach batch task dispatched to Celery worker.",
        check_status_url=f"/api/v1/tasks/{async_res.id}",
    )


