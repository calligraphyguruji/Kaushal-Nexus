from datetime import datetime, timezone
import json
import time
from typing import Any, Dict, Optional
from celery import Celery, Task
from celery.utils.log import get_task_logger

from src.core.config import settings
from src.core.redis import update_sync_task_status

logger = get_task_logger(__name__)


# ==============================================================================
# Base Task with Automatic Structured Logging & Redis Status Tracking
# ==============================================================================

class KaushalNexusBaseTask(Task):
    """
    Base Celery Task class providing:
    - Automated task lifecycle state recording in Redis
    - Exponential backoff retry logging
    - Structured metrics emission
    """
    abstract = True

    def on_retry(self, exc: Exception, task_id: str, args: tuple, kwargs: dict, einfo: Any) -> None:
        """Invoked when a task is scheduled for retry."""
        logger.warning(
            f"[TASK RETRY] Task '{self.name}' [ID: {task_id}] failed. "
            f"Scheduling retry ({self.request.retries}/{self.max_retries}). Reason: {exc}"
        )
        update_sync_task_status(
            task_id=task_id,
            status="RETRYING",
            progress=int((self.request.retries / max(1, self.max_retries)) * 50),
            stage=f"Retrying after failure: {str(exc)[:100]}",
            details={
                "task_name": self.name,
                "retries": self.request.retries,
                "max_retries": self.max_retries,
                "error": str(exc),
            },
        )
        super().on_retry(exc, task_id, args, kwargs, einfo)

    def on_failure(self, exc: Exception, task_id: str, args: tuple, kwargs: dict, einfo: Any) -> None:
        """Invoked when a task exhausts retries and fails permanently."""
        logger.error(
            f"[TASK FAILURE] Task '{self.name}' [ID: {task_id}] failed permanently. Error: {exc}",
            exc_info=exc,
        )
        update_sync_task_status(
            task_id=task_id,
            status="FAILED",
            progress=100,
            stage="Task execution failed",
            details={
                "task_name": self.name,
                "error": str(exc),
                "failed_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        super().on_failure(exc, task_id, args, kwargs, einfo)

    def on_success(self, retval: Any, task_id: str, args: tuple, kwargs: dict) -> None:
        """Invoked when a task completes successfully."""
        logger.info(f"[TASK SUCCESS] Task '{self.name}' [ID: {task_id}] completed successfully.")
        update_sync_task_status(
            task_id=task_id,
            status="COMPLETED",
            progress=100,
            stage="Completed successfully",
            details={
                "task_name": self.name,
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "summary": retval if isinstance(retval, dict) else str(retval)[:200],
            },
        )
        super().on_success(retval, task_id, args, kwargs)


# ==============================================================================
# Celery Application Factory & Configuration
# ==============================================================================

celery_app = Celery(
    "kaushalnexus_workers",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_cls=KaushalNexusBaseTask,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,        # 5 minutes hard limit
    task_soft_time_limit=240,   # 4 minutes soft limit
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    result_expires=86400,       # 24 hours
    task_routes={
        "src.workers.epfo_sync_task.*": {"queue": "epfo_queue"},
        "src.workers.sid_pipeline.*": {"queue": "sid_queue"},
        "src.workers.report_generator.*": {"queue": "reports_queue"},
        "src.workers.followup_task.*": {"queue": "default"},
        "src.workers.celery_app.*": {"queue": "default"},
    },
)

# Autodiscover worker task modules
celery_app.autodiscover_tasks(
    [
        "src.workers.epfo_sync_task",
        "src.workers.sid_pipeline",
        "src.workers.report_generator",
        "src.workers.followup_task",
    ],
    force=True,
)

celery = celery_app  # Alias for backward compatibility


# ==============================================================================
# Built-In Simple Test Task
# ==============================================================================

@celery_app.task(bind=True, name="src.workers.celery_app.execute_celery_test_task")
def execute_celery_test_task(self, x: int = 5, y: int = 7) -> Dict[str, Any]:
    """
    Lightweight test task to verify Celery worker execution,
    Redis message passing, and result backend storage.
    """
    logger.info(f"Executing execute_celery_test_task with inputs: x={x}, y={y} on task_id={self.request.id}")
    
    update_sync_task_status(
        task_id=self.request.id,
        status="RUNNING",
        progress=50,
        stage="Performing calculation and Redis latency check",
        details={"input_x": x, "input_y": y},
    )

    result_value = x + y

    return {
        "task": "execute_celery_test_task",
        "task_id": self.request.id,
        "input_x": x,
        "input_y": y,
        "calculation_result": result_value,
        "broker": settings.CELERY_BROKER_URL,
        "result_backend": settings.CELERY_RESULT_BACKEND,
        "status": "SUCCESS",
        "executed_at": datetime.now(timezone.utc).isoformat(),
    }
