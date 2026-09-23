"""
Unit and integration tests for KaushalNexus National Internship Directory API
Validates:
- Every interest track has at least 10+ verified internships.
- Filtering by domain, work mode, stipend, and keyword search.
- Dynamic candidate skill-match calculation and recommendation ranking.
- Direct application submission.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.data.internships_data import ALL_INTERNSHIPS, INTERNSHIP_DOMAINS, score_internship_match


@pytest.mark.asyncio
async def test_all_domains_have_at_least_10_internships():
    """Validates invariant: Every configured domain interest track must have at least 10+ internships."""
    assert len(INTERNSHIP_DOMAINS) >= 9
    for domain in INTERNSHIP_DOMAINS:
        domain_id = domain["id"]
        matches = [i for i in ALL_INTERNSHIPS if i.get("interest") == domain_id]
        assert len(matches) >= 10, f"Domain '{domain_id}' must have at least 10 internships, found {len(matches)}"


@pytest.mark.asyncio
async def test_get_internship_domains_endpoint():
    """Tests GET /api/v1/internships/domains endpoint returns correct schema and minimum counts."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/internships/domains")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 9
        for d in data:
            assert d["has_minimum_ten"] is True
            assert d["total_openings_count"] >= 10


@pytest.mark.asyncio
async def test_list_internships_unfiltered_and_filtered():
    """Tests GET /api/v1/internships with and without filters."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # All internships
        res = await client.get("/api/v1/internships?limit=100")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 90
        assert len(data["internships"]) >= 90

        # Filter by fullstack
        fs_res = await client.get("/api/v1/internships?interest=fullstack")
        assert fs_res.status_code == 200
        fs_data = fs_res.json()
        assert fs_data["total"] >= 10
        for item in fs_data["internships"]:
            assert item["interest"] == "fullstack"

        # Filter by python
        py_res = await client.get("/api/v1/internships?interest=python")
        assert py_res.status_code == 200
        py_data = py_res.json()
        assert py_data["total"] >= 10
        for item in py_data["internships"]:
            assert item["interest"] == "python"

        # Filter by work mode Remote
        rem_res = await client.get("/api/v1/internships?work_mode=Remote")
        assert rem_res.status_code == 200
        rem_data = rem_res.json()
        assert rem_data["total"] > 0
        for item in rem_data["internships"]:
            assert item["work_mode"].lower() == "remote"

        # Search query
        search_res = await client.get("/api/v1/internships?search=Razorpay")
        assert search_res.status_code == 200
        s_data = search_res.json()
        assert s_data["total"] >= 1
        assert "Razorpay" in s_data["internships"][0]["company"]


@pytest.mark.asyncio
async def test_get_internship_detail_and_404():
    """Tests GET /api/v1/internships/{internship_id}."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Valid ID
        res = await client.get("/api/v1/internships/int-fs-01")
        assert res.status_code == 200
        item = res.json()
        assert item["id"] == "int-fs-01"
        assert item["interest"] == "fullstack"
        assert len(item["required_skills"]) > 0

        # Invalid ID
        bad_res = await client.get("/api/v1/internships/non-existent-id-999")
        assert bad_res.status_code == 404


@pytest.mark.asyncio
async def test_dynamic_candidate_recommendations():
    """Tests GET /api/v1/internships/recommendations/{learner_id}."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/internships/recommendations/KN-2026-TEST",
            params={
                "target_domain": "python",
                "readiness_score": 85,
                "active_gaps": "Distributed Queues",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["learner_id"] == "KN-2026-TEST"
        assert data["target_domain"] == "python"
        assert data["primary_track_count"] >= 10
        assert len(data["recommendations"]) >= 90

        # Ensure top recommendations are from python and high score
        top_rec = data["recommendations"][0]
        assert top_rec["is_primary_interest"] is True
        assert top_rec["match_score"] >= 70
        assert "matched_skills" in top_rec
        assert "missing_skills" in top_rec


@pytest.mark.asyncio
async def test_apply_to_internship():
    """Tests POST /api/v1/internships/{internship_id}/apply."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "learner_id": "KN-2026-CANDIDATE-01",
            "learner_name": "Rahul Sharma",
            "learner_email": "rahul.sharma@example.com",
            "cover_note": "Excited to apply with verified NSQF Level 6 credentials.",
            "target_domain": "fullstack",
            "readiness_score": 80,
        }
        res = await client.post("/api/v1/internships/int-fs-01/apply", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["internship_id"] == "int-fs-01"
        assert data["learner_id"] == "KN-2026-CANDIDATE-01"
        assert data["status"] == "SUBMITTED"
        assert "application_id" in data
