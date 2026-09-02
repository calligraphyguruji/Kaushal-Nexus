from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
import random
from typing import List, Optional
import uuid


@dataclass
class EPFOContributionMonth:
    """Monthly EPFO electronic passbook contribution deposit line item."""
    month_year: str  # e.g. "2026-05"
    wage_amount: float
    epf_employee_share: float
    epf_employer_share: float
    eps_pension_share: float
    deposit_date: str
    status: str = "DEPOSITED"


@dataclass
class EPFOVerificationResult:
    """Comprehensive electronic EPFO verification audit payload."""
    is_valid: bool
    uan: str
    member_id: str
    status: str  # "VERIFIED" | "PENDING" | "FAILED" | "EXEMPTED"
    verification_ref: str
    establishment_name: str
    date_of_joining: str
    last_contribution_month: Optional[str]
    active_contributing: bool
    verified_months_count: int
    contributions: List[EPFOContributionMonth] = field(default_factory=list)
    remarks: str = ""
    verified_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class IEPFOVerificationProvider(ABC):
    """
    Clean, pluggable interface for EPFO (Employees' Provident Fund Organisation)
    statutory compliance & employment verification.
    
    Future real-world providers (e.g. Setu, Surepass, Digilocker, Karza, or Direct EPFO API)
    can be integrated seamlessly by implementing this abstract interface.
    """

    @abstractmethod
    async def verify_employment(
        self,
        uan: Optional[str],
        employer_name: str,
        joined_date: date,
        starting_ctc_lpa: float,
        member_id: Optional[str] = None,
    ) -> EPFOVerificationResult:
        """Verify candidate active employment registration and starting EPF remittance."""
        pass

    @abstractmethod
    async def verify_milestone_retention(
        self,
        uan: str,
        employer_name: str,
        milestone_months: int,
        checkpoint_date: date,
        expected_ctc_lpa: float,
    ) -> EPFOVerificationResult:
        """Verify longitudinal continuous monthly EPF contributions up to 3M, 6M, or 12M."""
        pass


class MockEPFOVerificationService(IEPFOVerificationProvider):
    """
    Mock implementation of IEPFOVerificationProvider.
    Simulates electronic passbook queries, remittance validation, and audit receipts.
    """

    @staticmethod
    def _generate_mock_uan() -> str:
        """Generates a realistic 12-digit mock Universal Account Number."""
        return f"101{random.randint(100000000, 999999999)}"

    @staticmethod
    def _generate_mock_member_id(employer_name: str) -> str:
        prefix = "".join(filter(str.isalnum, employer_name))[:6].upper() or "CORP"
        return f"UP/NOI/{prefix}/{random.randint(1000000, 9999999)}"

    async def verify_employment(
        self,
        uan: Optional[str],
        employer_name: str,
        joined_date: date,
        starting_ctc_lpa: float,
        member_id: Optional[str] = None,
    ) -> EPFOVerificationResult:
        """Mock verification of initial employment registration and UAN linkage."""
        # Normalize UAN
        assigned_uan = uan.strip() if uan and uan.strip() else self._generate_mock_uan()
        assigned_member_id = member_id or self._generate_mock_member_id(employer_name)
        ref_id = f"EPFO-INIT-{uuid.uuid4().hex[:8].upper()}"

        # If explicitly flagged invalid in test
        if uan and uan.startswith("INVALID"):
            return EPFOVerificationResult(
                is_valid=False,
                uan=assigned_uan,
                member_id=assigned_member_id,
                status="FAILED",
                verification_ref=ref_id,
                establishment_name=employer_name,
                date_of_joining=joined_date.isoformat(),
                last_contribution_month=None,
                active_contributing=False,
                verified_months_count=0,
                remarks="UAN not found or mismatch in EPFO National Database",
            )

        # Monthly wage basis
        monthly_gross = round((starting_ctc_lpa * 100000) / 12.0, 2)
        pf_wage = min(15000.0, monthly_gross)
        ee_share = round(pf_wage * 0.12, 2)
        er_share = round(pf_wage * 0.0367, 2)
        eps_share = round(pf_wage * 0.0833, 2)

        contributions = [
            EPFOContributionMonth(
                month_year=joined_date.strftime("%Y-%m"),
                wage_amount=monthly_gross,
                epf_employee_share=ee_share,
                epf_employer_share=er_share,
                eps_pension_share=eps_share,
                deposit_date=joined_date.isoformat(),
                status="DEPOSITED",
            )
        ]

        return EPFOVerificationResult(
            is_valid=True,
            uan=assigned_uan,
            member_id=assigned_member_id,
            status="VERIFIED",
            verification_ref=ref_id,
            establishment_name=employer_name,
            date_of_joining=joined_date.isoformat(),
            last_contribution_month=joined_date.strftime("%Y-%m"),
            active_contributing=True,
            verified_months_count=1,
            contributions=contributions,
            remarks=f"Initial EPF remittance verified for {employer_name} under UAN {assigned_uan}.",
        )

    async def verify_milestone_retention(
        self,
        uan: str,
        employer_name: str,
        milestone_months: int,
        checkpoint_date: date,
        expected_ctc_lpa: float,
    ) -> EPFOVerificationResult:
        """Mock verification of continuous monthly remittances up to checkpoint interval."""
        assigned_member_id = self._generate_mock_member_id(employer_name)
        ref_id = f"EPFO-RET-{milestone_months}M-{uuid.uuid4().hex[:8].upper()}"

        if uan and uan.startswith("FAILED"):
            return EPFOVerificationResult(
                is_valid=False,
                uan=uan,
                member_id=assigned_member_id,
                status="FAILED",
                verification_ref=ref_id,
                establishment_name=employer_name,
                date_of_joining="",
                last_contribution_month=None,
                active_contributing=False,
                verified_months_count=0,
                remarks=f"Contribution lapse detected prior to {milestone_months}M milestone.",
            )

        monthly_gross = round((expected_ctc_lpa * 100000) / 12.0, 2)
        pf_wage = min(15000.0, monthly_gross)
        ee_share = round(pf_wage * 0.12, 2)
        er_share = round(pf_wage * 0.0367, 2)
        eps_share = round(pf_wage * 0.0833, 2)

        contributions: List[EPFOContributionMonth] = []
        for i in range(milestone_months):
            contributions.append(
                EPFOContributionMonth(
                    month_year=f"M+{i+1}",
                    wage_amount=monthly_gross,
                    epf_employee_share=ee_share,
                    epf_employer_share=er_share,
                    eps_pension_share=eps_share,
                    deposit_date=checkpoint_date.isoformat(),
                    status="DEPOSITED",
                )
            )

        return EPFOVerificationResult(
            is_valid=True,
            uan=uan,
            member_id=assigned_member_id,
            status="VERIFIED",
            verification_ref=ref_id,
            establishment_name=employer_name,
            date_of_joining="",
            last_contribution_month=checkpoint_date.strftime("%Y-%m"),
            active_contributing=True,
            verified_months_count=milestone_months,
            contributions=contributions,
            remarks=(
                f"Continuous {milestone_months}-month statutory EPF contributions verified "
                f"at {employer_name} for UAN {uan}."
            ),
        )


# Global singleton instance (clean injectable provider)
epfo_service: IEPFOVerificationProvider = MockEPFOVerificationService()
