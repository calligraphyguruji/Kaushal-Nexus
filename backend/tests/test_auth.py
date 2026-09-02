import uuid
import pytest
from httpx import AsyncClient

from src.api.deps import require_role
from src.core.security import verify_password
from src.main import app
from src.models.user import User
from src.schemas.user import UserRole

# Test endpoint protected by RBAC
@app.get("/api/v1/test/msde-only", tags=["Test"])
async def msde_only_route(user: User = pytest.importorskip("fastapi").Depends(require_role(UserRole.MSDE_OFFICER))):
    return {"message": f"Welcome Officer {user.full_name}"}


@pytest.mark.asyncio
async def test_user_registration_success(client: AsyncClient):
    """Test registering a new user with valid details."""
    unique_email = f"officer.{uuid.uuid4().hex[:6]}@msde.gov.in"
    payload = {
        "email": unique_email,
        "password": "SecurePassword2026!",
        "full_name": "Dr. Rajesh Sharma",
        "role": "MSDE_OFFICER",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == unique_email
    assert data["full_name"] == "Dr. Rajesh Sharma"
    assert data["role"] == "MSDE_OFFICER"
    assert data["is_active"] is True
    assert "password" not in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_user_registration_duplicate_email(client: AsyncClient):
    """Test duplicate email registration returns 409 Conflict."""
    unique_email = f"duplicate.{uuid.uuid4().hex[:6]}@msde.gov.in"
    payload = {
        "email": unique_email,
        "password": "SecurePassword2026!",
        "full_name": "User One",
        "role": "EVALUATOR",
    }
    r1 = await client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201

    r2 = await client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409
    data = r2.json()
    assert data["success"] is False
    assert data["error"]["code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_user_login_success(client: AsyncClient):
    """Test user login with correct credentials returns valid JWT."""
    unique_email = f"employer.{uuid.uuid4().hex[:6]}@technova.com"
    password = "StrongPassword123!"
    
    # Register
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": password,
            "full_name": "Priya Nair",
            "role": "EMPLOYER",
        },
    )

    # Login
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == unique_email
    assert data["user"]["role"] == "EMPLOYER"


@pytest.mark.asyncio
async def test_user_login_invalid_password(client: AsyncClient):
    """Test user login with incorrect password returns 401 Unauthorized."""
    unique_email = f"evaluator.{uuid.uuid4().hex[:6]}@kaushalnexus.in"
    password = "CorrectPassword123!"

    await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": password,
            "full_name": "Amit Sen",
            "role": "EVALUATOR",
        },
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": "WrongPassword999!"},
    )
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.asyncio
async def test_get_current_user_me(client: AsyncClient):
    """Test GET /api/v1/auth/me returns current user profile with valid Bearer token."""
    unique_email = f"stateadmin.{uuid.uuid4().hex[:6]}@up.gov.in"
    password = "StateAdminPassword2026!"

    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "password": password,
            "full_name": "Suresh Patel",
            "role": "STATE_ADMIN",
        },
    )
    assert reg_resp.status_code == 201

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password},
    )
    token = login_resp.json()["access_token"]

    # Access /me
    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == unique_email
    assert me_data["full_name"] == "Suresh Patel"
    assert me_data["role"] == "STATE_ADMIN"


@pytest.mark.asyncio
async def test_get_current_user_unauthorized(client: AsyncClient):
    """Test accessing protected route without token returns 401."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_rbac_role_guard(client: AsyncClient):
    """Test require_role allows authorized role and rejects unauthorized role with 403."""
    # 1. Register MSDE Officer
    officer_email = f"officer.{uuid.uuid4().hex[:6]}@msde.gov.in"
    pwd = "OfficerPassword2026!"
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": officer_email,
            "password": pwd,
            "full_name": "Officer Vikas",
            "role": "MSDE_OFFICER",
        },
    )
    officer_token = (
        await client.post("/api/v1/auth/login", json={"email": officer_email, "password": pwd})
    ).json()["access_token"]

    # 2. Register Training Provider
    tp_email = f"tp.{uuid.uuid4().hex[:6]}@skillprovider.in"
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": tp_email,
            "password": pwd,
            "full_name": "Training Head",
            "role": "TRAINING_PROVIDER",
        },
    )
    tp_token = (
        await client.post("/api/v1/auth/login", json={"email": tp_email, "password": pwd})
    ).json()["access_token"]

    # 3. Officer accesses MSDE-only route -> 200 OK
    resp_officer = await client.get(
        "/api/v1/test/msde-only",
        headers={"Authorization": f"Bearer {officer_token}"},
    )
    assert resp_officer.status_code == 200
    assert "Officer Vikas" in resp_officer.json()["message"]

    # 4. Training Provider accesses MSDE-only route -> 403 Forbidden
    resp_tp = await client.get(
        "/api/v1/test/msde-only",
        headers={"Authorization": f"Bearer {tp_token}"},
    )
    assert resp_tp.status_code == 403
    data_tp = resp_tp.json()
    assert data_tp["success"] is False
    assert data_tp["error"]["code"] == "FORBIDDEN"
