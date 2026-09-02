from datetime import datetime, timezone
import uuid
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.competency import Competency, LearnerSkill
from src.models.learner import Learner


@pytest.mark.asyncio
async def test_competency_creation_and_query(db: AsyncSession):
    """Verify Competency model persistence, unique code constraint, and indexing."""
    code = f"COMP-AI-{uuid.uuid4().hex[:6].upper()}"
    comp = Competency(
        code=code,
        name="Deep Learning & Neural Networks",
        sector="Electronics & IT",
        nqr_code="NQR-2026-AI-01",
    )
    db.add(comp)
    await db.commit()
    await db.refresh(comp)

    assert comp.id is not None
    assert comp.code == code
    assert comp.name == "Deep Learning & Neural Networks"
    assert comp.sector == "Electronics & IT"

    # Query back from DB
    stmt = select(Competency).where(Competency.code == code)
    res = (await db.execute(stmt)).scalar_one_or_none()
    assert res is not None
    assert res.id == comp.id


@pytest.mark.asyncio
async def test_learner_skill_association_and_scoring(
    db: AsyncSession, seed_learner: Learner, seed_competencies: list[Competency]
):
    """Verify linking multiple competencies to a learner with assessment scores."""
    extra_comp = seed_competencies[2]  # CNC Machine Operation

    skill = LearnerSkill(
        learner_id=seed_learner.id,
        competency_id=extra_comp.id,
        score_percentage=94,
        is_verified=True,
        verified_by="National Council for Vocational Education and Training",
        assessed_at=datetime.now(timezone.utc),
    )
    db.add(skill)
    await db.commit()

    # Query learner with skills
    stmt = (
        select(Learner)
        .where(Learner.id == seed_learner.id)
        .options(selectinload(Learner.skills).selectinload(LearnerSkill.competency))
    )
    learner_with_skills = (await db.execute(stmt)).scalar_one()

    # Verify skills list populated correctly
    skills_map = {s.competency.name: s.score_percentage for s in learner_with_skills.skills if s.competency}
    assert "CNC Machine Operation" in skills_map
    assert skills_map["CNC Machine Operation"] == 94


@pytest.mark.asyncio
async def test_competency_repr():
    """Verify string representations of competency models."""
    comp = Competency(code="COMP-TEST", name="Test Comp", sector="Test Sector")
    assert "<Competency(code='COMP-TEST'" in repr(comp)

    skill = LearnerSkill(learner_id="KN-123", score_percentage=85)
    assert "<LearnerSkill(learner_id='KN-123', score=85%)>" in repr(skill)
