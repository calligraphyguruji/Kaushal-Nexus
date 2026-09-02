from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.api.router import api_router
from src.core.config import settings
from src.core.database import check_db_connection, dispose_engine
from src.core.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from src.core.logging import logger, setup_logging
from src.core.redis import check_redis_connection, close_redis_pool, init_redis_pool
from src.schemas.common import (
    DatabaseHealthResponse,
    HealthCheckResponse,
    RedisHealthResponse,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    setup_logging()
    logger.info(f"Starting {settings.APP_NAME} in [{settings.APP_ENV}] mode...")
    
    # Initialize Redis connection (non-blocking if redis isn't up locally)
    await init_redis_pool()
    
    yield
    
    # Teardown resources
    logger.info(f"Shutting down {settings.APP_NAME}...")
    await close_redis_pool()
    await dispose_engine()


from src.middleware import (
    CorrelationIdMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
)

# ==============================================================================
# FastAPI Application Factory
# ==============================================================================

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "National Skill-to-Employment Intelligence Platform API. "
        "Continuous tracking of longitudinal employment retention, candidate competency dossiers, "
        "regional demand divergence, and AI multi-signal placement matching."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    debug=settings.APP_DEBUG,
)

# ==============================================================================
# Security Middlewares (Executed in reverse registration order)
# ==============================================================================

# 1. Rate Limiting (Protects from DDoS & volumetric abuse)
app.add_middleware(RateLimitMiddleware)

# 2. Security Headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
app.add_middleware(SecurityHeadersMiddleware)

# 3. Request Correlation ID & Distributed Tracing
app.add_middleware(CorrelationIdMiddleware)

# 4. Hardened CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Correlation-ID", "X-Request-ID", "Accept"],
    expose_headers=["X-Correlation-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

# ==============================================================================
# Exception Handlers
# ==============================================================================

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# ==============================================================================
# Root & Health Endpoints
# ==============================================================================

@app.get(
    "/health",
    response_model=HealthCheckResponse,
    status_code=status.HTTP_200_OK,
    tags=["Health"],
    summary="Global Health Check with DB & Redis Diagnostics",
    description="Check whether the global API service, PostgreSQL database, and Redis cache/broker are operational.",
)
async def global_health_check() -> HealthCheckResponse:
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


@app.get(
    "/",
    status_code=status.HTTP_200_OK,
    tags=["Root"],
    summary="Platform Root",
)
async def root():
    return {
        "platform": settings.APP_NAME,
        "version": "1.0.0",
        "status": "operational",
        "docs_url": "/docs",
        "health_url": "/health",
        "api_v1_health": f"{settings.API_V1_STR}/health",
        "api_v1_db_health": f"{settings.API_V1_STR}/health/db",
    }


# ==============================================================================
# Mount API Routers
# ==============================================================================

app.include_router(api_router)
