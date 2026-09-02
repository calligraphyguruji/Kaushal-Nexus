import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient

from src.core.database import AsyncSessionLocal
from src.models.competency import Competency
from src.models.district import District
from src.models.training_center import TrainingCenter
from src.models.user import User


@pytest.fixture(scope="session")
async def test_district_and_competency():
    """Seed a test district, training center, and competency."""
    async with AsyncSessionLocal() as session:
        district_id = f"UP-TEST-{uuid.uuid4().hex[:6]}"
        district = District(
            id=district_id,
            name="Varanasi Test District",
            state="Uttar Pradesh",
            region="Eastern UP",
            tier="Tier 1",
        )
        session.add(district)
        await session.flush()

        center = TrainingCenter(
            center_code=f"PMKK-TEST-{uuid.uuid4().hex[:6]}",
            name="Apex Skill Academy",
            district_id=district.id,
        )
        session.add(center)

        competency = Competency(
            code=f"COMP-TEST-{uuid.uuid4().hex[:6]}",
            name="Data Analytics with Python",
            sector="IT-ITeS",
            nqr_code="NQR-TEST-01",
        )
        session.add(competency)
        await session.commit()

        return {
            "district_id": district.id,
            "center_id": center.id,
            "competency_id": competency.id,
        }


@pytest.mark.asyncio
async def test_create_and_get_learner_360(
    client: AsyncClient, auth_headers: dict, test_district_and_competency: dict
):
    """Test POST /api/v1/learners and GET /api/v1/learners/{id}."""
    learner_id = f"KN-2026-{uuid.uuid4().hex[:6]}"
    district_id = test_district_and_competency["district_id"]
    center_id = str(test_district_and_competency["center_id"])
    competency_id = str(test_district_and_competency["competency_id"])

    payload = {
        "id": learner_id,
        "full_name": "Aarav Sharma",
        "email": f"aarav.{uuid.uuid4().hex[:6]}@example.com",
        "phone": "+91 91234 56789",
        "education_level": "B.Tech Computer Science",
        "district_id": district_id,
        "training_center_id": center_id,
        "nsqf_level": "NSQF Level 5",
        "employment_readiness_score": 82,
        "overall_progress": 90,
        "ncvet_credential_id": "NCVET-2026-TEST",
        "status": "Interview Ready",
        "skills": [
            {
                "competency_id": competency_id,
                "score_percentage": 88,
                "verified_by": "NCVET Lab",
                "is_verified": True,
            }
        ],
    }

    # 1. Create Learner
    create_resp = await client.post(
        "/api/v1/learners",
        json=payload,
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    created_data = create_resp.json()
    assert created_data["id"] == learner_id
    assert created_data["full_name"] == "Aarav Sharma"
    assert created_data["employment_readiness_score"] == 82
    assert len(created_data["skills"]) == 1
    assert created_data["skills"][0]["score_percentage"] == 88
    assert "training_info" in created_data
    assert created_data["training_info"]["training_center_name"] == "Apex Skill Academy"

    # 2. Get Learner 360 Dossier
    get_resp = await client.get(
        f"/api/v1/learners/{learner_id}",
        headers=auth_headers,
    )
    assert get_resp.status_code == 200
    dossier = get_resp.json()
    assert dossier["id"] == learner_id
    assert dossier["state"] == "Uttar Pradesh"
    assert len(dossier["career_timeline"]) > 0
    assert len(dossier["detected_gaps"]) > 0


@pytest.mark.asyncio
async def test_list_and_filter_learners(
    client: AsyncClient, auth_headers: dict, test_district_and_competency: dict
):
    """Test GET /api/v1/learners with search and filters."""
    # List all
    resp = await client.get("/api/v1/learners", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "total" in data
    assert "items" in data
    assert len(data["items"]) >= 1

    # Filter by district
    district_id = test_district_and_competency["district_id"]
    resp_dist = await client.get(
        f"/api/v1/learners?district_id={district_id}",
        headers=auth_headers,
    )
    assert resp_dist.status_code == 200
    assert resp_dist.json()["total"] >= 1

    # Search by keyword
    resp_search = await client.get(
        "/api/v1/learners?search=Aarav",
        headers=auth_headers,
    )
    assert resp_search.status_code == 200
    assert any("Aarav" in item["full_name"] for item in resp_search.json()["items"])


@pytest.mark.asyncio
async def test_patch_learner(
    client: AsyncClient, auth_headers: dict, test_district_and_competency: dict
):
    """Test PATCH /api/v1/learners/{id} updating fields."""
    learner_id = f"KN-2026-{uuid.uuid4().hex[:6]}"
    district_id = test_district_and_competency["district_id"]

    await client.post(
        "/api/v1/learners",
        json={
            "id": learner_id,
            "full_name": "Sunita Verma",
            "district_id": district_id,
            "employment_readiness_score": 60,
            "status": "In Training",
        },
        headers=auth_headers,
    )

    # Patch readiness & status
    patch_resp = await client.patch(
        f"/api/v1/learners/{learner_id}",
        json={
            "employment_readiness_score": 85,
            "status": "Assessment Passed",
        },
        headers=auth_headers,
    )
    assert patch_resp.status_code == 200
    updated = patch_resp.json()
    assert updated["employment_readiness_score"] == 85
    assert updated["status"] == "Assessment Passed"


@pytest.mark.asyncio
async def test_verify_credential_and_allocate_bridge(
    client: AsyncClient, auth_headers: dict, test_district_and_competency: dict
):
    """Test credential verification and bridge module allocation endpoints."""
    learner_id = f"KN-2026-{uuid.uuid4().hex[:6]}"
    district_id = test_district_and_competency["district_id"]

    await client.post(
        "/api/v1/learners",
        json={
            "id": learner_id,
            "full_name": "Manish Gupta",
            "district_id": district_id,
            "employment_readiness_score": 70,
            "status": "In Training",
        },
        headers=auth_headers,
    )

    # 1. Verify Credential
    ver_resp = await client.post(
        f"/api/v1/learners/{learner_id}/verify-credential",
        json={"notes": "Fast-track verification"},
        headers=auth_headers,
    )
    assert ver_resp.status_code == 200
    ver_data = ver_resp.json()
    assert ver_data["success"] is True
    assert ver_data["is_authenticated"] is True
    assert "credential_id" in ver_data

    # 2. Allocate Bridge Module
    bridge_resp = await client.post(
        f"/api/v1/learners/{learner_id}/allocate-bridge-module",
        json={
            "module_name": "Advanced Cloud Infrastructure",
            "duration_hours": 30,
            "target_competency_code": "COMP-CLOUD-01",
        },
        headers=auth_headers,
    )
    assert bridge_resp.status_code == 200
    bridge_data = bridge_resp.json()
    assert bridge_data["success"] is True
    assert bridge_data["new_readiness_score"] > 70
    assert bridge_data["readiness_increment"] > 0


@pytest.mark.asyncio
async def test_learner_not_found(client: AsyncClient, auth_headers: dict):
    """Test accessing non-existent learner returns 404."""
    resp = await client.get(
        "/api/v1/learners/NON-EXISTENT-ID-9999",
        headers=auth_headers,
    )
    assert resp.status_code == 404
    data = resp.json()
    assert data["success"] is False
    assert data["error"]["code"] == "RESOURCE_NOT_FOUND"
