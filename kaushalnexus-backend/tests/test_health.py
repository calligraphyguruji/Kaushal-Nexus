import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Test GET / returns platform info."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert data["platform"] == "KaushalNexus Backend API"
    assert data["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_global_health_endpoint(client: AsyncClient):
    """Test GET /health returns healthy status."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "KaushalNexus Backend API"
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_api_v1_health_endpoint(client: AsyncClient):
    """Test GET /api/v1/health returns healthy status."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "KaushalNexus Backend API"
    assert data["version"] == "1.0.0"
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_404_error_handling(client: AsyncClient):
    """Test structured 404 response for non-existent endpoint."""
    response = await client.get("/api/v1/non-existent-route")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert data["error"]["code"] == "HTTP_404"
