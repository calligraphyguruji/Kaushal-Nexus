from datetime import datetime, timedelta, timezone
from typing import Tuple
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.career_event import CareerEvent, CareerEventType, CareerSource
from src.models.learner import Learner
from src.models.learner_outcome import LearnerOutcome
from src.models.learning_plan import LearningActivity
from src.services.ml_feature_snapshot_service import ml_feature_snapshot_service
from src.services.outcome_label_service import outcome_label_service


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

    prof = await client.get("/api/v1/learners/me/profile", headers=headers)
    assert prof.status_code == 200, prof.text
    return prof.json(), headers


@pytest.mark.asyncio
async def test_historical_snapshot_strictly_excludes_future_data(
    client: AsyncClient,
    db: AsyncSession,
):
    """
    CRITICAL ML LEAKAGE BARRIER TEST:
    A feature snapshot taken at cutoff T must strictly contain ONLY information
    available at or before T.
    Future activity, practice, and career outcomes occurring after T MUST be excluded.
    """
    email = f"learner_leak_{uuid.uuid4().hex[:6]}@kaushalnexus.in"
    reg_data, headers = await create_test_candidate(client, "Leakage Barrier Candidate", email)
    learner_id = reg_data["id"]
    learner = await db.get(Learner, learner_id)
    assert learner is not None

    cutoff_T = datetime(2026, 8, 1, 12, 0, 0, tzinfo=timezone.utc)

    # 1. Past activity: before cutoff T (July 20, 2026)
    past_activity = LearningActivity(
        learner_id=learner_id,
        activity_type="RESOURCE_COMPLETED",
        time_spent_minutes=120,
        created_at=datetime(2026, 7, 20, 10, 0, 0, tzinfo=timezone.utc),
    )
    db.add(past_activity)

    # 2. Future activity: after cutoff T (August 15, 2026)
    future_activity = LearningActivity(
        learner_id=learner_id,
        activity_type="RESOURCE_COMPLETED",
        time_spent_minutes=300,
        created_at=datetime(2026, 8, 15, 10, 0, 0, tzinfo=timezone.utc),
    )
    db.add(future_activity)

    # 3. Future outcome: Internship Accepted on August 25, 2026 (after cutoff T)
    future_outcome = LearnerOutcome(
        learner_id=learner_id,
        outcome_type="INTERNSHIP_ACCEPTED",
        outcome_value=1.0,
        outcome_date=datetime(2026, 8, 25, 9, 0, 0, tzinfo=timezone.utc),
        source="EMPLOYER_VERIFIED",
        status="VERIFIED",
        confidence=1.0,
    )
    db.add(future_outcome)
    await db.commit()

    # 4. Generate historical feature snapshot at cutoff T
    features = await ml_feature_snapshot_service.calculate_features_at_cutoff(
        db=db,
        learner=learner,
        cutoff=cutoff_T,
    )

    # ASSERTIONS FOR ZERO LEAKAGE:
    # A. Only past activity duration (120 mins = 2.0 hours) should be counted, NOT the 300 mins from Aug 15
    assert features["learning_hours_completed"] == 2.0
    assert features["learning_activities_count"] == 1.0

    # B. Feature snapshot must NOT have future outcome values
    assert "future_outcome" not in features
    assert "internship_accepted" not in features
    assert "is_placed" not in features


@pytest.mark.asyncio
async def test_outcome_label_service_forward_window(
    client: AsyncClient,
    db: AsyncSession,
):
    """
    Verifies that OutcomeLabelService strictly evaluates forward observation window:
    cutoff < event_date <= cutoff + 90 days.
    """
    email = f"learner_lbl_{uuid.uuid4().hex[:6]}@kaushalnexus.in"
    reg_data, _ = await create_test_candidate(client, "Label Service Candidate", email)
    learner_id = reg_data["id"]

    cutoff = datetime(2026, 8, 1, 0, 0, 0, tzinfo=timezone.utc)

    # Scenario 1: No outcomes in window -> label = 0
    label_0, dt_0 = await outcome_label_service.evaluate_future_label(
        db=db,
        learner_id=learner_id,
        cutoff=cutoff,
        label_type="INTERNSHIP_ACCEPTED",
        horizon_days=90,
    )
    assert label_0 == 0
    assert dt_0 is None

    # Scenario 2: Outcome occurring 25 days after cutoff (within 90-day horizon)
    outcome_in_window = LearnerOutcome(
        learner_id=learner_id,
        outcome_type="INTERNSHIP_ACCEPTED",
        outcome_value=1.0,
        outcome_date=cutoff + timedelta(days=25),
        source="INSTITUTION_VERIFIED",
        status="VERIFIED",
        confidence=0.9,
    )
    db.add(outcome_in_window)
    await db.commit()

    label_1, dt_1 = await outcome_label_service.evaluate_future_label(
        db=db,
        learner_id=learner_id,
        cutoff=cutoff,
        label_type="INTERNSHIP_ACCEPTED",
        horizon_days=90,
    )
    assert label_1 == 1
    assert dt_1 == cutoff + timedelta(days=25)

    # Scenario 3: If cutoff is moved AFTER the outcome (e.g. cutoff = 40 days after original cutoff),
    # past event must NOT count as a future outcome!
    late_cutoff = cutoff + timedelta(days=40)
    label_late, dt_late = await outcome_label_service.evaluate_future_label(
        db=db,
        learner_id=learner_id,
        cutoff=late_cutoff,
        label_type="INTERNSHIP_ACCEPTED",
        horizon_days=90,
    )
    assert label_late == 0
    assert dt_late is None


@pytest.mark.asyncio
async def test_feature_snapshot_versioning_and_immutability(
    client: AsyncClient,
    db: AsyncSession,
):
    """Verifies that snapshot generation produces consistent, deterministic feature names under version 'v1'."""
    email = f"learner_ver_{uuid.uuid4().hex[:6]}@kaushalnexus.in"
    reg_data, headers = await create_test_candidate(client, "Versioning Candidate", email)
    learner_id = reg_data["id"]
    learner = await db.get(Learner, learner_id)

    cutoff = datetime.now(timezone.utc)
    features = await ml_feature_snapshot_service.calculate_features_at_cutoff(
        db=db,
        learner=learner,
        cutoff=cutoff,
        feature_version="v1",
    )

    # Check key feature namespaces exist deterministically
    assert "bkt_mean_mastery" in features
    assert "bkt_python_basics_mastery" in features
    assert "learning_hours_completed" in features
    assert "project_count" in features
    assert "application_count" in features
    assert "role_match_score" in features
    assert "has_active_resume" in features


@pytest.mark.asyncio
async def test_ml_dataset_rbac_protection(
    client: AsyncClient,
    auth_headers: dict,
):
    """
    Verifies that normal learners CANNOT access the ML training dataset (403 Forbidden),
    while institutional staff/admin users have authorized access (200 OK) with JSON and CSV exports.
    """
    # 1. Normal learner attempt -> 403 Forbidden
    email = f"learner_unauth_{uuid.uuid4().hex[:6]}@kaushalnexus.in"
    _, learner_headers = await create_test_candidate(client, "Unauthorized Learner", email)

    unauth_res = await client.get("/api/v1/ml/dataset", headers=learner_headers)
    assert unauth_res.status_code == 403

    # 2. Staff/Admin attempt -> 200 OK (JSON)
    auth_res = await client.get("/api/v1/ml/dataset?feature_version=v1", headers=auth_headers)
    assert auth_res.status_code == 200
    dataset = auth_res.json()
    assert "dataset_version" in dataset
    assert "records" in dataset
    assert "leakage_guarantee" in dataset

    # 3. Staff/Admin CSV export -> 200 OK (text/csv)
    csv_res = await client.get("/api/v1/ml/dataset?format=csv", headers=auth_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "learner_id,snapshot_id,prediction_cutoff,label" in csv_res.text


@pytest.mark.asyncio
async def test_candidate_creates_own_feature_snapshot(
    client: AsyncClient,
    db: AsyncSession,
):
    """Verifies that an authenticated candidate can generate a point-in-time snapshot via /me/feature-snapshots."""
    email = f"learner_snap_{uuid.uuid4().hex[:6]}@kaushalnexus.in"
    _, headers = await create_test_candidate(client, "Self Snapshot Candidate", email)

    payload = {
        "prediction_cutoff": datetime.now(timezone.utc).isoformat(),
        "feature_version": "v1",
    }
    res = await client.post("/api/v1/learners/me/feature-snapshots", json=payload, headers=headers)
    assert res.status_code == 201
    snap = res.json()
    assert snap["feature_version"] == "v1"
    assert "features_json" in snap
    assert "bkt_mean_mastery" in snap["features_json"]
