from datetime import datetime, timedelta, timezone
import re
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.user import User
from src.services.auth_service import AuthService
from src.services.email_service import default_mock_provider, email_service


@pytest.fixture(autouse=True)
def setup_mock_email():
    """Ensure mock email provider is active and cleared for every test."""
    email_service.set_provider(default_mock_provider)
    default_mock_provider.clear()
    yield
    default_mock_provider.clear()


def extract_token_from_url(url: str) -> str:
    """Helper to extract ?token=<TOKEN> parameter from a verification URL."""
    match = re.search(r"token=([a-zA-Z0-9_-]+)", url)
    assert match is not None, f"Could not extract token from verification URL: {url}"
    return match.group(1)


@pytest.mark.asyncio
async def test_1_registration_creates_unverified_account(client: AsyncClient, db: AsyncSession):
    """1. Registration creates an account with email_verified = False."""
    unique_email = f"unverified.{uuid.uuid4().hex[:6]}@example.gov.in"
    payload = {
        "email": unique_email,
        "password": "Password2026!",
        "full_name": "Test Unverified User",
        "role": "MSDE_OFFICER",
    }
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201
    data = resp.json()

    assert data["email"] == unique_email
    assert data["email_verified"] is False
    assert "email_verification_token_hash" not in data

    # Verify directly in DB
    stmt = select(User).where(User.email == unique_email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    assert user is not None
    assert user.email_verified is False
    assert user.email_verification_token_hash is not None
    assert user.email_verification_expires_at is not None


@pytest.mark.asyncio
async def test_2_verification_email_is_triggered(client: AsyncClient):
    """2. Registration triggers a verification email containing a valid token link."""
    unique_email = f"emailtest.{uuid.uuid4().hex[:6]}@example.gov.in"
    payload = {
        "email": unique_email,
        "password": "Password2026!",
        "full_name": "Email Recipient",
        "role": "EMPLOYER",
    }
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201

    # Check mock email inbox
    assert len(default_mock_provider.sent_emails) == 1
    last_email = default_mock_provider.get_last_email()
    assert last_email["to"] == unique_email
    assert "Verify your email address" in last_email["subject"]
    assert "verify-email?token=" in last_email["html"]
    assert "KaushalNexus" in last_email["html"]
    assert "24 hours" in last_email["html"]


@pytest.mark.asyncio
async def test_3_valid_token_verifies_email(client: AsyncClient, db: AsyncSession):
    """3. Valid token verifies the email address and clears the token hash."""
    unique_email = f"verify.{uuid.uuid4().hex[:6]}@example.gov.in"
    payload = {
        "email": unique_email,
        "password": "Password2026!",
        "full_name": "Verify Me",
        "role": "STATE_ADMIN",
    }
    await client.post("/api/v1/auth/register", json=payload)

    last_email = default_mock_provider.get_last_email()
    raw_token = extract_token_from_url(last_email["html"])

    # Call verification endpoint
    resp = await client.get(f"/api/v1/auth/verify-email?token={raw_token}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["email_verified"] is True
    assert "verified successfully" in data["message"].lower()

    # Verify database state
    stmt = select(User).where(User.email == unique_email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    assert user.email_verified is True
    assert user.email_verification_token_hash is None
    assert user.email_verification_expires_at is None


@pytest.mark.asyncio
async def test_4_invalid_token_is_rejected(client: AsyncClient):
    """4. Invalid token returns HTTP 400 with code VERIFICATION_TOKEN_INVALID."""
    resp = await client.get("/api/v1/auth/verify-email?token=completely_fake_invalid_token_12345")
    assert resp.status_code == 400
    data = resp.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VERIFICATION_TOKEN_INVALID"


@pytest.mark.asyncio
async def test_5_expired_token_is_rejected(client: AsyncClient, db: AsyncSession):
    """5. Expired token returns HTTP 400 with code VERIFICATION_TOKEN_EXPIRED."""
    unique_email = f"expired.{uuid.uuid4().hex[:6]}@example.gov.in"
    payload = {
        "email": unique_email,
        "password": "Password2026!",
        "full_name": "Expired User",
        "role": "EVALUATOR",
    }
    await client.post("/api/v1/auth/register", json=payload)

    last_email = default_mock_provider.get_last_email()
    raw_token = extract_token_from_url(last_email["html"])

    # Manually expire the token in database
    stmt = select(User).where(User.email == unique_email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    user.email_verification_expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    await db.commit()

    resp = await client.get(f"/api/v1/auth/verify-email?token={raw_token}")
    assert resp.status_code == 400
    data = resp.json()
    assert data["success"] is False
    assert data["error"]["code"] == "VERIFICATION_TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_6_used_token_cannot_be_reused(client: AsyncClient):
    """6. Used verification token cannot be reused to verify again."""
    unique_email = f"reuse.{uuid.uuid4().hex[:6]}@example.gov.in"
    payload = {
        "email": unique_email,
        "password": "Password2026!",
        "full_name": "Reuse Token User",
        "role": "TRAINING_PROVIDER",
    }
    await client.post("/api/v1/auth/register", json=payload)

    last_email = default_mock_provider.get_last_email()
    raw_token = extract_token_from_url(last_email["html"])

    # First verification attempt -> 200 OK
    resp1 = await client.get(f"/api/v1/auth/verify-email?token={raw_token}")
    assert resp1.status_code == 200

    # Second verification attempt with same token -> 400 Rejected
    resp2 = await client.get(f"/api/v1/auth/verify-email?token={raw_token}")
    assert resp2.status_code == 400
    assert resp2.json()["error"]["code"] == "VERIFICATION_TOKEN_INVALID"


@pytest.mark.asyncio
async def test_7_already_verified_account_handled_correctly(client: AsyncClient, db: AsyncSession):
    """7. Verifying an already verified user handles the request cleanly."""
    unique_email = f"alreadyverified.{uuid.uuid4().hex[:6]}@example.gov.in"
    payload = {
        "email": unique_email,
        "password": "Password2026!",
        "full_name": "Already Verified",
        "role": "MSDE_OFFICER",
    }
    await client.post("/api/v1/auth/register", json=payload)

    # Set user as already verified but give them an active token hash
    stmt = select(User).where(User.email == unique_email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    token = AuthService.generate_verification_token()
    user.email_verified = True
    user.email_verification_token_hash = AuthService.hash_verification_token(token)
    user.email_verification_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    await db.commit()

    resp = await client.get(f"/api/v1/auth/verify-email?token={token}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["email_verified"] is True
    assert "already verified" in data["message"].lower()


@pytest.mark.asyncio
async def test_8_resend_verification_generates_new_token(client: AsyncClient, db: AsyncSession):
    """8. Resend verification endpoint generates a new token and sends a new email."""
    unique_email = f"resend.{uuid.uuid4().hex[:6]}@example.gov.in"
    payload = {
        "email": unique_email,
        "password": "Password2026!",
        "full_name": "Resend User",
        "role": "LEARNER",
    }
    await client.post("/api/v1/auth/register", json=payload)

    first_email = default_mock_provider.get_last_email()
    token1 = extract_token_from_url(first_email["html"])

    # Call resend endpoint
    resend_resp = await client.post(
        "/api/v1/auth/resend-verification",
        json={"email": unique_email},
    )
    assert resend_resp.status_code == 200
    assert resend_resp.json()["success"] is True

    # Check that a second email was sent
    assert len(default_mock_provider.sent_emails) == 2
    second_email = default_mock_provider.get_last_email()
    token2 = extract_token_from_url(second_email["html"])
    assert token1 != token2, "Resend must generate a new distinct token"


@pytest.mark.asyncio
async def test_9_old_token_becomes_invalid_after_resend(client: AsyncClient):
    """9. After requesting a new verification email, the old token becomes invalid."""
    unique_email = f"oldtoken.{uuid.uuid4().hex[:6]}@example.gov.in"
    payload = {
        "email": unique_email,
        "password": "Password2026!",
        "full_name": "Old Token User",
        "role": "EMPLOYER",
    }
    await client.post("/api/v1/auth/register", json=payload)

    first_email = default_mock_provider.get_last_email()
    old_token = extract_token_from_url(first_email["html"])

    # Request new verification email
    await client.post(
        "/api/v1/auth/resend-verification",
        json={"email": unique_email},
    )

    second_email = default_mock_provider.get_last_email()
    new_token = extract_token_from_url(second_email["html"])

    # Old token fails
    old_resp = await client.get(f"/api/v1/auth/verify-email?token={old_token}")
    assert old_resp.status_code == 400
    assert old_resp.json()["error"]["code"] == "VERIFICATION_TOKEN_INVALID"

    # New token succeeds
    new_resp = await client.get(f"/api/v1/auth/verify-email?token={new_token}")
    assert new_resp.status_code == 200
    assert new_resp.json()["email_verified"] is True


@pytest.mark.asyncio
async def test_10_unverified_user_cannot_login(client: AsyncClient):
    """10. Unverified users cannot log in and receive 403 EMAIL_NOT_VERIFIED."""
    unique_email = f"blocked.{uuid.uuid4().hex[:6]}@example.gov.in"
    password = "Password2026!"
    payload = {
        "email": unique_email,
        "password": password,
        "full_name": "Blocked Login User",
        "role": "EMPLOYER",
    }
    await client.post("/api/v1/auth/register", json=payload)

    # Attempt login without test bypass
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password},
        headers={"X-Test-Bypass-Email-Verification": "0"},
    )
    assert login_resp.status_code == 403
    data = login_resp.json()
    assert data["success"] is False
    assert data["error"]["code"] == "EMAIL_NOT_VERIFIED"
    assert "verify your email" in data["error"]["message"].lower()


@pytest.mark.asyncio
async def test_11_verified_user_can_login_normally(client: AsyncClient):
    """11. Verified users can log in normally and receive valid JWT tokens."""
    unique_email = f"verifiedlogin.{uuid.uuid4().hex[:6]}@example.gov.in"
    password = "Password2026!"
    payload = {
        "email": unique_email,
        "password": password,
        "full_name": "Verified Login User",
        "role": "MSDE_OFFICER",
    }
    await client.post("/api/v1/auth/register", json=payload)

    last_email = default_mock_provider.get_last_email()
    raw_token = extract_token_from_url(last_email["html"])

    # 1. Verify email
    v_resp = await client.get(f"/api/v1/auth/verify-email?token={raw_token}")
    assert v_resp.status_code == 200

    # 2. Login as verified user (with strict check X-Test-Bypass-Email-Verification: 0)
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password},
        headers={"X-Test-Bypass-Email-Verification": "0"},
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == unique_email
    assert data["user"]["email_verified"] is True


@pytest.mark.asyncio
async def test_12_resend_verification_prevents_user_enumeration(client: AsyncClient):
    """12. Resend verification avoids user enumeration for non-existent and verified emails."""
    # 1. Non-existent email
    non_existent = "nonexistent.user.9999@example.com"
    resp1 = await client.post(
        "/api/v1/auth/resend-verification",
        json={"email": non_existent},
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["success"] is True
    assert "new verification link has been sent" in data1["message"]

    # No email should be dispatched
    assert default_mock_provider.get_last_email() is None
