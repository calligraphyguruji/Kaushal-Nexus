import json
import time
from typing import Any, Dict, Optional
import redis as syncredis
import redis.asyncio as aioredis

from src.core.config import settings
from src.core.logging import logger

redis_client: Optional[aioredis.Redis] = None
_sync_redis_client: Optional[syncredis.Redis] = None


# ==============================================================================
# Async Redis Client (FastAPI & Async Pipelines)
# ==============================================================================

async def init_redis_pool() -> Optional[aioredis.Redis]:
    """Initialize asynchronous Redis connection pool."""
    global redis_client
    try:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=5.0,
            socket_connect_timeout=5.0,
        )
        await redis_client.ping()
        logger.info(f"Connected to Redis cache at {settings.REDIS_URL} successfully.")
        return redis_client
    except Exception as e:
        logger.warning(f"Could not connect to Redis: {e}. Running without Redis cache.")
        return None


async def close_redis_pool() -> None:
    """Close asynchronous Redis connection pool."""
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("Async Redis connection closed.")


def get_redis() -> Optional[aioredis.Redis]:
    """FastAPI Dependency to access async Redis client."""
    return redis_client


# ==============================================================================
# Sync Redis Client (Celery Workers & Sync Execution)
# ==============================================================================

def get_sync_redis() -> syncredis.Redis:
    """Provides a thread-safe synchronous Redis client for Celery tasks."""
    global _sync_redis_client
    if _sync_redis_client is None:
        _sync_redis_client = syncredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=5.0,
        )
    return _sync_redis_client


# ==============================================================================
# Task Status & Progress Tracking
# ==============================================================================

def update_sync_task_status(
    task_id: str,
    status: str,
    progress: int,
    stage: str,
    details: Optional[Dict[str, Any]] = None,
    ttl_seconds: int = 86400,
) -> None:
    """Updates background Celery task execution progress and state in Redis."""
    try:
        client = get_sync_redis()
        key = f"kn:task:{task_id}"
        payload = {
            "task_id": task_id,
            "status": status,
            "progress": progress,
            "stage": stage,
            "details": details or {},
            "updated_at": time.time(),
        }
        client.setex(key, ttl_seconds, json.dumps(payload))
    except Exception as exc:
        logger.warning(f"Failed to record sync task status in Redis for {task_id}: {exc}")


async def get_async_task_status(task_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves real-time background task status from Redis."""
    if not redis_client:
        return None
    try:
        key = f"kn:task:{task_id}"
        raw = await redis_client.get(key)
        if raw:
            return json.loads(raw)
        return None
    except Exception as exc:
        logger.warning(f"Failed to fetch task status for {task_id} from Redis: {exc}")
        return None


# ==============================================================================
# Diagnostics & Health Check
# ==============================================================================

async def check_redis_connection() -> Dict[str, Any]:
    """Pings Redis server and returns diagnostic metrics."""
    start_time = time.perf_counter()
    try:
        if redis_client is None:
            # Attempt quick one-off ping
            temp_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            await temp_client.ping()
            info = await temp_client.info()
            await temp_client.close()
        else:
            await redis_client.ping()
            info = await redis_client.info()

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "connected",
            "healthy": True,
            "latency_ms": latency_ms,
            "redis_version": info.get("redis_version", "unknown"),
            "used_memory_human": info.get("used_memory_human", "unknown"),
            "connected_clients": info.get("connected_clients", 0),
        }
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "status": "disconnected",
            "healthy": False,
            "latency_ms": latency_ms,
            "error": str(exc),
        }
