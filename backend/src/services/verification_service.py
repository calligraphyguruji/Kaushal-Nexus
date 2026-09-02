import asyncio
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from src.core.logging import logger
from src.services.integrations.aadhaar_adapter import (
    AadhaarVerificationResult,
    IAadhaarVerificationAdapter,
    aadhaar_adapter,
)
from src.services.integrations.base import mask_aadhaar
from src.services.integrations.epfo_adapter import (
    EPFOVerificationResult,
    IEPFOAdapter,
    epfo_adapter,
)
from src.services.integrations.sid_adapter import (
    ISkillIndiaDigitalAdapter,
    NCVETVerificationResult,
    SIDLearnerDossier,
    sid_adapter,
)


class VerificationService:
    """
    Unified National Verification & Statutory Trust Orchestrator.
    
    Coordinates:
      1. Aadhaar / UIDAI Demographic & OTP Identity KYC
      2. EPFO ECR Electronic Passbook & Longitudinal Retention Auditing
      3. Skill India Digital & NCVET Digital Credential Verification
      
    Resilience Guarantee:
      All third-party gateway interactions are isolated. If any individual external system
      is degraded, offline, or times out, the service returns structured audit payloads
      with appropriate status codes ('UNAVAILABLE', 'FAILED', 'VERIFIED') without interrupting
      the main platform lifecycle.
    """

    def __init__(
        self,
        aadhaar_svc: Optional[IAadhaarVerificationAdapter] = None,
        epfo_svc: Optional[IEPFOAdapter] = None,
        sid_svc: Optional[ISkillIndiaDigitalAdapter] = None,
    ) -> None:
        self.aadhaar_adapter = aadhaar_svc or aadhaar_adapter
        self.epfo_adapter = epfo_svc or epfo_adapter
        self.sid_adapter = sid_svc or sid_adapter

    async def verify_identity(
        self,
        raw_aadhaar: str,
        expected_name: str,
        dob: Optional[str] = None,
        state: Optional[str] = None,
    ) -> AadhaarVerificationResult:
        """Executes candidate identity demographic verification."""
        return await self.aadhaar_adapter.verify_identity(
            raw_aadhaar=raw_aadhaar,
            expected_name=expected_name,
            dob=dob,
            state=state,
        )

    async def verify_epfo_employment(
        self,
        uan: str,
        employer_name: str,
        joined_date: Optional[date] = None,
    ) -> EPFOVerificationResult:
        """Executes statutory EPFO establishment & passbook reconciliation."""
        return await self.epfo_adapter.verify_employment(
            uan=uan,
            employer_name=employer_name,
            joined_date=joined_date,
        )

    async def verify_ncvet_credential(
        self,
        credential_id: str,
        candidate_name: str,
    ) -> NCVETVerificationResult:
        """Executes digital vocational certificate validation against NCVET registry."""
        return await self.sid_adapter.verify_ncvet_credential(
            credential_id=credential_id,
            candidate_name=candidate_name,
        )

    async def run_candidate_360_audit(
        self,
        expected_name: str,
        raw_aadhaar: Optional[str] = None,
        uan: Optional[str] = None,
        employer_name: Optional[str] = None,
        credential_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes parallel multi-signal audit across Identity, EPFO, and Skilling Credentials.
        Fault-tolerant: failures in one gateway do not fail the overall request.
        """
        tasks = []

        # 1. Aadhaar Task
        if raw_aadhaar:
            tasks.append(
                self.aadhaar_adapter.verify_identity(
                    raw_aadhaar=raw_aadhaar,
                    expected_name=expected_name,
                )
            )
        else:
            tasks.append(asyncio.sleep(0, result=None))

        # 2. EPFO Task
        if uan and employer_name:
            tasks.append(
                self.epfo_adapter.verify_employment(
                    uan=uan,
                    employer_name=employer_name,
                )
            )
        else:
            tasks.append(asyncio.sleep(0, result=None))

        # 3. NCVET Task
        if credential_id:
            tasks.append(
                self.sid_adapter.verify_ncvet_credential(
                    credential_id=credential_id,
                    candidate_name=expected_name,
                )
            )
        else:
            tasks.append(asyncio.sleep(0, result=None))

        # Execute concurrently with error isolation
        results = await asyncio.gather(*tasks, return_exceptions=True)

        aadhaar_res = results[0] if not isinstance(results[0], Exception) else None
        epfo_res = results[1] if not isinstance(results[1], Exception) else None
        ncvet_res = results[2] if not isinstance(results[2], Exception) else None

        # Compute composite trust index (0 to 100)
        score_components = []
        if aadhaar_res and isinstance(aadhaar_res, AadhaarVerificationResult):
            score_components.append(40.0 if aadhaar_res.is_verified else 0.0)
        if epfo_res and isinstance(epfo_res, EPFOVerificationResult):
            score_components.append(35.0 if epfo_res.is_verified else 0.0)
        if ncvet_res and isinstance(ncvet_res, NCVETVerificationResult):
            score_components.append(25.0 if ncvet_res.is_authenticated else 0.0)

        composite_trust_score = round(sum(score_components), 1) if score_components else 50.0

        return {
            "candidate_name": expected_name,
            "composite_trust_score": composite_trust_score,
            "identity_verification": (
                aadhaar_res.to_dict() if isinstance(aadhaar_res, AadhaarVerificationResult) else None
            ),
            "epfo_verification": (
                epfo_res.to_dict() if isinstance(epfo_res, EPFOVerificationResult) else None
            ),
            "credential_verification": (
                ncvet_res.to_dict() if isinstance(ncvet_res, NCVETVerificationResult) else None
            ),
            "audit_timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "COMPLETED",
        }

    async def check_all_adapters_health(self) -> Dict[str, Any]:
        """Collects health and operational readiness across all external gateway adapters."""
        health_results = await asyncio.gather(
            self.aadhaar_adapter.check_health(),
            self.epfo_adapter.check_health(),
            self.sid_adapter.check_health(),
            return_exceptions=True,
        )

        adapters = []
        all_ok = True
        for h in health_results:
            if isinstance(h, dict):
                adapters.append(h)
                if h.get("status") != "OPERATIONAL":
                    all_ok = False
            else:
                adapters.append({"error": str(h), "status": "ERROR"})
                all_ok = False

        return {
            "overall_status": "OPERATIONAL" if all_ok else "DEGRADED",
            "adapters": adapters,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# Global singleton instance
verification_service: VerificationService = VerificationService()
