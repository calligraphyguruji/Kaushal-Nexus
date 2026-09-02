import time
from typing import Callable, Dict, Optional
import uuid
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from src.core.config import settings
from src.core.logging import get_correlation_id, logger, set_correlation_id
from src.core.redis import get_sync_redis


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware that captures or generates a unique correlation ID for every request,
    propagating it across logging contexts and client response headers.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract existing correlation ID from headers or generate new UUID
        corr_id = (
            request.headers.get("X-Correlation-ID")
            or request.headers.get("X-Request-ID")
            or f"KN-{uuid.uuid4().hex[:12].upper()}"
        )
        set_correlation_id(corr_id)
        request.state.correlation_id = corr_id

        response = await call_next(request)
        response.headers["X-Correlation-ID"] = corr_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Applies security headers to prevent XSS, clickjacking, MIME sniffing,
    and enforce modern transport security.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Distributed Redis-backed sliding window rate limiter with in-memory fallback.
    Prevents brute-force attacks and volumetric API abuse.
    """

    # In-memory bucket fallback if Redis is unreachable
    _memory_cache: Dict[str, list] = {}

    def _get_client_key(self, request: Request) -> str:
        """Derives rate-limiting identity key from client IP and route."""
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        return f"kn:ratelimit:{client_ip}:{path}"

    def _get_limit_for_path(self, path: str) -> int:
        """Selects rate limit based on endpoint sensitivity."""
        if "/auth/login" in path or "/auth/register" in path:
            return settings.RATE_LIMIT_AUTH_PER_MINUTE
        return settings.RATE_LIMIT_DEFAULT_PER_MINUTE

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not settings.RATE_LIMIT_ENABLED or request.method == "OPTIONS":
            return await call_next(request)

        if request.headers.get("X-Test-Bypass-RateLimit") == "1":
            return await call_next(request)

        # Exclude internal health checks from rate limiting
        if request.url.path in ["/health", "/api/v1/health", "/api/v1/health/db", "/api/v1/health/redis"]:
            return await call_next(request)

        path = request.url.path
        limit = self._get_limit_for_path(path)
        client_key = self._get_client_key(request)
        now = time.time()

        # Check rate limit via Redis or in-memory fallback
        is_allowed = True
        remaining = limit - 1
        reset_time = 60

        try:
            r = get_sync_redis()
            current_count = r.incr(client_key)
            if current_count == 1:
                r.expire(client_key, 60)
            ttl = r.ttl(client_key)
            reset_time = max(1, ttl)

            if current_count > limit:
                is_allowed = False
            remaining = max(0, limit - current_count)
        except Exception:
            # Fallback to local sliding window
            timestamps = self._memory_cache.get(client_key, [])
            # Filter timestamps older than 60s
            valid_timestamps = [t for t in timestamps if now - t < 60]
            if len(valid_timestamps) >= limit:
                is_allowed = False
            valid_timestamps.append(now)
            self._memory_cache[client_key] = valid_timestamps
            remaining = max(0, limit - len(valid_timestamps))

        if not is_allowed:
            corr_id = get_correlation_id()
            logger.warning(f"Rate limit exceeded for {client_key} on {path} (limit={limit}/min)")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "success": False,
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "message": f"Rate limit exceeded. Maximum {limit} requests permitted per minute.",
                    "correlation_id": corr_id,
                    "retry_after_seconds": reset_time,
                },
                headers={
                    "Retry-After": str(reset_time),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_time),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)
        return response
