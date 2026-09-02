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
    name="src.workers.epfo_sync_task.sync_epfo_batch_task",
    max_retries=3,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_jitter=True,
)
def sync_epfo_batch_task(
    self,
    batch_size: int = 25,
    placement_ids: Optional[List[str]] = None,
    mock_sector: Optional[str] = "IT-ITeS",
) -> Dict[str, Any]:
    """
    Background batch synchronization worker for EPFO statutory compliance records.
    
    NOTE: Uses mocked/demo EPFO passbook remittances.
    MUST NOT call real government APIs.
    """
    task_id = self.request.id
    logger.info(
        f"[EPFO SYNC START] Initiating mock EPFO batch sync task [ID: {task_id}] "
        f"for batch_size={batch_size}, sector='{mock_sector}'"
    )

    update_sync_task_status(
        task_id=task_id,
        status="RUNNING",
        progress=10,
        stage="Initiating statutory EPFO electronic passbook batch reconciliation",
        details={"batch_size": batch_size, "sector": mock_sector},
    )

    # Simulate chunked verification
    total_to_process = len(placement_ids) if placement_ids else batch_size
    verified_active = 0
    verified_retained = 0
    discrepancies = 0
    total_remittance_inr = 0.0

    mock_employers = [
        "TechNova Solutions India",
        "Tata Consultancy Engineering",
        "Bharat Robotics Ltd",
        "Nexora SaaS Systems",
        "Apex Cloud Infrastructure",
    ]

    for i in range(total_to_process):
        # Progress calculation
        pct = int(10 + (80 * (i + 1) / total_to_process))
        current_emp = random.choice(mock_employers)
        mock_uan = f"101{random.randint(100000000, 999999999)}"
        monthly_pf = random.randint(1800, 3600)

        # Simulate processing step
        if i % 10 == 0 or i == total_to_process - 1:
            update_sync_task_status(
                task_id=task_id,
                status="PROGRESS",
                progress=pct,
                stage=f"Reconciling candidate {i+1}/{total_to_process} with {current_emp}",
                details={"processed_count": i + 1, "total": total_to_process},
            )

        # Randomize simulated outcome (92% success, 8% discrepancy)
        if random.random() > 0.08:
            verified_active += 1
            if random.random() > 0.35:
                verified_retained += 1
            total_remittance_inr += monthly_pf * random.choice([3, 6, 12])
        else:
            discrepancies += 1
            logger.warning(
                f"[EPFO MOCK DISCREPANCY] Flagged temporary passbook mismatch for UAN {mock_uan} at {current_emp}"
            )

    audit_summary = {
        "task_id": task_id,
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "total_records_evaluated": total_to_process,
        "verified_active_count": verified_active,
        "verified_retained_milestones_count": verified_retained,
        "flagged_discrepancies_count": discrepancies,
        "total_simulated_remittance_inr": round(total_remittance_inr, 2),
        "compliance_rate_pct": round((verified_active / max(1, total_to_process)) * 100.0, 1),
        "source": "MOCK_EPFO_STAGING_BRIDGE",
    }

    logger.info(
        f"[EPFO SYNC COMPLETE] Successfully reconciled {total_to_process} placements. "
        f"Verified: {verified_active}, Discrepancies: {discrepancies}"
    )

    return audit_summary


@celery_app.task(
    bind=True,
    name="src.workers.epfo_sync_task.verify_single_placement_epfo_task",
    max_retries=2,
    retry_backoff=True,
)
def verify_single_placement_epfo_task(
    self,
    placement_id: str,
    uan: str,
    employer_name: str,
) -> Dict[str, Any]:
    """
    Asynchronous single-candidate EPFO statutory verification background task.
    """
    logger.info(f"Executing single EPFO verification for placement='{placement_id}', UAN='{uan}'")
    
    update_sync_task_status(
        task_id=self.request.id,
        status="RUNNING",
        progress=50,
        stage=f"Querying electronic passbook for UAN {uan}",
        details={"placement_id": placement_id, "uan": uan, "employer": employer_name},
    )

    return {
        "task_id": self.request.id,
        "placement_id": placement_id,
        "uan": uan,
        "employer_name": employer_name,
        "status": "VERIFIED",
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "mock_ref": f"EPFO-TRX-{random.randint(100000, 999999)}",
    }
