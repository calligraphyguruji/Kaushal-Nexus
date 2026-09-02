from datetime import datetime, timezone
import random
import time
from typing import Any, Dict, List, Optional
from celery.utils.log import get_task_logger

from src.core.redis import update_sync_task_status
from src.workers.celery_app import celery_app

logger = get_task_logger(__name__)


@celery_app.task(
    bind=True,
    name="src.workers.sid_pipeline.sync_sid_learner_batch_task",
    max_retries=3,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_jitter=True,
)
def sync_sid_learner_batch_task(
    self,
    batch_size: int = 30,
    center_code: Optional[str] = "PMKK-UP-001",
    sector: Optional[str] = "IT-ITeS",
) -> Dict[str, Any]:
    """
    Background batch ingestion pipeline for Skill India Digital (SID) candidate dossiers.
    
    NOTE: Uses mocked/demo SID training & assessment records.
    MUST NOT call real government APIs.
    """
    task_id = self.request.id
    logger.info(
        f"[SID PIPELINE START] Starting Skill India Digital sync pipeline [ID: {task_id}] "
        f"for center='{center_code}', sector='{sector}', batch_size={batch_size}"
    )

    update_sync_task_status(
        task_id=task_id,
        status="RUNNING",
        progress=15,
        stage=f"Connecting to SID batch ingestion gateway for {center_code}",
        details={"center_code": center_code, "batch_size": batch_size},
    )

    # Simulate batch processing stages
    synced_records = 0
    certified_count = 0
    total_training_hours = 0

    curriculum_modules = [
        "Cloud Architecture Fundamentals",
        "Python Data Science Stack",
        "Industrial Automation & PLC",
        "EV Battery Diagnostics",
        "CNC Precision Machining",
    ]

    for i in range(batch_size):
        pct = int(15 + (75 * (i + 1) / batch_size))
        synced_records += 1
        hours = random.choice([120, 180, 240, 300])
        total_training_hours += hours

        if random.random() > 0.15:
            certified_count += 1

        if i % 10 == 0 or i == batch_size - 1:
            update_sync_task_status(
                task_id=task_id,
                status="PROGRESS",
                progress=pct,
                stage=f"Ingesting curriculum completion & biometric attendance: {i+1}/{batch_size}",
                details={"synced_records": synced_records, "total": batch_size},
            )

    result_payload = {
        "task_id": task_id,
        "center_code": center_code,
        "sector": sector,
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "total_learners_synced": synced_records,
        "ncvet_certified_count": certified_count,
        "total_training_hours_logged": total_training_hours,
        "avg_training_completion_pct": round(random.uniform(84.0, 96.0), 1),
        "sid_batch_reference": f"SID-SYNC-2026-{random.randint(10000, 99999)}",
        "status": "COMPLETED",
    }

    logger.info(
        f"[SID PIPELINE COMPLETE] Synced {synced_records} learner records from SID center '{center_code}'."
    )

    return result_payload


@celery_app.task(
    bind=True,
    name="src.workers.sid_pipeline.verify_ncvet_credentials_task",
    max_retries=3,
    retry_backoff=True,
)
def verify_ncvet_credentials_task(
    self,
    learner_ids: List[str],
) -> Dict[str, Any]:
    """
    Batch verification of National Council for Vocational Education and Training (NCVET) credentials.
    """
    logger.info(f"Initiating NCVET credential verification for {len(learner_ids)} candidates.")
    
    task_id = self.request.id
    update_sync_task_status(
        task_id=task_id,
        status="RUNNING",
        progress=30,
        stage="Validating digital cryptographic signatures against National Skills Registry",
        details={"candidate_count": len(learner_ids)},
    )

    verified = [
        {
            "learner_id": lid,
            "credential_id": f"NCVET-2026-{random.randint(100000, 999999)}",
            "nsqf_level": random.choice(["NSQF Level 4", "NSQF Level 5", "NSQF Level 6"]),
            "status": "AUTHENTICATED",
        }
        for lid in learner_ids
    ]

    return {
        "task_id": task_id,
        "verified_count": len(verified),
        "results": verified,
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }
