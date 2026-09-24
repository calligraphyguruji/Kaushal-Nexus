from datetime import datetime, timezone
from fastapi import APIRouter, status

from src.core.config import settings
from src.core.database import check_db_connection
from src.core.redis import check_redis_connection
from src.schemas.common import (
    DatabaseHealthResponse,
    HealthCheckResponse,
    RedisHealthResponse,
)

router = APIRouter()


@router.get(
    "",
    response_model=HealthCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Health Check with DB & Redis Diagnostics (v1)",
    description="Check whether the KaushalNexus API v1, PostgreSQL database, and Redis cache/broker are operational.",
)
async def health_check_v1() -> HealthCheckResponse:
    db_health_data = await check_db_connection()
    redis_health_data = await check_redis_connection()

    is_healthy = db_health_data.get("healthy", False) and redis_health_data.get("healthy", False)
    overall_status = "healthy" if is_healthy else "degraded"

    return HealthCheckResponse(
        status=overall_status,
        app_name=settings.APP_NAME,
        environment=settings.APP_ENV,
        version="1.0.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        database=DatabaseHealthResponse(**db_health_data),
        redis=RedisHealthResponse(**redis_health_data),
    )


@router.get(
    "/db",
    response_model=DatabaseHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="PostgreSQL Connection Diagnostic",
    description="Execute an explicit ping query against the PostgreSQL cluster.",
)
async def database_health_check() -> DatabaseHealthResponse:
    db_health_data = await check_db_connection()
    return DatabaseHealthResponse(**db_health_data)


@router.get(
    "/redis",
    response_model=RedisHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Redis Connection Diagnostic",
    description="Execute a ping and diagnostics check against the Redis cache/broker instance.",
)
async def redis_health_check() -> RedisHealthResponse:
    redis_health_data = await check_redis_connection()
    return RedisHealthResponse(**redis_health_data)


@router.get(
    "/email",
    status_code=status.HTTP_200_OK,
    summary="Email Delivery Diagnostic",
    description="Inspect SMTP and Brevo HTTP configuration state and verify live connectivity without leaking credentials.",
)
async def email_health_check() -> dict:
    import asyncio
    import smtplib
    import httpx

    brevo_key = (
        settings.BREVO_API_KEY
        or (settings.SMTP_PASSWORD if settings.SMTP_PASSWORD and settings.SMTP_PASSWORD.startswith("xkeysib-") else None)
    )
    is_smtp_configured = bool(settings.SMTP_HOST and settings.SMTP_HOST.strip())
    is_brevo_configured = bool(brevo_key and brevo_key.strip())

    diagnostic = {
        "provider": "brevo_http" if is_brevo_configured else ("smtp" if is_smtp_configured else "none"),
        "brevo_configured": is_brevo_configured,
        "smtp_configured": is_smtp_configured,
        "smtp_host": settings.SMTP_HOST or None,
        "smtp_port": settings.SMTP_PORT,
        "smtp_username": settings.SMTP_USERNAME or None,
        "smtp_from_email": settings.SMTP_FROM_EMAIL or None,
        "status": "unconfigured" if not (is_brevo_configured or is_smtp_configured) else "testing",
        "error": None,
    }

    if is_brevo_configured:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    "https://api.brevo.com/v3/account",
                    headers={"api-key": brevo_key.strip(), "accept": "application/json"},
                )
                if res.status_code == 200:
                    diagnostic["status"] = "connected"
                    diagnostic["account_email"] = res.json().get("email")
                else:
                    diagnostic["status"] = "connection_failed"
                    diagnostic["error"] = f"Brevo HTTP API returned status {res.status_code}: {res.text}"
        except Exception as e:
            diagnostic["status"] = "connection_failed"
            diagnostic["error"] = str(e)
        return diagnostic

    if not is_smtp_configured:
        return diagnostic

    def _test_connect():
        try:
            if settings.SMTP_PORT == 465:
                s = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=8.0)
            else:
                s = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=8.0)
                if settings.SMTP_USE_TLS:
                    s.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                s.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            s.quit()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    res = await asyncio.to_thread(_test_connect)
    if res.get("success"):
        diagnostic["status"] = "connected"
    else:
        diagnostic["status"] = "connection_failed"
        diagnostic["error"] = res.get("error")

    return diagnostic

