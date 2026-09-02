from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class BaseResponse(BaseModel):
    """Standard API envelope response."""
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated API response."""
    success: bool = True
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[T]

    model_config = ConfigDict(from_attributes=True)


class DatabaseHealthResponse(BaseModel):
    """Database connectivity details."""
    status: str
    healthy: bool
    database: str
    server_version: Optional[str] = None
    latency_ms: float
    error: Optional[str] = None


class RedisHealthResponse(BaseModel):
    """Redis cache and broker connectivity details."""
    status: str
    healthy: bool
    latency_ms: float
    redis_version: Optional[str] = None
    used_memory_human: Optional[str] = None
    connected_clients: Optional[int] = None
    error: Optional[str] = None


class HealthCheckResponse(BaseModel):
    """Health check payload schema."""
    status: str
    app_name: str
    environment: str
    version: str
    timestamp: str
    database: Optional[DatabaseHealthResponse] = None
    redis: Optional[RedisHealthResponse] = None
