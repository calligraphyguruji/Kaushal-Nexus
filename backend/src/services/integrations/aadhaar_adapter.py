from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import random
import re
from typing import Any, Dict, Optional
import uuid

from src.core.config import settings
from src.core.logging import logger
from src.services.integrations.base import (
    BaseIntegrationAdapter,
    hash_aadhaar,
    mask_aadhaar,
)


@dataclass
class AadhaarVerificationResult:
    """
    UIDAI Identity Verification Result.
    CRITICAL: Contains ONLY masked Aadhaar and SHA-256 fingerprint. Never plaintext raw Aadhaar.
    """
    is_verified: bool
    masked_aadhaar: str
    aadhaar_hash: str
    name_match_score: float  # 0.0 to 1.0
    kyc_status: str  # "VERIFIED" | "FAILED" | "UNAVAILABLE"
    txn_reference: str
    gender: Optional[str] = None
    state: Optional[str] = None
    verification_timestamp: str = ""
    error_message: Optional[str] = None
    disclaimer: str = (
        "Mock Aadhaar verification adapter for sandbox prototyping. "
        "Complies with UIDAI privacy standards: raw Aadhaar numbers are never logged or stored."
    )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class IAadhaarVerificationAdapter(ABC):
    """
    Abstract Interface for Aadhaar / UIDAI Identity Verification.
    Allows backend services to verify learner demographic identities
    without coupling to real government UIDAI endpoints during development.
    """

    @abstractmethod
    async def verify_identity(
        self,
        raw_aadhaar: str,
        expected_name: str,
        dob: Optional[str] = None,
        state: Optional[str] = None,
    ) -> AadhaarVerificationResult:
        """Verifies candidate name and demographics against demographic records."""
        pass

    @abstractmethod
    async def send_otp(self, raw_aadhaar: str) -> Dict[str, Any]:
        """Dispatches an OTP transaction for mobile-linked e-KYC."""
        pass

    @abstractmethod
    async def verify_otp(
        self,
        txn_id: str,
        otp: str,
        raw_aadhaar: str,
        expected_name: str,
    ) -> AadhaarVerificationResult:
        """Verifies submitted OTP and completes demographic e-KYC."""
        pass


class MockAadhaarVerificationAdapter(BaseIntegrationAdapter, IAadhaarVerificationAdapter):
    """
    Simulated Mock Adapter for UIDAI Aadhaar Verification.
    
    Security Guarantees:
      1. Masks incoming raw Aadhaar number immediately on receipt.
      2. Logs only masked identifier (e.g. 'XXXX-XXXX-1234') and transaction reference.
      3. Never persists raw 12 digits in memory or database.
      4. Implements timeout, exponential backoff, and graceful degradation fallback.
    """

    def __init__(
        self,
        gateway_url: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        max_retries: Optional[int] = None,
    ) -> None:
        super().__init__(
            adapter_name="MockAadhaarAdapter",
            gateway_url=gateway_url or settings.AADHAAR_GATEWAY_URL,
            timeout_seconds=timeout_seconds,
            max_retries=max_retries,
        )
        self.simulated_outage = False

    def set_simulated_outage(self, enabled: bool) -> None:
        """Helper to simulate external gateway downtime for resilience testing."""
        self.simulated_outage = enabled

    def _validate_aadhaar_format(self, raw_aadhaar: str) -> bool:
        """Validates 12-digit format or sandbox test tokens."""
        clean = re.sub(r"\D", "", str(raw_aadhaar).strip())
        return len(clean) == 12 or "test" in str(raw_aadhaar).lower()

    async def verify_identity(
        self,
        raw_aadhaar: str,
        expected_name: str,
        dob: Optional[str] = None,
        state: Optional[str] = None,
    ) -> AadhaarVerificationResult:
        """Executes demographic verification with resilience and privacy masking."""
        masked = mask_aadhaar(raw_aadhaar)
        a_hash = hash_aadhaar(raw_aadhaar)
        txn_id = f"UIDAI-MOCK-{uuid.uuid4().hex[:10].upper()}"

        logger.info(f"Initiating demographic verification for Aadhaar={masked} [txn={txn_id}]")

        async def _call_gateway() -> AadhaarVerificationResult:
            if self.simulated_outage:
                raise ConnectionError("UIDAI Gateway upstream connection timed out (503)")

            if not self._validate_aadhaar_format(raw_aadhaar):
                return AadhaarVerificationResult(
                    is_verified=False,
                    masked_aadhaar=masked,
                    aadhaar_hash=a_hash,
                    name_match_score=0.0,
                    kyc_status="FAILED",
                    txn_reference=txn_id,
                    verification_timestamp=datetime.now(timezone.utc).isoformat(),
                    error_message="Invalid Aadhaar format. Must be 12 numeric digits.",
                )

            # Simulated name match score (fuzzy similarity heuristic)
            name_clean = expected_name.strip().title()
            name_score = 0.95 if len(name_clean) > 2 else 0.50

            return AadhaarVerificationResult(
                is_verified=True,
                masked_aadhaar=masked,
                aadhaar_hash=a_hash,
                name_match_score=name_score,
                kyc_status="VERIFIED",
                txn_reference=txn_id,
                gender="Not Specified",
                state=state or "Uttar Pradesh",
                verification_timestamp=datetime.now(timezone.utc).isoformat(),
            )

        def _fallback(exc: Exception) -> AadhaarVerificationResult:
            return AadhaarVerificationResult(
                is_verified=False,
                masked_aadhaar=masked,
                aadhaar_hash=a_hash,
                name_match_score=0.0,
                kyc_status="UNAVAILABLE",
                txn_reference=txn_id,
                verification_timestamp=datetime.now(timezone.utc).isoformat(),
                error_message=f"Aadhaar gateway temporarily unavailable: {str(exc)}",
            )

        return await self.execute_with_resilience(
            operation_name=f"DemographicVerification({masked})",
            action=_call_gateway,
            fallback_factory=_fallback,
        )

    async def send_otp(self, raw_aadhaar: str) -> Dict[str, Any]:
        """Dispatches simulated OTP."""
        masked = mask_aadhaar(raw_aadhaar)
        txn_id = f"OTP-TXN-{uuid.uuid4().hex[:8].upper()}"

        logger.info(f"Dispatched e-KYC OTP to linked mobile for Aadhaar={masked} [txn={txn_id}]")
        return {
            "txn_id": txn_id,
            "masked_aadhaar": masked,
            "status": "OTP_SENT",
            "expires_in_seconds": 600,
            "message": f"OTP successfully sent to mobile linked with {masked}",
        }

    async def verify_otp(
        self,
        txn_id: str,
        otp: str,
        raw_aadhaar: str,
        expected_name: str,
    ) -> AadhaarVerificationResult:
        """Verifies simulated OTP."""
        masked = mask_aadhaar(raw_aadhaar)
        a_hash = hash_aadhaar(raw_aadhaar)

        if otp in ["123456", "999999", "000000"] or len(otp) == 6:
            return AadhaarVerificationResult(
                is_verified=True,
                masked_aadhaar=masked,
                aadhaar_hash=a_hash,
                name_match_score=1.0,
                kyc_status="VERIFIED",
                txn_reference=txn_id,
                verification_timestamp=datetime.now(timezone.utc).isoformat(),
            )

        return AadhaarVerificationResult(
            is_verified=False,
            masked_aadhaar=masked,
            aadhaar_hash=a_hash,
            name_match_score=0.0,
            kyc_status="FAILED",
            txn_reference=txn_id,
            verification_timestamp=datetime.now(timezone.utc).isoformat(),
            error_message="Invalid OTP entered.",
        )

    async def check_health(self) -> Dict[str, Any]:
        """Returns health status of the adapter."""
        return {
            "adapter": self.adapter_name,
            "mode": "MOCK",
            "status": "UNAVAILABLE" if self.simulated_outage else "OPERATIONAL",
            "gateway_url": self.gateway_url,
            "timeout_seconds": self.timeout_seconds,
        }


# Global singleton instance
aadhaar_adapter: IAadhaarVerificationAdapter = MockAadhaarVerificationAdapter()
