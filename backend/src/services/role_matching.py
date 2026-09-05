from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import NotFoundException
from src.core.logging import logger
from src.ml.bkt import bkt_engine
from src.models.assessment import LearnerSkillMastery
from src.models.competency import Competency
from src.models.learner import Learner
from src.models.role import Role, RoleRequirement
from src.schemas.learner_intelligence_dto import (
    LearnerRoleMatchesResponseDTO,
    RoleDetailDTO,
    RoleListItemDTO,
    RoleMatchResultDTO,
    RoleMatchSkillDetailDTO,
    RoleRequirementItemDTO,
)


class RoleMatchingService:
    """
    Deterministic Role Matching & Competency Gap Engine.
    Evaluates candidate's real-time Bayesian Knowledge Tracing (BKT) mastery states
    against database-driven role standards and multi-attribute requirement weights.
    """

    STANDARD_ROLES_CONFIG = [
        {
            "code": "ROLE-PY-DEV",
            "title": "Python Developer Intern",
            "sector": "IT-ITeS",
            "description": "Build high-performance Python microservices, APIs, and data processing pipelines.",
            "min_experience_years": 0.0,
            "requirements": [
                {"code": "COMP-PY-BASE", "req": 0.80, "importance": "CRITICAL", "weight": 2.5},
                {"code": "COMP-PY-OOP", "req": 0.70, "importance": "CRITICAL", "weight": 2.0},
                {"code": "COMP-SQL-CORE", "req": 0.65, "importance": "IMPORTANT", "weight": 1.5},
                {"code": "COMP-GIT-VCS", "req": 0.60, "importance": "IMPORTANT", "weight": 1.0},
                {"code": "COMP-REST-API", "req": 0.60, "importance": "IMPORTANT", "weight": 1.5},
            ],
        },
        {
            "code": "ROLE-DATA-ANALYST",
            "title": "Data Analyst Intern",
            "sector": "IT-ITeS",
            "description": "Analyze operational datasets, craft SQL queries, and build analytical reports.",
            "min_experience_years": 0.0,
            "requirements": [
                {"code": "COMP-PY-BASE", "req": 0.75, "importance": "CRITICAL", "weight": 2.0},
                {"code": "COMP-SQL-CORE", "req": 0.85, "importance": "CRITICAL", "weight": 3.0},
                {"code": "COMP-GIT-VCS", "req": 0.50, "importance": "NICE_TO_HAVE", "weight": 1.0},
                {"code": "COMP-DSA-CORE", "req": 0.55, "importance": "IMPORTANT", "weight": 1.5},
            ],
        },
        {
            "code": "ROLE-FULLSTACK-WEB",
            "title": "Full Stack Web Developer",
            "sector": "IT-ITeS",
            "description": "Develop full-stack web applications connecting React frontends with secure backend services.",
            "min_experience_years": 0.0,
            "requirements": [
                {"code": "COMP-PY-BASE", "req": 0.75, "importance": "CRITICAL", "weight": 1.5},
                {"code": "COMP-REST-API", "req": 0.80, "importance": "CRITICAL", "weight": 2.5},
                {"code": "COMP-SQL-CORE", "req": 0.70, "importance": "CRITICAL", "weight": 2.0},
                {"code": "COMP-GIT-VCS", "req": 0.65, "importance": "IMPORTANT", "weight": 1.5},
                {"code": "COMP-DSA-CORE", "req": 0.60, "importance": "IMPORTANT", "weight": 1.5},
            ],
        },
        {
            "code": "ROLE-SWE-TRAINEE",
            "title": "Software Engineer Trainee",
            "sector": "IT-ITeS",
            "description": "Enterprise software engineering training covering data structures, OOP design, and systems.",
            "min_experience_years": 0.0,
            "requirements": [
                {"code": "COMP-PY-BASE", "req": 0.80, "importance": "CRITICAL", "weight": 2.0},
                {"code": "COMP-PY-OOP", "req": 0.75, "importance": "CRITICAL", "weight": 2.0},
                {"code": "COMP-DSA-CORE", "req": 0.75, "importance": "CRITICAL", "weight": 2.5},
                {"code": "COMP-GIT-VCS", "req": 0.60, "importance": "IMPORTANT", "weight": 1.0},
                {"code": "COMP-SQL-CORE", "req": 0.60, "importance": "IMPORTANT", "weight": 1.5},
                {"code": "COMP-REST-API", "req": 0.60, "importance": "IMPORTANT", "weight": 1.5},
            ],
        },
    ]

    @classmethod
    async def ensure_standard_roles_seeded(cls, db: AsyncSession) -> None:
        """Seeds default competencies, roles, and role_requirements in DB if not present."""
        # 1. Ensure standard competencies exist in dictionary
        comp_res = await db.execute(select(Competency))
        all_comps = comp_res.scalars().all()
        comp_by_code = {c.code: c for c in all_comps}
        comp_by_name = {c.name.lower(): c for c in all_comps}

        default_competencies = {
            "COMP-PY-BASE": ("Python Basics", "IT-ITeS"),
            "COMP-PY-OOP": ("Python OOP", "IT-ITeS"),
            "COMP-SQL-CORE": ("SQL", "IT-ITeS"),
            "COMP-GIT-VCS": ("Git", "IT-ITeS"),
            "COMP-DSA-CORE": ("DSA", "IT-ITeS"),
            "COMP-REST-API": ("REST API", "IT-ITeS"),
        }
        for code, (c_name, c_sec) in default_competencies.items():
            if code not in comp_by_code:
                # Check by name or create
                existing_c = comp_by_name.get(c_name.lower())
                if existing_c:
                    comp_by_code[code] = existing_c
                else:
                    new_c = Competency(code=code, name=c_name, sector=c_sec)
                    db.add(new_c)
                    await db.flush()
                    comp_by_code[code] = new_c
                    comp_by_name[c_name.lower()] = new_c

        # 2. Ensure each role exists and has all requirements
        for role_cfg in cls.STANDARD_ROLES_CONFIG:
            r_stmt = select(Role).where(Role.code == role_cfg["code"]).options(selectinload(Role.requirements))
            r_res = await db.execute(r_stmt)
            role = r_res.scalar_one_or_none()

            if not role:
                role = Role(
                    code=role_cfg["code"],
                    title=role_cfg["title"],
                    sector=role_cfg["sector"],
                    description=role_cfg["description"],
                    min_experience_years=role_cfg["min_experience_years"],
                    is_active=True,
                )
                db.add(role)
                await db.flush()

            existing_comp_ids = {req.competency_id for req in role.requirements}

            for req_cfg in role_cfg["requirements"]:
                comp = comp_by_code.get(req_cfg["code"])
                if comp and comp.id not in existing_comp_ids:
                    role_req = RoleRequirement(
                        role_id=role.id,
                        competency_id=comp.id,
                        required_mastery=req_cfg["req"],
                        importance=req_cfg["importance"],
                        weight=req_cfg["weight"],
                    )
                    db.add(role_req)
                    existing_comp_ids.add(comp.id)

        await db.commit()

    @classmethod
    async def list_roles(cls, db: AsyncSession) -> List[RoleListItemDTO]:
        """Lists active occupation standards with total requirement counts."""
        await cls.ensure_standard_roles_seeded(db)

        stmt = (
            select(Role)
            .where(Role.is_active.is_(True))
            .options(selectinload(Role.requirements))
            .order_by(Role.title)
        )
        res = await db.execute(stmt)
        roles = res.scalars().all()

        return [
            RoleListItemDTO(
                id=r.id,
                code=r.code,
                title=r.title,
                sector=r.sector,
                description=r.description,
                min_experience_years=r.min_experience_years,
                total_requirements=len(r.requirements),
                is_active=r.is_active,
            )
            for r in roles
        ]

    @classmethod
    async def get_role_by_id(cls, db: AsyncSession, role_id: uuid.UUID) -> RoleDetailDTO:
        """Retrieves detailed role definition and competency requirements."""
        stmt = (
            select(Role)
            .where(Role.id == role_id)
            .options(
                selectinload(Role.requirements).selectinload(RoleRequirement.competency)
            )
        )
        res = await db.execute(stmt)
        role = res.scalar_one_or_none()
        if not role:
            raise NotFoundException(message=f"Role with ID '{role_id}' not found.")

        req_dtos = [
            RoleRequirementItemDTO(
                id=req.id,
                competency_id=req.competency_id,
                competency_code=req.competency.code if req.competency else "COMP-NA",
                competency_name=req.competency.name if req.competency else "Competency",
                sector=req.competency.sector if req.competency else role.sector,
                required_mastery=req.required_mastery,
                importance=req.importance,
                weight=req.weight,
            )
            for req in role.requirements
        ]

        return RoleDetailDTO(
            id=role.id,
            code=role.code,
            title=role.title,
            sector=role.sector,
            description=role.description,
            min_experience_years=role.min_experience_years,
            is_active=role.is_active,
            requirements=req_dtos,
        )

    @classmethod
    async def calculate_role_match(
        cls,
        role: Role,
        mastery_by_comp_id: Dict[uuid.UUID, float],
        mastery_by_comp_name: Dict[str, float],
        is_aspiring: bool = False,
    ) -> RoleMatchResultDTO:
        """
        Computes weighted alignment score and categorizes competencies:
        - match_score: (sum(weight * min(cur, req)) / sum(weight * req)) * 100
        - strong_skills: cur >= req
        - development_skills: 0 < gap < 0.25
        - critical_gaps: gap >= 0.25 or (importance == 'CRITICAL' and gap > 0.15)
        """
        total_target_weight = 0.0
        total_achieved_weight = 0.0

        strong_skills: List[str] = []
        development_skills: List[str] = []
        critical_gaps: List[str] = []
        skill_details: List[RoleMatchSkillDetailDTO] = []

        for req in role.requirements:
            comp_name = req.competency.name if req.competency else "Competency"
            comp_code = req.competency.code if req.competency else "COMP"

            # Match mastery by ID or name
            cur_mastery = mastery_by_comp_id.get(req.competency_id, 0.0)
            if cur_mastery == 0.0:
                for name, val in mastery_by_comp_name.items():
                    if comp_name.lower() in name.lower() or name.lower() in comp_name.lower():
                        cur_mastery = max(cur_mastery, val)

            req_mastery = req.required_mastery
            effective_weight = req.weight * req_mastery
            achieved = min(cur_mastery, req_mastery)

            total_target_weight += effective_weight
            total_achieved_weight += req.weight * achieved

            gap = round(max(0.0, req_mastery - cur_mastery), 4)

            # Determine status tier
            if gap <= 0.0:
                status = "mastered"
                strong_skills.append(comp_name)
            elif gap >= 0.25 or (req.importance == "CRITICAL" and gap > 0.15):
                status = "critical_gap"
                critical_gaps.append(comp_name)
            elif cur_mastery >= 0.60:
                status = "proficient"
                strong_skills.append(comp_name)
            else:
                status = "developing"
                development_skills.append(comp_name)

            skill_details.append(
                RoleMatchSkillDetailDTO(
                    competency_code=comp_code,
                    skill_name=comp_name,
                    current_mastery=round(cur_mastery, 4),
                    required_mastery=round(req_mastery, 4),
                    gap=gap,
                    importance=req.importance,
                    weight=req.weight,
                    status=status,
                )
            )

        match_score = (
            round((total_achieved_weight / total_target_weight) * 100.0, 1)
            if total_target_weight > 0
            else 100.0
        )

        # Sort details: critical gaps first, then biggest gap
        skill_details.sort(key=lambda x: (x.status != "critical_gap", -x.gap))

        return RoleMatchResultDTO(
            role_id=role.id,
            role_code=role.code,
            role_title=role.title,
            sector=role.sector,
            match_score=min(100.0, max(0.0, match_score)),
            strong_skills=strong_skills,
            development_skills=development_skills,
            critical_gaps=critical_gaps,
            skill_details=skill_details,
            is_aspiring_role=is_aspiring,
        )

    @classmethod
    async def match_learner_to_roles(
        cls,
        db: AsyncSession,
        learner: Learner,
    ) -> LearnerRoleMatchesResponseDTO:
        """
        Matches a learner against all active occupation roles and computes
        detailed breakdown for their target aspiring role.
        """
        await cls.ensure_standard_roles_seeded(db)

        # 1. Fetch learner's current BKT masteries
        m_stmt = (
            select(LearnerSkillMastery)
            .where(LearnerSkillMastery.learner_id == learner.id)
            .options(selectinload(LearnerSkillMastery.skill))
        )
        m_res = await db.execute(m_stmt)
        mastery_records = m_res.scalars().all()

        mastery_by_id: Dict[uuid.UUID, float] = {
            m.skill_id: m.mastery_probability for m in mastery_records
        }
        mastery_by_name: Dict[str, float] = {
            m.skill.name: m.mastery_probability for m in mastery_records if m.skill
        }

        # 2. Fetch all active roles with requirements
        roles_stmt = (
            select(Role)
            .where(Role.is_active.is_(True))
            .options(
                selectinload(Role.requirements).selectinload(RoleRequirement.competency)
            )
        )
        roles_res = await db.execute(roles_stmt)
        all_roles = roles_res.scalars().all()

        aspiring_match: Optional[RoleMatchResultDTO] = None
        all_matches: List[RoleMatchResultDTO] = []

        for role in all_roles:
            is_aspiring = learner.aspiring_role_id is not None and role.id == learner.aspiring_role_id
            match_res = await cls.calculate_role_match(
                role=role,
                mastery_by_comp_id=mastery_by_id,
                mastery_by_comp_name=mastery_by_name,
                is_aspiring=is_aspiring,
            )
            if is_aspiring:
                aspiring_match = match_res
            all_matches.append(match_res)

        # Sort matches by score descending
        all_matches.sort(key=lambda m: m.match_score, reverse=True)

        return LearnerRoleMatchesResponseDTO(
            learner_id=learner.id,
            aspiring_role=aspiring_match,
            top_matches=all_matches,
            computed_at=datetime.now(timezone.utc).isoformat(),
        )


role_matching_service = RoleMatchingService()
