import pytest
from httpx import AsyncClient

from src.services.integrations.aadhaar_adapter import (
    IAadhaarVerificationAdapter,
    MockAadhaarVerificationAdapter,
    aadhaar_adapter,
)
from src.services.integrations.base import (
    hash_aadhaar,
    mask_aadhaar,
    sanitize_log_data,
)
from src.services.integrations.epfo_adapter import (
    IEPFOAdapter,
    MockEPFOAdapter,
    epfo_adapter,
)
from src.services.integrations.sid_adapter import (
    ISkillIndiaDigitalAdapter,
    MockSkillIndiaDigitalAdapter,
    sid_adapter,
)
from src.services.verification_service import (
    VerificationService,
    verification_service,
)


# ==============================================================================
# Privacy, Security & Data Masking Tests
# ==============================================================================

def test_aadhaar_masking_and_hashing():
    """Verify raw 12-digit Aadhaar numbers are masked and hashed per UIDAI regulations."""
    raw_num = "987654321098"
    masked = mask_aadhaar(raw_num)
    assert masked == "XXXX-XXXX-1098"
    assert "98765432" not in masked

    h = hash_aadhaar(raw_num)
    assert h.startswith("sha256:")
    assert len(h) == 71  # "sha256:" (7) + 64 hex chars
    assert h == hash_aadhaar(raw_num)  # Deterministic fingerprint

    # Sanitization of structured log dictionaries
    payload = {
        "user_id": "usr-123",
        "aadhaar_number": "987654321098",
        "password": "secretpassword",
        "api_key": "sk-test-secret-key",
        "candidate_name": "Aman Verma",
    }
    sanitized = sanitize_log_data(payload)
    assert sanitized["aadhaar_number"] == "XXXX-XXXX-1098"
    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["api_key"] == "[REDACTED]"
    assert sanitized["candidate_name"] == "Aman Verma"


# ==============================================================================
# Aadhaar Adapter Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_aadhaar_demographic_verification_success():
    """Verify mock Aadhaar verification returns masked metadata and high match score."""
    adapter = MockAadhaarVerificationAdapter()
    result = await adapter.verify_identity(
        raw_aadhaar="123456789012",
        expected_name="Rajesh Kumar",
        state="Uttar Pradesh",
    )

    assert result.is_verified is True
    assert result.masked_aadhaar == "XXXX-XXXX-9012"
    assert result.aadhaar_hash.startswith("sha256:")
    assert result.kyc_status == "VERIFIED"
    assert result.name_match_score >= 0.90
    assert result.state == "Uttar Pradesh"
    assert result.txn_reference.startswith("UIDAI-MOCK-")


@pytest.mark.asyncio
async def test_aadhaar_invalid_format_handling():
    """Verify invalid format strings fail gracefully."""
    adapter = MockAadhaarVerificationAdapter()
    result = await adapter.verify_identity(
        raw_aadhaar="invalid-123",
        expected_name="Test User",
    )

    assert result.is_verified is False
    assert result.kyc_status == "FAILED"
    assert "Invalid Aadhaar format" in result.error_message


@pytest.mark.asyncio
async def test_aadhaar_otp_workflow():
    """Verify OTP dispatch and validation flow."""
    adapter = MockAadhaarVerificationAdapter()
    otp_resp = await adapter.send_otp("123456789012")
    assert otp_resp["status"] == "OTP_SENT"
    assert "txn_id" in otp_resp

    # Verify correct OTP
    v_resp = await adapter.verify_otp(
        txn_id=otp_resp["txn_id"],
        otp="123456",
        raw_aadhaar="123456789012",
        expected_name="Rajesh Kumar",
    )
    assert v_resp.is_verified is True
    assert v_resp.kyc_status == "VERIFIED"


# ==============================================================================
# EPFO Adapter Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_epfo_employment_verification():
    """Verify mock EPFO electronic passbook reconciliation."""
    adapter = MockEPFOAdapter()
    result = await adapter.verify_employment(
        uan="101234567890",
        employer_name="Tata Consultancy Services",
    )

    assert result.is_verified is True
    assert result.status == "VERIFIED_ACTIVE"
    assert result.contributions_found > 0
    assert result.passbook_entries is not None
    assert len(result.passbook_entries) == 6


@pytest.mark.asyncio
async def test_epfo_milestone_remittance_continuity():
    """Verify multi-month milestone continuity audit."""
    adapter = MockEPFOAdapter()
    audit = await adapter.check_statutory_remittance(
        uan="101234567890",
        employer_name="Tech Mahindra Ltd",
        milestone_months=6,
    )
    assert audit["is_continuous"] is True
    assert audit["compliance_status"] == "COMPLIANT"
    assert audit["consecutive_deposits"] == 6


# ==============================================================================
# Skill India Digital (SID) & NCVET Adapter Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_sid_learner_dossier_fetch():
    """Verify retrieval of trainee course completion dossier."""
    adapter = MockSkillIndiaDigitalAdapter()
    dossier = await adapter.fetch_learner_dossier("SID-PMKVY-2026-001")

    assert dossier is not None
    assert dossier.sid_enrollment_id == "SID-PMKVY-2026-001"
    assert dossier.is_certified is True
    assert dossier.nsqf_level >= 4
    assert dossier.curriculum_hours_completed > 100


@pytest.mark.asyncio
async def test_ncvet_credential_verification():
    """Verify digital vocational qualification signature authentication."""
    adapter = MockSkillIndiaDigitalAdapter()
    res = await adapter.verify_ncvet_credential(
        credential_id="NCVET-CERT-2026-9812",
        candidate_name="Priya Sharma",
    )
    assert res.is_authenticated is True
    assert res.status == "AUTHENTICATED"
    assert "NASSCOM" in res.awarding_body


# ==============================================================================
# Fault Tolerance, Retries, Timeouts & Graceful Degradation Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_aadhaar_simulated_outage_graceful_fallback():
    """Verify application continues working when Aadhaar gateway is unreachable."""
    adapter = MockAadhaarVerificationAdapter(timeout_seconds=0.5, max_retries=2)
    adapter.set_simulated_outage(True)

    # Should NOT throw exception, but return graceful degraded fallback
    result = await adapter.verify_identity(
        raw_aadhaar="123456789012",
        expected_name="Test User",
    )

    assert result.is_verified is False
    assert result.kyc_status == "UNAVAILABLE"
    assert "temporarily unavailable" in result.error_message
    assert result.masked_aadhaar == "XXXX-XXXX-9012"


@pytest.mark.asyncio
async def test_epfo_simulated_outage_graceful_fallback():
    """Verify application continues working when EPFO passbook gateway is down."""
    adapter = MockEPFOAdapter(timeout_seconds=0.5, max_retries=2)
    adapter.set_simulated_outage(True)

    result = await adapter.verify_employment(
        uan="101234567890",
        employer_name="Infosys Ltd",
    )

    assert result.is_verified is False
    assert result.status == "UNAVAILABLE"
    assert "temporarily unavailable" in result.error_message


# ==============================================================================
# Unified VerificationService Candidate 360 Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_verification_service_candidate_360_audit():
    """Verify concurrent 360-degree candidate audit across Identity, EPFO, and Skills."""
    svc = VerificationService()
    report = await svc.run_candidate_360_audit(
        expected_name="Priya Sharma",
        raw_aadhaar="123456789012",
        uan="101234567890",
        employer_name="TCS",
        credential_id="NCVET-CERT-001",
    )

    assert report["candidate_name"] == "Priya Sharma"
    assert report["composite_trust_score"] == 100.0  # 40 + 35 + 25
    assert report["identity_verification"]["is_verified"] is True
    assert report["epfo_verification"]["is_verified"] is True
    assert report["credential_verification"]["is_authenticated"] is True
    assert report["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_verification_service_with_partial_outage():
    """Verify 360 audit continues gracefully when one external gateway fails."""
    mock_aadhaar = MockAadhaarVerificationAdapter(timeout_seconds=0.5, max_retries=1)
    mock_aadhaar.set_simulated_outage(True)  # Aadhaar gateway down

    svc = VerificationService(aadhaar_svc=mock_aadhaar)
    report = await svc.run_candidate_360_audit(
        expected_name="Priya Sharma",
        raw_aadhaar="123456789012",
        uan="101234567890",
        employer_name="TCS",
        credential_id="NCVET-CERT-001",
    )

    # Aadhaar is unavailable, but EPFO and NCVET succeed
    assert report["composite_trust_score"] == 60.0  # 0 + 35 + 25
    assert report["identity_verification"]["kyc_status"] == "UNAVAILABLE"
    assert report["epfo_verification"]["is_verified"] is True
    assert report["status"] == "COMPLETED"


# ==============================================================================
# REST API Integration Endpoints Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_api_identity_verification_endpoint(client: AsyncClient, auth_headers: dict):
    """Test POST /api/v1/verification/identity returns masked Aadhaar and verification token."""
    resp = await client.post(
        "/api/v1/verification/identity",
        json={
            "aadhaar_number": "987654321098",
            "full_name": "Aman Verma",
            "state": "Uttar Pradesh",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_verified"] is True
    assert data["masked_aadhaar"] == "XXXX-XXXX-1098"
    assert data["aadhaar_hash"].startswith("sha256:")
    assert data["kyc_status"] == "VERIFIED"


@pytest.mark.asyncio
async def test_api_epfo_verification_endpoint(client: AsyncClient, auth_headers: dict):
    """Test POST /api/v1/verification/epfo audits statutory passbook."""
    resp = await client.post(
        "/api/v1/verification/epfo",
        json={
            "uan": "101234567890",
            "employer_name": "Wipro Limited",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_verified"] is True
    assert data["status"] == "VERIFIED_ACTIVE"
    assert data["contributions_found"] == 6


@pytest.mark.asyncio
async def test_api_sid_verification_endpoint(client: AsyncClient, auth_headers: dict):
    """Test POST /api/v1/verification/sid authenticates NCVET certificate."""
    resp = await client.post(
        "/api/v1/verification/sid",
        json={
            "credential_id": "NCVET-CERT-2026-UP01",
            "candidate_name": "Sunita Patel",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_authenticated"] is True
    assert data["status"] == "AUTHENTICATED"


@pytest.mark.asyncio
async def test_api_candidate_360_endpoint(client: AsyncClient, auth_headers: dict):
    """Test POST /api/v1/verification/candidate-360 executes multi-signal audit."""
    resp = await client.post(
        "/api/v1/verification/candidate-360",
        json={
            "expected_name": "Sunita Patel",
            "aadhaar_number": "123456789012",
            "uan": "101234567890",
            "employer_name": "TCS",
            "credential_id": "NCVET-CERT-001",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["candidate_name"] == "Sunita Patel"
    assert data["composite_trust_score"] == 100.0
    assert data["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_api_adapters_health_endpoint(client: AsyncClient, auth_headers: dict):
    """Test GET /api/v1/verification/health returns adapter status overview."""
    resp = await client.get("/api/v1/verification/health", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_status"] in ["OPERATIONAL", "DEGRADED"]
    assert len(data["adapters"]) == 3
