import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.competency import Competency, LearnerSkill
from src.models.district import District
from src.models.employer import Employer, HiringMandate
from src.models.learner import Learner
from src.models.placement import Placement
from src.models.training_center import TrainingCenter
from src.models.user import User
from src.schemas.user import UserRole


import pytest_asyncio

# ==============================================================================
# Dedicated Fixtures for Scope & Object Authorization Testing
# ==============================================================================

@pytest_asyncio.fixture
async def multi_state_seed(db: AsyncSession):
    """
    Seeds a rich multi-state ecosystem:
    - UP District (UP-TEST-VARANASI) with Training Center A (TC-VARANASI)
    - MH District (MH-TEST-PUNE) with Training Center B (TC-PUNE)
    - Employer (TechCorp Systems)
    - Learner 1 (UP, TC-VARANASI, placed at TechCorp)
    - Learner 2 (UP, TC-VARANASI, not placed)
    - Learner 3 (MH, TC-PUNE, not placed)
    """
    u = uuid.uuid4().hex[:6].upper()

    # 1. UP District & Center
    dist_up = District(
        id=f"UP-TEST-{u}",
        name=f"Varanasi Hardening {u}",
        state="Uttar Pradesh",
        region="Eastern UP",
        tier="Tier 1",
    )
    db.add(dist_up)

    tc_up = TrainingCenter(
        center_code=f"PMKK-UP-{u}",
        name="Varanasi Apex Training Hub",
        district_id=dist_up.id,
    )
    db.add(tc_up)

    # 2. MH District & Center
    dist_mh = District(
        id=f"MH-TEST-{u}",
        name=f"Pune Hardening {u}",
        state="Maharashtra",
        region="Western Maharashtra",
        tier="Tier 1",
    )
    db.add(dist_mh)

    tc_mh = TrainingCenter(
        center_code=f"PMKK-MH-{u}",
        name="Pune Skill Academy",
        district_id=dist_mh.id,
    )
    db.add(tc_mh)

    # 3. Competency
    comp = Competency(
        code=f"COMP-HARD-{u}",
        name="Cloud Infrastructure & Security",
        sector="IT-ITeS",
        nqr_code=f"NQR-HARD-{u}",
    )
    db.add(comp)

    # 4. Employer
    employer = Employer(
        company_name="TechCorp Systems India",
        industry_sector="IT-ITeS",
        contact_email=f"talent.techcorp.{u.lower()}@techcorp.com",
        is_active=True,
    )
    db.add(employer)
    await db.flush()

    # 5. Learners
    l_up_placed = Learner(
        id=f"KN-UP-PLACED-{u}",
        full_name="Aarav UP Placed",
        email=f"aarav.placed.{u.lower()}@example.com",
        phone="+91 98765 43210",
        district_id=dist_up.id,
        training_center_id=tc_up.id,
        status="Placed & Verified",
        employment_readiness_score=92,
        overall_progress=100,
        ncvet_credential_id=f"NCVET-UP-{u}",
    )
    db.add(l_up_placed)

    l_up_unplaced = Learner(
        id=f"KN-UP-UNPLACED-{u}",
        full_name="Pooja UP Unplaced",
        email=f"pooja.unplaced.{u.lower()}@example.com",
        phone="+91 98765 11111",
        district_id=dist_up.id,
        training_center_id=tc_up.id,
        status="In Training",
        employment_readiness_score=45,
        overall_progress=40,
    )
    db.add(l_up_unplaced)

    l_mh_candidate = Learner(
        id=f"KN-MH-CANDIDATE-{u}",
        full_name="Vikram MH Candidate",
        email=f"vikram.mh.{u.lower()}@example.com",
        phone="+91 98765 22222",
        district_id=dist_mh.id,
        training_center_id=tc_mh.id,
        status="In Training",
        employment_readiness_score=50,
        overall_progress=50,
    )
    db.add(l_mh_candidate)
    await db.flush()

    # Placement for Learner 1 with Employer
    from datetime import date
    placement = Placement(
        learner_id=l_up_placed.id,
        employer_id=employer.id,
        job_title="Associate Cloud Engineer",
        joined_date=date(2026, 1, 15),
        starting_ctc_lpa=4.5,
        current_ctc_lpa=4.5,
        status="Active",
    )
    db.add(placement)

    await db.commit()

    return {
        "dist_up": dist_up,
        "dist_mh": dist_mh,
        "tc_up": tc_up,
        "tc_mh": tc_mh,
        "employer": employer,
        "comp": comp,
        "l_up_placed": l_up_placed,
        "l_up_unplaced": l_up_unplaced,
        "l_mh_candidate": l_mh_candidate,
    }


# ==============================================================================
# 1. Object-Level Authorization Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_learner_object_auth_msde_officer_national(
    client: AsyncClient,
    auth_headers_msde: dict,
    multi_state_seed: dict,
):
    """MSDE Officer has unrestricted national access across all states."""
    l_up = multi_state_seed["l_up_placed"]
    l_mh = multi_state_seed["l_mh_candidate"]

    resp_up = await client.get(f"/api/v1/learners/{l_up.id}", headers=auth_headers_msde)
    assert resp_up.status_code == 200
    assert resp_up.json()["id"] == l_up.id

    resp_mh = await client.get(f"/api/v1/learners/{l_mh.id}", headers=auth_headers_msde)
    assert resp_mh.status_code == 200
    assert resp_mh.json()["id"] == l_mh.id


@pytest.mark.asyncio
async def test_learner_object_auth_state_admin_scope(
    client: AsyncClient,
    multi_state_seed: dict,
):
    """State Admin (UP) can view UP learner but receives 403 Forbidden for MH learner."""
    # Register/login UP State Admin
    u_suffix = uuid.uuid4().hex[:6]
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"state.up.{u_suffix}@kaushalnexus.gov.in",
            "password": "Password123!",
            "full_name": "UP State Administrator",
            "role": UserRole.STATE_ADMIN.value,
        },
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": f"state.up.{u_suffix}@kaushalnexus.gov.in", "password": "Password123!"},
    )
    headers_up = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    l_up = multi_state_seed["l_up_placed"]
    l_mh = multi_state_seed["l_mh_candidate"]

    # 1. Allowed: UP Learner
    resp_up = await client.get(f"/api/v1/learners/{l_up.id}", headers=headers_up)
    assert resp_up.status_code == 200
    assert resp_up.json()["state"] == "Uttar Pradesh"

    # 2. Denied: MH Learner -> 403 Forbidden
    resp_mh = await client.get(f"/api/v1/learners/{l_mh.id}", headers=headers_up)
    assert resp_mh.status_code == 403
    assert resp_mh.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_learner_object_auth_training_provider_scope(
    client: AsyncClient,
    multi_state_seed: dict,
):
    """Training Provider can access candidates in their center, but is denied for others."""
    # Register/login Varanasi Training Provider
    u_suffix = uuid.uuid4().hex[:6]
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"head.varanasi.{u_suffix}@pmkk.org",
            "password": "Password123!",
            "full_name": "Varanasi Center Head",
            "role": UserRole.TRAINING_PROVIDER.value,
        },
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": f"head.varanasi.{u_suffix}@pmkk.org", "password": "Password123!"},
    )
    headers_tp = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    l_up = multi_state_seed["l_up_placed"]
    l_mh = multi_state_seed["l_mh_candidate"]

    # Allowed: Associated Center Candidate
    resp_up = await client.get(f"/api/v1/learners/{l_up.id}", headers=headers_tp)
    assert resp_up.status_code == 200

    # Denied: Candidate from different center -> 403 Forbidden
    resp_mh = await client.get(f"/api/v1/learners/{l_mh.id}", headers=headers_tp)
    assert resp_mh.status_code == 403


@pytest.mark.asyncio
async def test_learner_object_auth_employer_scope(
    client: AsyncClient,
    multi_state_seed: dict,
):
    """Employer can access candidates with placements/matching status, denied for unrelated candidates."""
    employer = multi_state_seed["employer"]
    u_suffix = uuid.uuid4().hex[:6]
    emp_email = f"talent.techcorp.{u_suffix}@techcorp.com"

    await client.post(
        "/api/v1/auth/register",
        json={
            "email": emp_email,
            "password": "Password123!",
            "full_name": "TechCorp Talent Head",
            "role": UserRole.EMPLOYER.value,
        },
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": emp_email, "password": "Password123!"},
    )
    headers_emp = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    l_placed = multi_state_seed["l_up_placed"]
    l_unplaced = multi_state_seed["l_up_unplaced"]

    # 1. Allowed: Placed Candidate
    resp_placed = await client.get(f"/api/v1/learners/{l_placed.id}", headers=headers_emp)
    assert resp_placed.status_code == 200
    assert resp_placed.json()["id"] == l_placed.id

    # 2. Denied: Unrelated unplaced candidate -> 403 Forbidden
    resp_unplaced = await client.get(f"/api/v1/learners/{l_unplaced.id}", headers=headers_emp)
    assert resp_unplaced.status_code == 403


@pytest.mark.asyncio
async def test_learner_object_auth_sysadmin_unrestricted(
    client: AsyncClient,
    auth_headers_admin: dict,
    multi_state_seed: dict,
):
    """SYSTEM_ADMIN has full operational access across all states and candidates."""
    l_up = multi_state_seed["l_up_placed"]
    l_mh = multi_state_seed["l_mh_candidate"]

    resp1 = await client.get(f"/api/v1/learners/{l_up.id}", headers=auth_headers_admin)
    assert resp1.status_code == 200

    resp2 = await client.get(f"/api/v1/learners/{l_mh.id}", headers=auth_headers_admin)
    assert resp2.status_code == 200


# ==============================================================================
# 2. Learner List Scoping Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_learner_list_scoping_state_admin(
    client: AsyncClient,
    multi_state_seed: dict,
):
    """State Admin retrieves only learners in their state, cross-state district filter returns 403."""
    u_suffix = uuid.uuid4().hex[:6]
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"state.up.list.{u_suffix}@kaushalnexus.gov.in",
            "password": "Password123!",
            "full_name": "UP State Administrator",
            "role": UserRole.STATE_ADMIN.value,
        },
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": f"state.up.list.{u_suffix}@kaushalnexus.gov.in", "password": "Password123!"},
    )
    headers_up = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    dist_mh = multi_state_seed["dist_mh"]

    # 1. Scoped listing returns candidates in UP
    resp = await client.get("/api/v1/learners", headers=headers_up)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) >= 1

    # 2. Querying a district outside authorized state returns 403 Forbidden
    resp_cross_state = await client.get(
        f"/api/v1/learners?district_id={dist_mh.id}",
        headers=headers_up,
    )
    assert resp_cross_state.status_code == 403


# ==============================================================================
# 3. Sensitive Field Filtering & PII Masking Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_pii_masking_for_employer_and_evaluator(
    client: AsyncClient,
    auth_headers_msde: dict,
    multi_state_seed: dict,
):
    """Verify phone and email are masked for employer, while MSDE officer receives unmasked dossier."""
    employer = multi_state_seed["employer"]
    u_suffix = uuid.uuid4().hex[:6]

    await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"recruiter.{u_suffix}@{employer.contact_email.split('@')[-1]}",
            "password": "Password123!",
            "full_name": "TechCorp Recruiter",
            "role": UserRole.EMPLOYER.value,
        },
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": f"recruiter.{u_suffix}@{employer.contact_email.split('@')[-1]}", "password": "Password123!"},
    )
    headers_emp = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    l_placed = multi_state_seed["l_up_placed"]

    # 1. Employer receives masked contact details
    resp_emp = await client.get(f"/api/v1/learners/{l_placed.id}", headers=headers_emp)
    assert resp_emp.status_code == 200
    emp_dossier = resp_emp.json()
    assert "XXXXX" in emp_dossier["phone"]
    assert "***@" in emp_dossier["email"]

    # 2. MSDE Officer receives full plaintext contact details
    resp_msde = await client.get(f"/api/v1/learners/{l_placed.id}", headers=auth_headers_msde)
    assert resp_msde.status_code == 200
    msde_dossier = resp_msde.json()
    assert msde_dossier["phone"] == "+91 98765 43210"
    assert msde_dossier["email"] == l_placed.email


# ==============================================================================
# 4. Dashboard & Analytics Scoping Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_dashboard_scoping_state_admin(
    client: AsyncClient,
    multi_state_seed: dict,
):
    """State Admin can access own-state district metrics, but is rejected for cross-state district."""
    u_suffix = uuid.uuid4().hex[:6]
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"state.up.dash.{u_suffix}@kaushalnexus.gov.in",
            "password": "Password123!",
            "full_name": "UP State Administrator",
            "role": UserRole.STATE_ADMIN.value,
        },
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": f"state.up.dash.{u_suffix}@kaushalnexus.gov.in", "password": "Password123!"},
    )
    headers_up = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    dist_up = multi_state_seed["dist_up"]
    dist_mh = multi_state_seed["dist_mh"]

    # 1. Own district summary -> 200 OK
    resp_own = await client.get(
        f"/api/v1/dashboard/summary?district_id={dist_up.id}",
        headers=headers_up,
    )
    assert resp_own.status_code == 200

    # 2. Foreign district summary -> 403 Forbidden
    resp_foreign = await client.get(
        f"/api/v1/dashboard/summary?district_id={dist_mh.id}",
        headers=headers_up,
    )
    assert resp_foreign.status_code == 403


@pytest.mark.asyncio
async def test_skill_gap_scoping_state_admin(
    client: AsyncClient,
    multi_state_seed: dict,
):
    """State Admin can query own district skill gaps, rejected for other state district."""
    u_suffix = uuid.uuid4().hex[:6]
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"state.up.sg.{u_suffix}@kaushalnexus.gov.in",
            "password": "Password123!",
            "full_name": "UP State Administrator",
            "role": UserRole.STATE_ADMIN.value,
        },
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": f"state.up.sg.{u_suffix}@kaushalnexus.gov.in", "password": "Password123!"},
    )
    headers_up = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    dist_up = multi_state_seed["dist_up"]
    dist_mh = multi_state_seed["dist_mh"]

    # 1. Own district -> 200 OK
    resp_own = await client.get(
        f"/api/v1/skill-gaps/priority?district_id={dist_up.id}",
        headers=headers_up,
    )
    assert resp_own.status_code == 200

    # 2. Other state district -> 403 Forbidden
    resp_foreign = await client.get(
        f"/api/v1/skill-gaps/priority?district_id={dist_mh.id}",
        headers=headers_up,
    )
    assert resp_foreign.status_code == 403


# ==============================================================================
# 5. AI Endpoint Object Authorization Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_ai_skill_gap_analysis_candidate_scope(
    client: AsyncClient,
    multi_state_seed: dict,
):
    """AI analysis endpoint enforces object authorization when learner_id is provided."""
    u_suffix = uuid.uuid4().hex[:6]
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"state.up.ai.{u_suffix}@kaushalnexus.gov.in",
            "password": "Password123!",
            "full_name": "UP State Administrator",
            "role": UserRole.STATE_ADMIN.value,
        },
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": f"state.up.ai.{u_suffix}@kaushalnexus.gov.in", "password": "Password123!"},
    )
    headers_up = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    l_up = multi_state_seed["l_up_placed"]
    l_mh = multi_state_seed["l_mh_candidate"]

    # 1. Authorized candidate (UP) -> 200 OK
    payload_auth = {
        "learner_id": l_up.id,
        "full_name": "Aarav UP Placed",
        "target_occupation": "Cloud DevOps Engineer",
    }
    resp_auth = await client.post(
        "/api/v1/ai/skill-gap-analysis",
        json=payload_auth,
        headers=headers_up,
    )
    assert resp_auth.status_code == 200
    data = resp_auth.json()
    assert "skill_gaps" in data
    assert "roadmap" in data

    # 2. Unauthorized candidate (MH) -> 403 Forbidden
    payload_unauth = {
        "learner_id": l_mh.id,
        "full_name": "Vikram MH Candidate",
        "target_occupation": "Cloud DevOps Engineer",
    }
    resp_unauth = await client.post(
        "/api/v1/ai/skill-gap-analysis",
        json=payload_unauth,
        headers=headers_up,
    )
    assert resp_unauth.status_code == 403
