import time
from collections.abc import AsyncGenerator
from typing import Any, Dict
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.core.config import settings
from src.core.logging import logger

# ==============================================================================
# SQLAlchemy 2.0 Async Engine
# ==============================================================================

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_DEBUG,
    future=True,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
)

# ==============================================================================
# Async Session Factory
# ==============================================================================

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ==============================================================================
# Database Dependency
# ==============================================================================

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an asynchronous database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ==============================================================================
# Database Health & Diagnostics
# ==============================================================================

async def check_db_connection() -> Dict[str, Any]:
    """
    Executes a lightweight query (SELECT 1) to verify PostgreSQL connectivity
    and benchmark query round-trip latency.
    """
    start_time = time.perf_counter()
    try:
        async with engine.connect() as connection:
            result = await connection.execute(text("SELECT 1"))
            scalar = result.scalar()
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            
            # Fetch postgres server version
            ver_result = await connection.execute(text("SHOW server_version"))
            version = ver_result.scalar()

            return {
                "status": "connected",
                "healthy": scalar == 1,
                "database": "PostgreSQL",
                "server_version": str(version) if version else "unknown",
                "latency_ms": latency_ms,
            }
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.error(f"PostgreSQL health check failed: {exc}", exc_info=True)
        return {
            "status": "disconnected",
            "healthy": False,
            "database": "PostgreSQL",
            "error": str(exc),
            "latency_ms": latency_ms,
        }


async def dispose_engine() -> None:
    """Disposes the SQLAlchemy async engine and closes active connection pools."""
    logger.info("Disposing PostgreSQL connection engine...")
    await engine.dispose()
    logger.info("PostgreSQL connection engine disposed.")
