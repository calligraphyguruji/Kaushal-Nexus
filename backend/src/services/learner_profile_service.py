from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid
from fastapi import UploadFile
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import BadRequestException, NotFoundException
from src.core.logging import logger
from src.models.assessment import LearnerSkillMastery
from src.models.competency import Competency
from src.models.district import District
from src.models.learner import Learner
from src.models.resume import Resume, ResumeProject, ResumeSkill
from src.models.role import Role
from src.schemas.learner_intelligence_dto import (
    LearnerProfileResponseDTO,
    LearnerProfileUpdateDTO,
    ResumeProjectItemDTO,
    ResumeResponseDTO,
    ResumeSkillItemDTO,
    RoleDetailDTO,
)
from src.services.resume_parser import resume_parser
from src.services.role_matching import role_matching_service
from src.services.storage_service import storage_service


class LearnerProfileService:
    """Service handling learner profile data, resume lifecycle, and aspiring role selection."""

    @classmethod
    async def get_profile(cls, db: AsyncSession, learner: Learner) -> LearnerProfileResponseDTO:
        """Constructs full candidate profile DTO with active resume and aspiring role details."""
        # 1. District lookup
        dist_name = None
        if learner.district_id:
            dist = await db.get(District, learner.district_id)
            if dist:
                dist_name = dist.name

        # 2. Aspiring role title
        role_title = None
        if learner.aspiring_role_id:
            role = await db.get(Role, learner.aspiring_role_id)
            if role:
                role_title = role.title

        # 3. Active resume check
        r_stmt = select(Resume).where(Resume.learner_id == learner.id, Resume.is_active.is_(True))
        r_res = await db.execute(r_stmt)
        active_resume = r_res.scalars().first()

        # 4. Total BKT skills assessed count
        m_count_stmt = select(func.count(LearnerSkillMastery.id)).where(LearnerSkillMastery.learner_id == learner.id)
        m_count_res = await db.execute(m_count_stmt)
        total_assessed = m_count_res.scalar() or 0

        return LearnerProfileResponseDTO(
            id=learner.id,
            user_id=learner.user_id,
            full_name=learner.full_name,
            email=learner.email,
            phone=learner.phone,
            education_level=learner.education_level,
            institution=learner.institution,
            graduation_year=learner.graduation_year,
            experience_years=learner.experience_years,
            bio=learner.bio,
            github_url=learner.github_url,
            linkedin_url=learner.linkedin_url,
            portfolio_url=learner.portfolio_url,
            district_id=learner.district_id,
            district_name=dist_name,
            nsqf_level=learner.nsqf_level,
            employment_readiness_score=learner.employment_readiness_score,
            overall_progress=learner.overall_progress,
            status=learner.status,
            aspiring_role_id=learner.aspiring_role_id,
            aspiring_role_title=role_title,
            has_active_resume=active_resume is not None,
            active_resume_filename=active_resume.filename if active_resume else None,
            total_skills_assessed=total_assessed,
            created_at=learner.created_at,
            updated_at=learner.updated_at,
        )

    @classmethod
    async def update_profile(
        cls,
        db: AsyncSession,
        learner: Learner,
        update_in: LearnerProfileUpdateDTO,
    ) -> LearnerProfileResponseDTO:
        """Updates candidate profile fields with validation."""
        data = update_in.model_dump(exclude_unset=True)

        if "aspiring_role_id" in data and data["aspiring_role_id"] is not None:
            # Verify role exists
            role = await db.get(Role, data["aspiring_role_id"])
            if not role:
                raise NotFoundException(message=f"Role with ID '{data['aspiring_role_id']}' not found.")

        if "district_id" in data and data["district_id"] is not None:
            dist = await db.get(District, data["district_id"])
            if not dist:
                raise NotFoundException(message=f"District with code '{data['district_id']}' not found.")

        for key, val in data.items():
            setattr(learner, key, val)

        await db.commit()
        await db.refresh(learner)
        return await cls.get_profile(db, learner)

    @classmethod
    async def upload_and_process_resume(
        cls,
        db: AsyncSession,
        learner: Learner,
        file: UploadFile,
    ) -> ResumeResponseDTO:
        """
        Processes candidate resume:
        1. Validates and saves file to storage
        2. Deactivates any previous resumes
        3. Extracts plain text
        4. Identifies candidate skills and normalizes to competencies
        5. Extracts project experiences
        6. Commits resume entities (candidate evidence ONLY, not BKT mastery)
        """
        # Save file to disk
        filename, storage_path, file_size, mime_type = await storage_service.save_resume_file(file)

        # Deactivate old active resumes for this candidate
        await db.execute(
            update(Resume)
            .where(Resume.learner_id == learner.id, Resume.is_active.is_(True))
            .values(is_active=False)
        )

        now_dt = datetime.now(timezone.utc)

        # Extract text
        parsed_text = resume_parser.extract_text_from_file(storage_path, mime_type)

        # Create Resume record
        resume_record = Resume(
            learner_id=learner.id,
            filename=filename,
            storage_path=storage_path,
            file_size_bytes=file_size,
            mime_type=mime_type,
            parsed_text=parsed_text,
            parsed_at=now_dt,
            is_active=True,
        )
        db.add(resume_record)
        await db.flush()

        # Load available competencies from dictionary
        comp_res = await db.execute(select(Competency))
        all_competencies = comp_res.scalars().all()

        # Normalize and extract candidate skills
        extracted_skills = resume_parser.normalize_and_extract_skills(parsed_text, all_competencies)

        skill_records: List[ResumeSkill] = []
        for s in extracted_skills:
            r_skill = ResumeSkill(
                resume_id=resume_record.id,
                raw_skill_text=s["raw_skill_text"],
                competency_id=s.get("competency_id"),
                confidence=s.get("confidence", 1.0),
                category=s.get("category"),
                years_experience=s.get("years_experience"),
            )
            db.add(r_skill)
            skill_records.append(r_skill)

        # Extract project blocks
        extracted_projects = resume_parser.extract_projects(parsed_text)
        project_records: List[ResumeProject] = []
        for p in extracted_projects:
            r_proj = ResumeProject(
                resume_id=resume_record.id,
                title=p["title"],
                description=p.get("description"),
                technologies=p.get("technologies"),
                start_date=p.get("start_date"),
                end_date=p.get("end_date"),
            )
            db.add(r_proj)
            project_records.append(r_proj)

        # Increment readiness score if candidate has updated resume
        if learner.employment_readiness_score < 40:
            learner.employment_readiness_score = min(100, learner.employment_readiness_score + 15)

        await db.commit()
        await db.refresh(resume_record)

        # Build response DTO
        return await cls._build_resume_dto(db, resume_record)

    @classmethod
    async def get_active_resume(cls, db: AsyncSession, learner: Learner) -> ResumeResponseDTO:
        """Retrieves currently active resume with parsed skills and projects."""
        stmt = (
            select(Resume)
            .where(Resume.learner_id == learner.id, Resume.is_active.is_(True))
            .options(
                selectinload(Resume.skills).selectinload(ResumeSkill.competency),
                selectinload(Resume.projects),
            )
            .order_by(Resume.created_at.desc())
        )
        res = await db.execute(stmt)
        active_resume = res.scalars().first()
        if not active_resume:
            raise NotFoundException(message="No active resume found for this candidate.")

        return await cls._build_resume_dto(db, active_resume)

    @classmethod
    async def delete_active_resume(cls, db: AsyncSession, learner: Learner) -> Dict[str, Any]:
        """Deletes active resume and associated storage file."""
        stmt = select(Resume).where(Resume.learner_id == learner.id, Resume.is_active.is_(True))
        res = await db.execute(stmt)
        active_resume = res.scalars().first()
        if not active_resume:
            raise NotFoundException(message="No active resume found to delete.")

        storage_path = active_resume.storage_path
        await db.delete(active_resume)
        await db.commit()

        storage_service.delete_file(storage_path)

        return {"message": "Resume successfully deleted", "resume_id": str(active_resume.id)}

    @classmethod
    async def set_aspiring_role(
        cls,
        db: AsyncSession,
        learner: Learner,
        role_id: uuid.UUID,
    ) -> RoleDetailDTO:
        """Sets or updates the candidate's target aspiring role."""
        role_detail = await role_matching_service.get_role_by_id(db, role_id)
        learner.aspiring_role_id = role_id
        await db.commit()
        return role_detail

    @classmethod
    async def _build_resume_dto(cls, db: AsyncSession, resume: Resume) -> ResumeResponseDTO:
        """Helper to construct clean ResumeResponseDTO."""
        # Ensure relations loaded
        s_stmt = (
            select(ResumeSkill)
            .where(ResumeSkill.resume_id == resume.id)
            .options(selectinload(ResumeSkill.competency))
            .order_by(ResumeSkill.confidence.desc())
        )
        s_res = await db.execute(s_stmt)
        skills = s_res.scalars().all()

        p_stmt = (
            select(ResumeProject)
            .where(ResumeProject.resume_id == resume.id)
            .order_by(ResumeProject.created_at.asc())
        )
        p_res = await db.execute(p_stmt)
        projects = p_res.scalars().all()

        skill_dtos = [
            ResumeSkillItemDTO(
                id=s.id,
                raw_skill_text=s.raw_skill_text,
                competency_id=s.competency_id,
                competency_code=s.competency.code if s.competency else None,
                competency_name=s.competency.name if s.competency else None,
                confidence=s.confidence,
                category=s.category,
                years_experience=s.years_experience,
            )
            for s in skills
        ]

        proj_dtos = [
            ResumeProjectItemDTO(
                id=p.id,
                title=p.title,
                description=p.description,
                technologies=p.technologies,
                start_date=p.start_date,
                end_date=p.end_date,
            )
            for p in projects
        ]

        return ResumeResponseDTO(
            id=resume.id,
            learner_id=resume.learner_id,
            filename=resume.filename,
            file_size_bytes=resume.file_size_bytes,
            mime_type=resume.mime_type,
            parsed_at=resume.parsed_at,
            is_active=resume.is_active,
            skills_count=len(skill_dtos),
            skills=skill_dtos,
            projects=proj_dtos,
            created_at=resume.created_at,
        )


learner_profile_service = LearnerProfileService()
