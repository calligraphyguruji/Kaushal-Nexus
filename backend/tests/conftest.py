from datetime import date, datetime, timezone
from typing import AsyncGenerator, Dict, List
import uuid
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import AsyncSessionLocal, dispose_engine
from src.core.security import create_access_token, get_password_hash
from src.main import app
from src.models.competency import Competency, LearnerSkill
from src.models.district import District
from src.models.employer import Employer, HiringMandate
from src.models.learner import Learner
from src.models.placement import Placement, RetentionCheckpoint
from src.models.training_center import TrainingCenter
from src.models.user import User
from src.schemas.user import UserRole


# ==============================================================================
# HTTP Client & Database Session Fixtures
# ==============================================================================

@pytest_asyncio.fixture(scope="session")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Session-scoped async HTTP test client with pre-configured bypass headers
    to prevent test rate limiting.
    """
    transport = ASGITransport(app=app)
    headers = {"X-Test-Bypass-RateLimit": "1"}
    async with AsyncClient(
        transport=transport, base_url="http://testserver", headers=headers
    ) as async_client:
        yield async_client
    await dispose_engine()


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    """
    Function-scoped isolated database session that executes queries in a clean session.
    """
    async with AsyncSessionLocal() as session:
        yield session


# ==============================================================================
# Reusable Role-Based Authentication Fixtures
# ==============================================================================

async def _create_authenticated_user_header(
    client: AsyncClient, role: str, prefix: str = "user"
) -> Dict[str, str]:
    """Helper to register, authenticate, and return Authorization headers for any RBAC role."""
    unique_id = uuid.uuid4().hex[:6]
    email = f"{prefix}.{unique_id}@kaushalnexus.gov.in"
    password = "TestPassword2026!"

    # 1. Register User
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": f"Test {role.replace('_', ' ').title()}",
            "role": role,
        },
    )
    assert reg_resp.status_code == 201, f"Failed to register test user for role {role}: {reg_resp.text}"

    # 2. Login User
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200, f"Failed to login test user for role {role}: {login_resp.text}"
    token = login_resp.json()["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "X-Test-Bypass-RateLimit": "1",
    }


@pytest_asyncio.fixture(scope="session")
async def auth_headers(client: AsyncClient) -> Dict[str, str]:
    """Default fixture providing valid MSDE_OFFICER Bearer Authorization headers."""
    return await _create_authenticated_user_header(client, UserRole.MSDE_OFFICER.value, prefix="officer")


@pytest_asyncio.fixture(scope="session")
async def auth_headers_msde(client: AsyncClient) -> Dict[str, str]:
    """MSDE Central Officer authentication headers."""
    return await _create_authenticated_user_header(client, UserRole.MSDE_OFFICER.value, prefix="msde")


@pytest_asyncio.fixture(scope="session")
async def auth_headers_state_admin(client: AsyncClient) -> Dict[str, str]:
    """State Skill Development Mission (SSDM) Admin authentication headers."""
    return await _create_authenticated_user_header(client, UserRole.STATE_ADMIN.value, prefix="state")


@pytest_asyncio.fixture(scope="session")
async def auth_headers_tp(client: AsyncClient) -> Dict[str, str]:
    """Training Provider / Center Admin authentication headers."""
    return await _create_authenticated_user_header(client, UserRole.TRAINING_PROVIDER.value, prefix="tp")


@pytest_asyncio.fixture(scope="session")
async def auth_headers_employer(client: AsyncClient) -> Dict[str, str]:
    """Corporate Employer Partner authentication headers."""
    return await _create_authenticated_user_header(client, UserRole.EMPLOYER.value, prefix="employer")


@pytest_asyncio.fixture(scope="session")
async def auth_headers_evaluator(client: AsyncClient) -> Dict[str, str]:
    """Third-party Assessment Evaluator authentication headers."""
    return await _create_authenticated_user_header(client, UserRole.EVALUATOR.value, prefix="evaluator")


@pytest_asyncio.fixture(scope="session")
async def auth_headers_admin(client: AsyncClient) -> Dict[str, str]:
    """System Administrator authentication headers."""
    return await _create_authenticated_user_header(client, UserRole.SYSTEM_ADMIN.value, prefix="sysadmin")


# ==============================================================================
# Reusable Seed Data Factory Fixtures
# ==============================================================================

@pytest_asyncio.fixture
async def seed_district(db: AsyncSession) -> District:
    """Creates a temporary test district."""
    dist_id = f"TEST-DIST-{uuid.uuid4().hex[:6].upper()}"
    district = District(
        id=dist_id,
        name="Varanasi Test District",
        state="Uttar Pradesh",
        region="Eastern UP",
        tier="Tier 1",
        latitude=25.3176,
        longitude=82.9739,
    )
    db.add(district)
    await db.commit()
    await db.refresh(district)
    return district


@pytest_asyncio.fixture
async def seed_training_center(db: AsyncSession, seed_district: District) -> TrainingCenter:
    """Creates a temporary test training center."""
    tc = TrainingCenter(
        name="Kaushal Center of Excellence",
        center_code=f"TC-{uuid.uuid4().hex[:5].upper()}",
        district_id=seed_district.id,
        address="Sector 62, Skill City",
        is_active=True,
    )
    db.add(tc)
    await db.commit()
    await db.refresh(tc)
    return tc


@pytest_asyncio.fixture
async def seed_competencies(db: AsyncSession) -> List[Competency]:
    """Creates a set of standard test competencies."""
    u_suffix = uuid.uuid4().hex[:4].upper()
    comp_data = [
        ("Python Development", f"COMP-PY-{u_suffix}", "IT-ITeS", f"NQR-PY-{u_suffix}"),
        ("SQL Database Design", f"COMP-SQL-{u_suffix}", "IT-ITeS", f"NQR-SQL-{u_suffix}"),
        ("CNC Machine Operation", f"COMP-CNC-{u_suffix}", "Automotive & Manufacturing", f"NQR-CNC-{u_suffix}"),
        ("Solar Panel Installation", f"COMP-SOLAR-{u_suffix}", "Green Energy & Renewables", f"NQR-SOLAR-{u_suffix}"),
    ]
    created = []
    for name, code, sector, nqr in comp_data:
        comp = Competency(
            code=code,
            name=name,
            sector=sector,
            nqr_code=nqr,
        )
        db.add(comp)
        created.append(comp)
    await db.commit()
    for c in created:
        await db.refresh(c)
    return created


@pytest_asyncio.fixture
async def seed_learner(
    db: AsyncSession, seed_district: District, seed_training_center: TrainingCenter, seed_competencies: List[Competency]
) -> Learner:
    """Creates a test learner with linked competencies."""
    learner_id = f"KN-TEST-{uuid.uuid4().hex[:6].upper()}"
    learner = Learner(
        id=learner_id,
        full_name="Aarav Sharma",
        email=f"aarav.{uuid.uuid4().hex[:6]}@kaushalnexus.in",
        phone="+91-9123456789",
        education_level="Bachelor of Vocational Studies (B.Voc)",
        training_center_id=seed_training_center.id,
        district_id=seed_district.id,
        nsqf_level="NSQF Level 5",
        employment_readiness_score=85,
        overall_progress=90,
        ncvet_credential_id=f"NCVET-2026-{uuid.uuid4().hex[:5].upper()}",
        status="Assessment Passed",
    )
    db.add(learner)
    await db.flush()

    # Attach skills
    for comp in seed_competencies[:2]:
        skill = LearnerSkill(
            learner_id=learner.id,
            competency_id=comp.id,
            score_percentage=88,
            is_verified=True,
            verified_by="National Council for Vocational Education and Training",
            assessed_at=datetime.now(timezone.utc),
        )
        db.add(skill)

    await db.commit()
    await db.refresh(learner)
    return learner


@pytest_asyncio.fixture
async def seed_employer(db: AsyncSession) -> Employer:
    """Creates a verified employer partner."""
    emp = Employer(
        company_name="Apex Global Technologies",
        industry_sector="IT-ITeS",
        tier="Enterprise",
        contact_email=f"careers.{uuid.uuid4().hex[:6]}@apextech.com",
        contact_person="Rohan Mehra (VP Talent)",
        is_active=True,
    )
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    return emp


@pytest_asyncio.fixture
async def seed_hiring_mandate(
    db: AsyncSession, seed_employer: Employer, seed_district: District
) -> HiringMandate:
    """Creates an active employer hiring mandate."""
    mandate = HiringMandate(
        employer_id=seed_employer.id,
        job_title="Junior Python Software Engineer",
        sector="IT-ITeS",
        district_id=seed_district.id,
        state=seed_district.state,
        openings_count=15,
        min_nsqf_level="NSQF Level 5",
        required_competencies_json=["Python Development", "SQL Database Design", "Git & REST APIs"],
        salary_min_lpa=4.2,
        salary_max_lpa=5.8,
        retention_benchmark_days=180,
        is_active=True,
    )
    db.add(mandate)
    await db.commit()
    await db.refresh(mandate)
    return mandate


@pytest_asyncio.fixture
async def seed_placement(
    db: AsyncSession, seed_learner: Learner, seed_employer: Employer, seed_hiring_mandate: HiringMandate
) -> Placement:
    """Creates a placed candidate record with 3M, 6M, 12M checkpoints."""
    placement = Placement(
        learner_id=seed_learner.id,
        employer_id=seed_employer.id,
        hiring_mandate_id=seed_hiring_mandate.id,
        job_title=seed_hiring_mandate.job_title,
        joined_date=date(2026, 1, 15),
        starting_ctc_lpa=4.5,
        current_ctc_lpa=4.5,
        employment_type="Full-Time",
        status="Active",
        uan="101234567890",
        epfo_verification_status="VERIFIED",
        epfo_last_verified_at=datetime.now(timezone.utc),
        epfo_transaction_ref="EPFO-TXN-2026-9901",
    )
    db.add(placement)
    await db.flush()

    # Add 3M, 6M, 12M checkpoints
    checkpoints = [
        RetentionCheckpoint(
            placement_id=placement.id,
            checkpoint_type="3M",
            checkpoint_date=date(2026, 4, 15),
            is_active_at_checkpoint=True,
            epfo_verified=True,
            current_ctc_lpa=4.5,
            wage_increment_percentage=0.0,
            remarks="Completed 3-month milestone",
        ),
        RetentionCheckpoint(
            placement_id=placement.id,
            checkpoint_type="6M",
            checkpoint_date=date(2026, 7, 15),
            is_active_at_checkpoint=True,
            epfo_verified=True,
            current_ctc_lpa=5.0,
            wage_increment_percentage=11.11,
            remarks="6-month appraisal confirmed",
        ),
        RetentionCheckpoint(
            placement_id=placement.id,
            checkpoint_type="12M",
            checkpoint_date=date(2027, 1, 15),
            is_active_at_checkpoint=True,
            epfo_verified=False,
            current_ctc_lpa=5.0,
            wage_increment_percentage=11.11,
            remarks="Pending 12-month evaluation",
        ),
    ]
    for cp in checkpoints:
        db.add(cp)

    await db.commit()
    await db.refresh(placement)
    return placement
