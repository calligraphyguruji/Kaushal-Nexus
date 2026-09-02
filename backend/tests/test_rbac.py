import pytest
from httpx import AsyncClient

from src.api.deps import require_role
from src.core.security import create_access_token
from src.main import app
from src.models.district import District
from src.models.user import User
from src.schemas.user import UserRole

# Define testing endpoints guarded by specific roles
@app.get("/api/v1/test/rbac/msde", tags=["RBAC Test"])
async def rbac_msde_endpoint(user: User = pytest.importorskip("fastapi").Depends(require_role(UserRole.MSDE_OFFICER))):
    return {"status": "success", "user": user.full_name, "role": user.role}


@app.get("/api/v1/test/rbac/state-admin", tags=["RBAC Test"])
async def rbac_state_admin_endpoint(user: User = pytest.importorskip("fastapi").Depends(require_role(UserRole.STATE_ADMIN))):
    return {"status": "success", "user": user.full_name, "role": user.role}


@app.get("/api/v1/test/rbac/tp", tags=["RBAC Test"])
async def rbac_tp_endpoint(user: User = pytest.importorskip("fastapi").Depends(require_role(UserRole.TRAINING_PROVIDER))):
    return {"status": "success", "user": user.full_name, "role": user.role}


@app.get("/api/v1/test/rbac/employer", tags=["RBAC Test"])
async def rbac_employer_endpoint(user: User = pytest.importorskip("fastapi").Depends(require_role(UserRole.EMPLOYER))):
    return {"status": "success", "user": user.full_name, "role": user.role}


@app.get("/api/v1/test/rbac/evaluator", tags=["RBAC Test"])
async def rbac_evaluator_endpoint(user: User = pytest.importorskip("fastapi").Depends(require_role(UserRole.EVALUATOR))):
    return {"status": "success", "user": user.full_name, "role": user.role}


@app.get("/api/v1/test/rbac/sysadmin", tags=["RBAC Test"])
async def rbac_sysadmin_endpoint(user: User = pytest.importorskip("fastapi").Depends(require_role(UserRole.SYSTEM_ADMIN))):
    return {"status": "success", "user": user.full_name, "role": user.role}


# ==============================================================================
# RBAC Unit & Integration Tests Across All Roles
# ==============================================================================

@pytest.mark.asyncio
async def test_msde_officer_role_access(
    client: AsyncClient, auth_headers_msde: dict, auth_headers_tp: dict
):
    """Verify MSDE Central Officer access to policy endpoints."""
    # Authorized MSDE Officer -> 200 OK
    resp_auth = await client.get("/api/v1/test/rbac/msde", headers=auth_headers_msde)
    assert resp_auth.status_code == 200
    assert resp_auth.json()["role"] == UserRole.MSDE_OFFICER.value

    # Unauthorized Training Provider -> 403 Forbidden
    resp_unauth = await client.get("/api/v1/test/rbac/msde", headers=auth_headers_tp)
    assert resp_unauth.status_code == 403
    assert resp_unauth.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_state_admin_role_access(
    client: AsyncClient, auth_headers_state_admin: dict, auth_headers_employer: dict
):
    """Verify State Admin access permissions."""
    resp_auth = await client.get("/api/v1/test/rbac/state-admin", headers=auth_headers_state_admin)
    assert resp_auth.status_code == 200
    assert resp_auth.json()["role"] == UserRole.STATE_ADMIN.value

    resp_unauth = await client.get("/api/v1/test/rbac/state-admin", headers=auth_headers_employer)
    assert resp_unauth.status_code == 403


@pytest.mark.asyncio
async def test_training_provider_role_access(
    client: AsyncClient, auth_headers_tp: dict, auth_headers_evaluator: dict
):
    """Verify Training Provider access permissions."""
    resp_auth = await client.get("/api/v1/test/rbac/tp", headers=auth_headers_tp)
    assert resp_auth.status_code == 200
    assert resp_auth.json()["role"] == UserRole.TRAINING_PROVIDER.value

    resp_unauth = await client.get("/api/v1/test/rbac/tp", headers=auth_headers_evaluator)
    assert resp_unauth.status_code == 403


@pytest.mark.asyncio
async def test_employer_role_access(
    client: AsyncClient, auth_headers_employer: dict, auth_headers_tp: dict
):
    """Verify Employer role access permissions."""
    resp_auth = await client.get("/api/v1/test/rbac/employer", headers=auth_headers_employer)
    assert resp_auth.status_code == 200
    assert resp_auth.json()["role"] == UserRole.EMPLOYER.value

    resp_unauth = await client.get("/api/v1/test/rbac/employer", headers=auth_headers_tp)
    assert resp_unauth.status_code == 403


@pytest.mark.asyncio
async def test_evaluator_role_access(
    client: AsyncClient, auth_headers_evaluator: dict, auth_headers_msde: dict
):
    """Verify Evaluator role access permissions."""
    resp_auth = await client.get("/api/v1/test/rbac/evaluator", headers=auth_headers_evaluator)
    assert resp_auth.status_code == 200
    assert resp_auth.json()["role"] == UserRole.EVALUATOR.value

    resp_unauth = await client.get("/api/v1/test/rbac/evaluator", headers=auth_headers_msde)
    assert resp_unauth.status_code == 403


@pytest.mark.asyncio
async def test_system_admin_role_access(
    client: AsyncClient, auth_headers_admin: dict, auth_headers_evaluator: dict
):
    """Verify System Administrator role access permissions."""
    resp_auth = await client.get("/api/v1/test/rbac/sysadmin", headers=auth_headers_admin)
    assert resp_auth.status_code == 200
    assert resp_auth.json()["role"] == UserRole.SYSTEM_ADMIN.value

    resp_unauth = await client.get("/api/v1/test/rbac/sysadmin", headers=auth_headers_evaluator)
    assert resp_unauth.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(client: AsyncClient):
    """Verify unauthenticated requests receive HTTP 401 Unauthorized."""
    resp = await client.get("/api/v1/test/rbac/msde")
    assert resp.status_code == 401
    assert resp.json()["success"] is False


# ==============================================================================
# Production V1 Routes RBAC Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_production_skill_gaps_intervention_rbac(
    client: AsyncClient,
    auth_headers_msde: dict,
    auth_headers_evaluator: dict,
    seed_district: District,
    seed_competencies: list,
):
    """Test policy intervention route requires MSDE_OFFICER, STATE_ADMIN, or SYSTEM_ADMIN."""
    payload = {
        "district_id": seed_district.id,
        "competency_id": str(seed_competencies[0].id),
        "intervention_type": "BRIDGE_COURSE",
        "target_capacity": 50,
        "budget_allocated_inr": 500000.0,
        "target_completion_weeks": 6,
    }

    # 1. Authorized: MSDE Officer -> 200 OK
    resp_auth = await client.post(
        "/api/v1/skill-gaps/deploy-intervention",
        json=payload,
        headers=auth_headers_msde,
    )
    assert resp_auth.status_code == 200

    # 2. Unauthorized: Evaluator -> 403 Forbidden
    resp_unauth = await client.post(
        "/api/v1/skill-gaps/deploy-intervention",
        json=payload,
        headers=auth_headers_evaluator,
    )
    assert resp_unauth.status_code == 403
    assert resp_unauth.json()["error"]["code"] == "FORBIDDEN"

    # 3. Unauthenticated -> 401 Unauthorized
    resp_anon = await client.post(
        "/api/v1/skill-gaps/deploy-intervention",
        json=payload,
    )
    assert resp_anon.status_code == 401


@pytest.mark.asyncio
async def test_production_audit_logs_rbac(
    client: AsyncClient,
    auth_headers_msde: dict,
    auth_headers_tp: dict,
):
    """Test audit logs route is restricted to MSDE_OFFICER and SYSTEM_ADMIN."""
    # 1. Authorized: MSDE Officer -> 200 OK
    resp_auth = await client.get(
        "/api/v1/audit/logs",
        headers=auth_headers_msde,
    )
    assert resp_auth.status_code == 200

    # 2. Unauthorized: Training Provider -> 403 Forbidden
    resp_unauth = await client.get(
        "/api/v1/audit/logs",
        headers=auth_headers_tp,
    )
    assert resp_unauth.status_code == 403

    # 3. Unauthenticated -> 401 Unauthorized
    resp_anon = await client.get("/api/v1/audit/logs")
    assert resp_anon.status_code == 401


@pytest.mark.asyncio
async def test_production_regional_divergence_rbac(
    client: AsyncClient,
    auth_headers_state_admin: dict,
    auth_headers_employer: dict,
):
    """Test macro regional divergence route is restricted to MSDE_OFFICER, STATE_ADMIN, SYSTEM_ADMIN."""
    # 1. Authorized: State Admin -> 200 OK
    resp_auth = await client.get(
        "/api/v1/regional/divergence",
        headers=auth_headers_state_admin,
    )
    assert resp_auth.status_code == 200

    # 2. Unauthorized: Employer -> 403 Forbidden
    resp_unauth = await client.get(
        "/api/v1/regional/divergence",
        headers=auth_headers_employer,
    )
    assert resp_unauth.status_code == 403

    # 3. Unauthenticated -> 401 Unauthorized
    resp_anon = await client.get("/api/v1/regional/divergence")
    assert resp_anon.status_code == 401


@pytest.mark.asyncio
async def test_production_celery_test_task_sysadmin_only(
    client: AsyncClient,
    auth_headers_admin: dict,
    auth_headers_msde: dict,
):
    """Test test-celery route is restricted strictly to SYSTEM_ADMIN."""
    # 1. Authorized: System Admin -> 202 Accepted
    resp_auth = await client.post(
        "/api/v1/tasks/test-celery",
        json={"x": 5, "y": 10},
        headers=auth_headers_admin,
    )
    assert resp_auth.status_code == 202

    # 2. Unauthorized: MSDE Officer -> 403 Forbidden
    resp_unauth = await client.post(
        "/api/v1/tasks/test-celery",
        json={"x": 5, "y": 10},
        headers=auth_headers_msde,
    )
    assert resp_unauth.status_code == 403
