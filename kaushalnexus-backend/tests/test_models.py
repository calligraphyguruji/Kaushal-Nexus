import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.core.database import AsyncSessionLocal
from src.models import Competency, District, Learner, LearnerSkill, TrainingCenter, User


@pytest.mark.asyncio
async def test_create_and_query_district_and_training_center():
    """Verify district creation and training center relationship."""
    async with AsyncSessionLocal() as session:
        district_id = f"UP-TEST-{uuid.uuid4().hex[:6]}"
        district = District(
            id=district_id,
            name="Test District",
            state="Uttar Pradesh",
            region="Eastern UP",
            tier="Tier 1",
            latitude=25.3176,
            longitude=82.9739,
        )
        session.add(district)
        await session.flush()

        center = TrainingCenter(
            center_code=f"PMKK-TEST-{uuid.uuid4().hex[:6]}",
            name="National Skill Academy Varanasi",
            district_id=district.id,
            address="Skill Complex, Varanasi",
        )
        session.add(center)
        await session.commit()

        # Query back
        stmt = select(District).where(District.id == district_id)
        result = await session.execute(stmt)
        queried_district = result.scalar_one()
        assert queried_district.name == "Test District"
        assert queried_district.tier == "Tier 1"


@pytest.mark.asyncio
async def test_create_learner_with_competency_and_skills():
    """Verify learner creation, competency mapping, and skill scores."""
    async with AsyncSessionLocal() as session:
        district_id = f"UP-TEST-{uuid.uuid4().hex[:6]}"
        district = District(
            id=district_id,
            name="Varanasi Central",
            state="Uttar Pradesh",
            region="Eastern UP",
            tier="Tier 1",
        )
        session.add(district)
        await session.flush()

        learner_id = f"KN-TEST-{uuid.uuid4().hex[:6]}"
        learner = Learner(
            id=learner_id,
            full_name="Ritesh Kumar Patel",
            email=f"ritesh.{uuid.uuid4().hex[:6]}@example.com",
            phone="+91 98765 43210",
            education_level="B.Sc Computer Science",
            district_id=district.id,
            nsqf_level="NSQF Level 5",
            employment_readiness_score=88,
            overall_progress=92,
            ncvet_credential_id="NCVET-2026-9901",
            status="In Training",
        )
        session.add(learner)

        competency = Competency(
            code=f"COMP-PY-{uuid.uuid4().hex[:6]}",
            name="Python for Data Analytics",
            sector="Data Analytics",
            nqr_code="NQR-2026-PY01",
        )
        session.add(competency)
        await session.flush()

        learner_skill = LearnerSkill(
            learner_id=learner.id,
            competency_id=competency.id,
            score_percentage=94,
            verified_by="NCVET Accredited Assessment Agency",
            is_verified=True,
            assessed_at=datetime.now(timezone.utc),
        )
        session.add(learner_skill)
        await session.commit()

        # Query back
        stmt = select(Learner).where(Learner.id == learner_id)
        result = await session.execute(stmt)
        queried_learner = result.scalar_one()
        assert queried_learner.full_name == "Ritesh Kumar Patel"
        assert queried_learner.employment_readiness_score == 88


@pytest.mark.asyncio
async def test_learner_unique_email_constraint():
    """Verify unique constraint on learner email."""
    async with AsyncSessionLocal() as session:
        district_id = f"UP-TEST-{uuid.uuid4().hex[:6]}"
        district = District(
            id=district_id,
            name="Lucknow District",
            state="Uttar Pradesh",
            region="Central UP",
            tier="Tier 1",
        )
        session.add(district)
        await session.flush()

        shared_email = f"duplicate.{uuid.uuid4().hex[:6]}@example.com"
        l1 = Learner(
            id=f"KN-TEST-{uuid.uuid4().hex[:6]}",
            full_name="User One",
            email=shared_email,
            district_id=district.id,
            status="In Training",
        )
        session.add(l1)
        await session.commit()

        l2 = Learner(
            id=f"KN-TEST-{uuid.uuid4().hex[:6]}",
            full_name="User Two",
            email=shared_email,
            district_id=district.id,
            status="In Training",
        )
        session.add(l2)
        with pytest.raises(IntegrityError):
            await session.commit()
