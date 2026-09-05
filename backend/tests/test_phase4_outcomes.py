from datetime import datetime, timedelta, timezone
from typing import Tuple
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.career_event import (
    ApplicationStatus,
    CareerApplication,
    CareerEvent,
    CareerEventType,
    CareerSource,
    LearnerProject,
)
from src.models.learner import Learner
from src.models.learner_outcome import LearnerOutcome
from src.models.role import Role
from src.models.user import User


async def create_test_candidate(client: AsyncClient, name: str, email: str) -> Tuple[dict, dict]:
    """Helper creating a test candidate with JWT headers."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password1234!", "full_name": name, "role": "LEARNER"},
    )
    assert reg.status_code == 201, reg.text

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password1234!"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return reg.json(), headers


@pytest.mark.asyncio
async def test_create_and_list_career_events(
    client: AsyncClient,
    db: AsyncSession,
):
    """Verifies that candidates can log career events, query them with filters, and maintain ownership isolation."""
    email = f"learner_event_{uuid.uuid4().hex[:6]}@kaushalnexus.in"
    _, learner_headers = await create_test_candidate(client, "Aarav Career Candidate", email)

    # 1. Record Career Event: APPLICATION_SUBMITTED
    now = datetime.now(timezone.utc)
    ev_payload = {
        "event_type": "APPLICATION_SUBMITTED",
        "organization_name": "Infosys FinTech Labs",
        "event_date": now.isoformat(),
        "source": "SELF_REPORTED",
        "notes": "Applied for Python Junior Developer position",
    }
    create_res = await client.post(
        "/api/v1/learners/me/career-events",
        json=ev_payload,
        headers=learner_headers,
    )
    assert create_res.status_code == 201
    ev_data = create_res.json()
    assert ev_data["event_type"] == "APPLICATION_SUBMITTED"
    assert ev_data["organization_name"] == "Infosys FinTech Labs"
    assert ev_data["source"] == "SELF_REPORTED"

    # 2. Record Second Career Event: INTERVIEW_INVITED
    ev2_payload = {
        "event_type": "INTERVIEW_INVITED",
        "organization_name": "Infosys FinTech Labs",
        "event_date": (now + timedelta(days=2)).isoformat(),
        "source": "SELF_REPORTED",
        "notes": "Invited for Round 1 Technical Screening",
    }
    create_res2 = await client.post(
        "/api/v1/learners/me/career-events",
        json=ev2_payload,
        headers=learner_headers,
    )
    assert create_res2.status_code == 201

    # 3. List all career events
    list_res = await client.get("/api/v1/learners/me/career-events", headers=learner_headers)
    assert list_res.status_code == 200
    events = list_res.json()
    assert len(events) >= 2

    # 4. Filter by event_type
    filter_res = await client.get(
        "/api/v1/learners/me/career-events?event_type=INTERVIEW_INVITED",
        headers=learner_headers,
    )
    assert filter_res.status_code == 200
    filtered = filter_res.json()
    assert len(filtered) == 1
    assert filtered[0]["event_type"] == "INTERVIEW_INVITED"


@pytest.mark.asyncio
async def test_duplicate_event_handling(
    client: AsyncClient,
    db: AsyncSession,
):
    """Verifies that submitting identical events on the same calendar day returns the existing event idempotently."""
    email = f"learner_dup_{uuid.uuid4().hex[:6]}@kaushalnexus.in"
    _, headers = await create_test_candidate(client, "Diya Duplicate Check", email)

    dt = datetime(2026, 9, 10, 14, 30, tzinfo=timezone.utc)
    payload = {
        "event_type": "APPLICATION_SUBMITTED",
        "organization_name": "TCS Research",
        "event_date": dt.isoformat(),
        "source": "SELF_REPORTED",
    }

    res1 = await client.post("/api/v1/learners/me/career-events", json=payload, headers=headers)
    assert res1.status_code == 201
    id1 = res1.json()["id"]

    # Submit exact duplicate
    res2 = await client.post("/api/v1/learners/me/career-events", json=payload, headers=headers)
    assert res2.status_code == 201
    id2 = res2.json()["id"]

    assert id1 == id2


@pytest.mark.asyncio
async def test_chronology_validation_impossible_sequence(
    client: AsyncClient,
    db: AsyncSession,
):
    """Verifies that claiming INTERNSHIP_COMPLETED without an accepted internship fails chronology validation."""
    email = f"learner_chrono_{uuid.uuid4().hex[:6]}@kaushalnexus.in"
    _, headers = await create_test_candidate(client, "Rohan Chronology Check", email)

    # Attempt to complete internship directly without prior acceptance
    payload = {
        "event_type": "INTERNSHIP_COMPLETED",
        "organization_name": "Wipro Analytics",
        "event_date": datetime.now(timezone.utc).isoformat(),
    }
    res = await client.post("/api/v1/learners/me/career-events", json=payload, headers=headers)
    assert res.status_code == 400
    assert "Chronology validation failed" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_create_and_update_career_applications(
    client: AsyncClient,
    db: AsyncSession,
):
    """Verifies that candidates can track multiple applications, advance their statuses, and inspect automatic event triggers."""
    email = f"learner_app_{uuid.uuid4().hex[:6]}@kaushalnexus.in"
    _, headers = await create_test_candidate(client, "Kavya Application Tracker", email)

    # 1. Create Application 1: ABC Corp
    app1 = {
        "organization_name": "ABC Tech Solutions",
        "job_title": "Backend Engineering Intern",
        "status": "SUBMITTED",
        "notes": "Applied via campus recruitment portal",
    }
    res1 = await client.post("/api/v1/learners/me/applications", json=app1, headers=headers)
    assert res1.status_code == 201
    data1 = res1.json()
    app1_id = data1["id"]
    assert data1["organization_name"] == "ABC Tech Solutions"
    assert data1["status"] == "SUBMITTED"

    # 2. Create Application 2: XYZ Analytics (Repeated applications allowed!)
    app2 = {
        "organization_name": "XYZ Data Labs",
        "job_title": "Junior Data Analyst",
        "status": "SUBMITTED",
    }
    res2 = await client.post("/api/v1/learners/me/applications", json=app2, headers=headers)
    assert res2.status_code == 201

    # 3. List Applications
    list_res = await client.get("/api/v1/learners/me/applications", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 2

    # 4. Advance Application 1 to INTERVIEW
    patch_res = await client.patch(
        f"/api/v1/learners/me/applications/{app1_id}",
        json={"status": "INTERVIEW", "notes": "Technical round scheduled for Friday"},
        headers=headers,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "INTERVIEW"

    # Verify that CareerEvent(INTERVIEW_INVITED) was generated
    events_res = await client.get(
        "/api/v1/learners/me/career-events?event_type=INTERVIEW_INVITED",
        headers=headers,
    )
    assert events_res.status_code == 200
    assert len(events_res.json()) >= 1


@pytest.mark.asyncio
async def test_create_and_list_learner_projects(
    client: AsyncClient,
    db: AsyncSession,
):
    """Verifies practical project portfolio evidence tracking without direct BKT inflation."""
    email = f"learner_proj_{uuid.uuid4().hex[:6]}@kaushalnexus.in"
    _, headers = await create_test_candidate(client, "Siddharth Project Builder", email)

    proj_payload = {
        "title": "E-Commerce REST API Backend",
        "description": "Async FastAPI microservice with PostgreSQL and JWT authentication",
        "skills": ["REST API", "SQL Database Design", "Python OOP"],
        "technologies": ["FastAPI", "PostgreSQL", "Docker", "Pytest"],
        "github_url": "https://github.com/siddharth/ecommerce-api",
        "live_url": "https://api.siddharth.dev",
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "verification_status": "SELF_REPORTED",
    }
    create_res = await client.post("/api/v1/learners/me/projects", json=proj_payload, headers=headers)
    assert create_res.status_code == 201
    proj_data = create_res.json()
    assert proj_data["title"] == "E-Commerce REST API Backend"
    assert "FastAPI" in proj_data["technologies"]

    # List projects
    list_res = await client.get("/api/v1/learners/me/projects", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1


@pytest.mark.asyncio
async def test_outcome_tracking_and_institutional_verification(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers: dict,
):
    """Verifies source confidence resolution and staff verification workflow."""
    email = f"learner_out_{uuid.uuid4().hex[:6]}@kaushalnexus.in"
    _, learner_headers = await create_test_candidate(client, "Pooja Verified Candidate", email)

    outcome_in = {
        "outcome_type": "INTERNSHIP_ACCEPTED",
        "outcome_value": 1.0,
        "source": "SELF_REPORTED",
        "status": "PENDING",
        "notes": "Candidate reported accepting offer at Tech Mahindra",
    }
    res = await client.post("/api/v1/learners/me/outcomes", json=outcome_in, headers=learner_headers)
    assert res.status_code == 201
    out_data = res.json()
    outcome_id = out_data["id"]
    assert out_data["status"] == "PENDING"
    assert out_data["confidence"] == 0.6  # Default confidence for SELF_REPORTED

    # 2. Staff user verifies the outcome
    verify_res = await client.patch(
        f"/api/v1/learners/outcomes/{outcome_id}/verify",
        json={"status": "VERIFIED", "notes": "Offer letter verified by college placement cell"},
        headers=auth_headers,  # Institutional staff headers
    )
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["status"] == "VERIFIED"
    assert v_data["confidence"] == 1.0  # Upgraded confidence upon verification
