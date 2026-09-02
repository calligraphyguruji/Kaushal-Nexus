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
