from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import random
from typing import Any, Dict, List, Optional
import uuid

from src.core.config import settings
from src.core.logging import logger
from src.services.integrations.base import BaseIntegrationAdapter


@dataclass
class SIDLearnerDossier:
    """Skill India Digital candidate vocational training dossier."""
    sid_enrollment_id: str
    candidate_name: str
    training_center_code: str
    scheme_name: str  # e.g. "PMKVY 4.0", "DDU-GKY", "Craftsmen Training Scheme"
    course_name: str
    nsqf_level: int
    curriculum_hours_completed: int
    assessment_score_pct: float
    is_certified: bool
    cert_issue_date: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class NCVETVerificationResult:
    """National Council for Vocational Education and Training (NCVET) Credential Audit."""
    is_authenticated: bool
    credential_id: str
    candidate_name: str
    awarding_body: str
    nsqf_level: int
    nqr_code: str
    status: str  # "AUTHENTICATED" | "REVOKED" | "NOT_FOUND" | "UNAVAILABLE"
    txn_reference: str = ""
    verification_timestamp: str = ""
    error_message: Optional[str] = None
    disclaimer: str = (
        "Mock Skill India Digital & NCVET adapter for prototyping. "
        "Simulates National Skills Registry digital credential verification."
    )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ISkillIndiaDigitalAdapter(ABC):
    """
    Abstract Interface for Skill India Digital (SID) & NCVET Integration.
    Decouples candidate onboarding and competency verification from live government APIs.
    """

    @abstractmethod
    async def fetch_learner_dossier(self, sid_enrollment_id: str) -> Optional[SIDLearnerDossier]:
        """Fetches unified skilling dossier and training metrics for a candidate."""
        pass

    @abstractmethod
    async def verify_ncvet_credential(
        self,
        credential_id: str,
        candidate_name: str,
    ) -> NCVETVerificationResult:
        """Verifies digital vocational certificate authenticity against NCVET registry."""
        pass

    @abstractmethod
    async def sync_training_center_batch(
        self,
        center_code: str,
        batch_id: Optional[str] = None,
    ) -> List[SIDLearnerDossier]:
        """Ingests enrolled trainee batch from a designated PMKK / ITI center."""
        pass


class MockSkillIndiaDigitalAdapter(BaseIntegrationAdapter, ISkillIndiaDigitalAdapter):
    """
    Simulated Mock Adapter for Skill India Digital & NCVET Registry.
    
    Provides:
      - Trainee dossier retrieval
      - Digital qualification certificate signature verification
      - Resilience handling with timeout, retry, and degraded mode fallback
    """

    def __init__(
        self,
        gateway_url: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        max_retries: Optional[int] = None,
    ) -> None:
        super().__init__(
            adapter_name="MockSIDAdapter",
            gateway_url=gateway_url or settings.SID_GATEWAY_URL,
            timeout_seconds=timeout_seconds,
            max_retries=max_retries,
        )
        self.simulated_outage = False

    def set_simulated_outage(self, enabled: bool) -> None:
        """Helper to simulate external gateway downtime for resilience testing."""
        self.simulated_outage = enabled

    async def fetch_learner_dossier(self, sid_enrollment_id: str) -> Optional[SIDLearnerDossier]:
        """Fetches simulated trainee dossier."""
        clean_id = sid_enrollment_id.strip()
        logger.info(f"Querying Skill India Digital dossier for ID={clean_id}")

        async def _call_gateway() -> Optional[SIDLearnerDossier]:
            if self.simulated_outage:
                raise ConnectionError("Skill India Digital API gateway unreachable (504 Gateway Timeout)")

            return SIDLearnerDossier(
                sid_enrollment_id=clean_id,
                candidate_name="Priya Sharma",
                training_center_code="PMKK-UP-VARANASI-01",
                scheme_name="PMKVY 4.0 Special Projects",
                course_name="Data Associate & Analytics",
                nsqf_level=5,
                curriculum_hours_completed=320,
                assessment_score_pct=88.5,
                is_certified=True,
                cert_issue_date="2025-11-20",
            )

        def _fallback(exc: Exception) -> Optional[SIDLearnerDossier]:
            logger.warning(f"SID dossier fetch degraded: {str(exc)}")
            return None

        return await self.execute_with_resilience(
            operation_name=f"SIDFetchDossier({clean_id})",
            action=_call_gateway,
            fallback_factory=_fallback,
        )

    async def verify_ncvet_credential(
        self,
        credential_id: str,
        candidate_name: str,
    ) -> NCVETVerificationResult:
        """Verifies simulated NCVET qualification certificate."""
        txn_id = f"NCVET-VERIF-{uuid.uuid4().hex[:8].upper()}"
        clean_cred = credential_id.strip()

        logger.info(f"Verifying NCVET credential '{clean_cred}' for candidate '{candidate_name}'")

        async def _call_gateway() -> NCVETVerificationResult:
            if self.simulated_outage:
                raise ConnectionError("NCVET Certificate Registry connection reset by peer")

            return NCVETVerificationResult(
                is_authenticated=True,
                credential_id=clean_cred,
                candidate_name=candidate_name,
                awarding_body="IT-ITeS Sector Skills Council NASSCOM",
                nsqf_level=5,
                nqr_code="NQR/2026/IT/0491",
                status="AUTHENTICATED",
                txn_reference=txn_id,
                verification_timestamp=datetime.now(timezone.utc).isoformat(),
            )

        def _fallback(exc: Exception) -> NCVETVerificationResult:
            return NCVETVerificationResult(
                is_authenticated=False,
                credential_id=clean_cred,
                candidate_name=candidate_name,
                awarding_body="Unknown",
                nsqf_level=0,
                nqr_code="NQR/UNKNOWN",
                status="UNAVAILABLE",
                txn_reference=txn_id,
                verification_timestamp=datetime.now(timezone.utc).isoformat(),
                error_message=f"NCVET registry temporarily unavailable: {str(exc)}",
            )

        return await self.execute_with_resilience(
            operation_name=f"NCVETVerifyCredential({clean_cred})",
            action=_call_gateway,
            fallback_factory=_fallback,
        )

    async def sync_training_center_batch(
        self,
        center_code: str,
        batch_id: Optional[str] = None,
    ) -> List[SIDLearnerDossier]:
        """Ingests simulated batch of trainees."""
        logger.info(f"Syncing batch for training center={center_code}, batch={batch_id}")

        async def _call_gateway() -> List[SIDLearnerDossier]:
            if self.simulated_outage:
                raise ConnectionError("SID Batch Sync service error (503)")

            sample_courses = [
                ("Data Analytics Associate", 5, 320),
                ("CNC Precision Machining Specialist", 4, 400),
                ("Solar PV Installation Technician", 4, 250),
                ("Cloud Infrastructure Associate", 5, 300),
            ]

            results = []
            for i in range(1, 6):
                c_name, nsqf, hours = random.choice(sample_courses)
                results.append(
                    SIDLearnerDossier(
                        sid_enrollment_id=f"SID-{center_code}-{i:03d}",
                        candidate_name=f"Trainee Candidate {i}",
                        training_center_code=center_code,
                        scheme_name="PMKVY 4.0",
                        course_name=c_name,
                        nsqf_level=nsqf,
                        curriculum_hours_completed=hours,
                        assessment_score_pct=round(random.uniform(75.0, 95.0), 1),
                        is_certified=True,
                        cert_issue_date="2026-01-15",
                    )
                )
            return results

        def _fallback(exc: Exception) -> List[SIDLearnerDossier]:
            logger.warning(f"SID batch sync degraded for center '{center_code}': {str(exc)}")
            return []

        return await self.execute_with_resilience(
            operation_name=f"SIDBatchSync({center_code})",
            action=_call_gateway,
            fallback_factory=_fallback,
        )

    async def check_health(self) -> Dict[str, Any]:
        """Returns adapter operational health."""
        return {
            "adapter": self.adapter_name,
            "mode": "MOCK",
            "status": "UNAVAILABLE" if self.simulated_outage else "OPERATIONAL",
            "gateway_url": self.gateway_url,
            "timeout_seconds": self.timeout_seconds,
        }


# Global singleton instance
sid_adapter: ISkillIndiaDigitalAdapter = MockSkillIndiaDigitalAdapter()
