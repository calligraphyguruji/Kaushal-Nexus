import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import AsyncSessionLocal, check_db_connection, get_db
from src.models.base import Base, RecordStatusMixin, TimestampMixin, UUIDPrimaryKeyMixin


class DummyTestModel(Base, UUIDPrimaryKeyMixin, TimestampMixin, RecordStatusMixin):
    """Test model to verify Base and mixin definitions."""
    name: Mapped[str] = mapped_column(nullable=False)


@pytest.mark.asyncio
async def test_db_connection_diagnostic():
    """Verify check_db_connection connects to PostgreSQL and returns latency."""
    health = await check_db_connection()
    assert health["status"] == "connected"
    assert health["healthy"] is True
    assert health["database"] == "PostgreSQL"
    assert "latency_ms" in health
    assert health["latency_ms"] >= 0


@pytest.mark.asyncio
async def test_async_session_dependency():
    """Verify get_db dependency opens and executes query on active session."""
    async for session in get_db():
        result = await session.execute(text("SELECT 1"))
        assert result.scalar() == 1


@pytest.mark.asyncio
async def test_model_metadata_and_mixins():
    """Verify Base model creates automatic tablename and attaches mixin columns."""
    assert DummyTestModel.__tablename__ == "dummytestmodels"
    columns = {c.name for c in DummyTestModel.__table__.columns}
    assert "id" in columns
    assert "created_at" in columns
    assert "updated_at" in columns
    assert "is_active" in columns
    assert "name" in columns


@pytest.mark.asyncio
async def test_api_v1_db_health_endpoint(client: AsyncClient):
    """Test GET /api/v1/health/db returns 200 with connected PostgreSQL status."""
    response = await client.get("/api/v1/health/db")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "connected"
    assert data["healthy"] is True
    assert data["database"] == "PostgreSQL"
    assert "server_version" in data
    assert "latency_ms" in data


@pytest.mark.asyncio
async def test_global_health_with_db_payload(client: AsyncClient):
    """Test GET /health returns database diagnostic payload."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data
    assert data["database"]["status"] == "connected"
    assert data["database"]["healthy"] is True
