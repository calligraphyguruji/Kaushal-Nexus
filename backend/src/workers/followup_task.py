import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from celery.utils.log import get_task_logger

from src.core.database import AsyncSessionLocal
from src.core.redis import update_sync_task_status
from src.services.follow_up_service import follow_up_service
from src.workers.celery_app import celery_app

logger = get_task_logger(__name__)


async def _run_followup_processing(batch_limit: int) -> Dict[str, Any]:
    """Helper to execute async follow-up batch processing in an isolated async session."""
    async with AsyncSessionLocal() as session:
        return await follow_up_service.process_due_follow_ups(db=session, batch_limit=batch_limit)


@celery_app.task(
    bind=True,
    name="src.workers.followup_task.process_due_followups_task",
    max_retries=3,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_jitter=True,
)
def process_due_followups_task(
    self,
    batch_limit: int = 50,
) -> Dict[str, Any]:
    """
    Background batch processor for longitudinal milestone follow-ups.
    Enforces active consent check, dispatches sandbox outreach notifications,
    and updates outreach attempt counts.
    """
    task_id = self.request.id
    logger.info(f"[FOLLOW-UP TASK START] Processing pending follow-ups [ID: {task_id}] limit={batch_limit}")

    update_sync_task_status(
        task_id=task_id,
        status="RUNNING",
        progress=20,
        stage="Querying scheduled follow-ups and validating candidate privacy consent",
        details={"batch_limit": batch_limit},
    )

    try:
        result = asyncio.run(_run_followup_processing(batch_limit=batch_limit))
        logger.info(f"[FOLLOW-UP TASK COMPLETED] Result: {result}")
        update_sync_task_status(
            task_id=task_id,
            status="COMPLETED",
            progress=100,
            stage="Follow-up outreach batch completed",
            details=result,
        )
        return {
            "task_id": task_id,
            "status": "SUCCESS",
            "executed_at": datetime.now(timezone.utc).isoformat(),
            **result,
        }
    except Exception as exc:
        logger.error(f"[FOLLOW-UP TASK ERROR] Failed: {exc}", exc_info=True)
        update_sync_task_status(
            task_id=task_id,
            status="FAILED",
            progress=100,
            stage=f"Processing failed: {str(exc)[:100]}",
            details={"error": str(exc)},
        )
        raise self.retry(exc=exc)
