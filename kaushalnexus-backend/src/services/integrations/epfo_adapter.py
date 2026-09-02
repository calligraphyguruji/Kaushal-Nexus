from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta, timezone
import random
import re
from typing import Any, Dict, List, Optional
import uuid

from src.core.config import settings
from src.core.logging import logger
from src.services.integrations.base import BaseIntegrationAdapter


@dataclass
class EPFOPassbookEntry:
    """Monthly electronic passbook contribution entry."""
    month_year: str  # e.g. "2026-03"
    wage_amount: float
    employee_share: float
    employer_share: float
    deposit_date: str
    is_active_remittance: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class EPFOVerificationResult:
    """Statutory EPFO verification audit payload."""
    is_verified: bool
    uan: str
    establishment_name: str
    status: str  # "VERIFIED_ACTIVE" | "INACTIVE" | "UNAVAILABLE" | "NOT_FOUND"
    contributions_found: int
    last_deposit_month: Optional[str] = None
    txn_reference: str = ""
    verification_timestamp: str = ""
    error_message: Optional[str] = None
    passbook_entries: Optional[List[Dict[str, Any]]] = None
    disclaimer: str = (
        "Mock EPFO electronic passbook adapter for sandbox integration. "
        "Simulates statutory ECR remittance reconciliation without invoking live government endpoints."
    )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class IEPFOAdapter(ABC):
    """
    Abstract Interface for EPFO (Employees' Provident Fund Organisation) Integration.
    Decouples placement milestone retention audits from live EPFO gateway APIs.
    """

    @abstractmethod
    async def verify_employment(
        self,
        uan: str,
        employer_name: str,
        joined_date: Optional[date] = None,
    ) -> EPFOVerificationResult:
        """Verifies statutory employment presence for a candidate UAN."""
        pass

    @abstractmethod
    async def fetch_passbook(
        self,
        uan: str,
        months_count: int = 12,
    ) -> List[EPFOPassbookEntry]:
        """Fetches longitudinal monthly contribution history."""
        pass

    @abstractmethod
    async def check_statutory_remittance(
        self,
        uan: str,
        employer_name: str,
        milestone_months: int,
    ) -> Dict[str, Any]:
        """Audits remittance continuity for 3M, 6M, or 12M milestones."""
        pass


class MockEPFOAdapter(BaseIntegrationAdapter, IEPFOAdapter):
    """
    Simulated Mock Adapter for EPFO Gateway.
    
    Provides:
      - Realistic synthetic ECR (Electronic Challan cum Return) passbook generation
      - Multi-month retention continuity verification
      - Resilience handling with timeout, retry, and degraded mode fallback
    """

    def __init__(
        self,
        gateway_url: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        max_retries: Optional[int] = None,
    ) -> None:
        super().__init__(
            adapter_name="MockEPFOAdapter",
            gateway_url=gateway_url or settings.EPFO_GATEWAY_URL,
            timeout_seconds=timeout_seconds,
            max_retries=max_retries,
        )
        self.simulated_outage = False

    def set_simulated_outage(self, enabled: bool) -> None:
        """Helper to simulate external gateway downtime for resilience testing."""
        self.simulated_outage = enabled

    def _validate_uan(self, uan: str) -> bool:
        """Validates 12-digit numeric Universal Account Number."""
        clean = re.sub(r"\D", "", str(uan).strip())
        return len(clean) == 12 or "test" in str(uan).lower()

    async def verify_employment(
        self,
        uan: str,
        employer_name: str,
        joined_date: Optional[date] = None,
    ) -> EPFOVerificationResult:
        """Audits employment linkage in electronic establishment registry."""
        txn_id = f"EPFO-TXN-{uuid.uuid4().hex[:10].upper()}"
        clean_uan = str(uan).strip()

        logger.info(f"Auditing EPFO employment for UAN={clean_uan}, Employer={employer_name}")

        async def _call_gateway() -> EPFOVerificationResult:
            if self.simulated_outage:
                raise ConnectionError("EPFO Passbook Portal 502 Bad Gateway / Network Unreachable")

            if not self._validate_uan(clean_uan):
                return EPFOVerificationResult(
                    is_verified=False,
                    uan=clean_uan,
                    establishment_name=employer_name,
                    status="NOT_FOUND",
                    contributions_found=0,
                    txn_reference=txn_id,
                    verification_timestamp=datetime.now(timezone.utc).isoformat(),
                    error_message="Invalid UAN format. Must be 12 numeric digits.",
                )

            # Generate synthetic passbook
            entries = await self.fetch_passbook(uan=clean_uan, months_count=6)
            last_deposit = entries[-1].month_year if entries else None

            return EPFOVerificationResult(
                is_verified=True,
                uan=clean_uan,
                establishment_name=employer_name,
                status="VERIFIED_ACTIVE",
                contributions_found=len(entries),
                last_deposit_month=last_deposit,
                txn_reference=txn_id,
                verification_timestamp=datetime.now(timezone.utc).isoformat(),
                passbook_entries=[e.to_dict() for e in entries],
            )

        def _fallback(exc: Exception) -> EPFOVerificationResult:
            return EPFOVerificationResult(
                is_verified=False,
                uan=clean_uan,
                establishment_name=employer_name,
                status="UNAVAILABLE",
                contributions_found=0,
                txn_reference=txn_id,
                verification_timestamp=datetime.now(timezone.utc).isoformat(),
                error_message=f"EPFO gateway temporarily unavailable: {str(exc)}",
            )

        return await self.execute_with_resilience(
            operation_name=f"EPFOEmploymentAudit({clean_uan})",
            action=_call_gateway,
            fallback_factory=_fallback,
        )

    async def fetch_passbook(
        self,
        uan: str,
        months_count: int = 12,
    ) -> List[EPFOPassbookEntry]:
        """Generates realistic synthetic monthly passbook remittances."""
        entries: List[EPFOPassbookEntry] = []
        base_wage = 22500.0

        today = datetime.now(timezone.utc)
        for i in range(months_count, 0, -1):
            entry_date = today - timedelta(days=30 * i)
            m_str = entry_date.strftime("%Y-%m")
            ee_share = round(base_wage * 0.12, 2)
            er_share = round(base_wage * 0.0833, 2)

            entries.append(
                EPFOPassbookEntry(
                    month_year=m_str,
                    wage_amount=base_wage,
                    employee_share=ee_share,
                    employer_share=er_share,
                    deposit_date=(entry_date + timedelta(days=15)).strftime("%Y-%m-%d"),
                    is_active_remittance=True,
                )
            )
        return entries

    async def check_statutory_remittance(
        self,
        uan: str,
        employer_name: str,
        milestone_months: int,
    ) -> Dict[str, Any]:
        """Checks consecutive contribution deposits for a milestone checkpoint."""
        passbook = await self.fetch_passbook(uan=uan, months_count=milestone_months)
        consecutive_deposits = len(passbook)
        is_continuous = consecutive_deposits >= milestone_months

        return {
            "uan": uan,
            "employer_name": employer_name,
            "milestone_months": milestone_months,
            "consecutive_deposits": consecutive_deposits,
            "is_continuous": is_continuous,
            "compliance_status": "COMPLIANT" if is_continuous else "DEFERRED",
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

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
epfo_adapter: IEPFOAdapter = MockEPFOAdapter()
