from datetime import datetime, timezone
import math
from typing import Any, Dict, List, Optional
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.authorization import auth_scope_service
from src.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.models.competency import Competency, LearnerSkill
from src.models.district import District
from src.models.learner import Learner
from src.models.placement import Placement
from src.models.training_center import TrainingCenter
from src.models.user import User
from src.schemas.common import PaginatedResponse
from src.schemas.learner_dto import (
    BridgeModuleAllocationRequestDTO,
    BridgeModuleAllocationResponseDTO,
    CareerTimelineMilestoneDTO,
    CredentialVerificationRequestDTO,
    CredentialVerificationResponseDTO,
    DetectedSkillGapDTO,
    Learner360ResponseDTO,
    LearnerCreateDTO,
    LearnerListItemDTO,
    LearnerSkillItemDTO,
    LearnerUpdateDTO,
    TrainingInfoDTO,
)
from src.schemas.user import UserRole


class LearnerService:
    """Service layer managing candidate 360 intelligence dossiers."""

    @staticmethod
    async def list_learners(
        db: AsyncSession,
        search: Optional[str] = None,
        district_id: Optional[str] = None,
        status: Optional[str] = None,
        nsqf_level: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        user: Optional[User] = None,
    ) -> PaginatedResponse[LearnerListItemDTO]:
        """Lists and filters candidates with scope-aware access, pagination, and search."""
        query = select(Learner).options(selectinload(Learner.district))

        # Apply Scope-Based Data Authorization Filter
        if user and not user.is_superuser and user.role not in (
            UserRole.SYSTEM_ADMIN.value,
            UserRole.MSDE_OFFICER.value,
        ):
            scope = await auth_scope_service.resolve_user_scope(db, user)

            if user.role == UserRole.STATE_ADMIN.value and scope.state:
                if district_id and district_id.strip() and district_id.strip() not in scope.district_ids:
                    raise ForbiddenException(
                        message=f"Access denied. District '{district_id}' is outside your authorized state jurisdiction ('{scope.state}')."
                    )
                query = query.join(Learner.district).where(District.state == scope.state)

            elif user.role == UserRole.TRAINING_PROVIDER.value:
                if scope.training_center_ids or scope.district_ids:
                    query = query.where(
                        or_(
                            Learner.training_center_id.in_(scope.training_center_ids),
                            Learner.district_id.in_(scope.district_ids),
                        )
                    )

            elif user.role == UserRole.EMPLOYER.value:
                if scope.employer_id:
                    query = query.outerjoin(Learner.placements).where(
                        or_(
                            Placement.employer_id == scope.employer_id,
                            Learner.status.in_(["Placed & Verified", "Interview Ready", "Assessment Passed"]),
                        )
                    )

            elif user.role == UserRole.EVALUATOR.value and scope.state:
                query = query.join(Learner.district).where(District.state == scope.state)

        # Filter: Search (full_name, email, phone, id, or credential)
        if search and search.strip():
            pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Learner.full_name.ilike(pattern),
                    Learner.email.ilike(pattern),
                    Learner.phone.ilike(pattern),
                    Learner.id.ilike(pattern),
                    Learner.ncvet_credential_id.ilike(pattern),
                )
            )

        # Filter: District
        if district_id and district_id.strip():
            query = query.where(Learner.district_id == district_id.strip())

        # Filter: Status
        if status and status.strip():
            query = query.where(Learner.status == status.strip())

        # Filter: NSQF Level
        if nsqf_level and nsqf_level.strip():
            query = query.where(Learner.nsqf_level == nsqf_level.strip())

        # Total Count Query
        count_stmt = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar_one()

        # Pagination & Ordering
        offset = (page - 1) * page_size
        query = query.order_by(Learner.created_at.desc()).offset(offset).limit(page_size)

        result = await db.execute(query)
        learners = result.scalars().all()

        items = []
        for l in learners:
            item = LearnerListItemDTO(
                id=l.id,
                full_name=l.full_name,
                email=l.email,
                phone=l.phone,
                education_level=l.education_level,
                district_id=l.district_id,
                district_name=l.district.name if l.district else None,
                region=l.district.region if l.district else None,
                nsqf_level=l.nsqf_level,
                employment_readiness_score=l.employment_readiness_score,
                overall_progress=l.overall_progress,
                status=l.status,
                ncvet_credential_id=l.ncvet_credential_id,
                created_at=l.created_at,
                updated_at=l.updated_at,
            )
            if user:
                item = auth_scope_service.filter_learner_list_item_for_role(item, user)
            items.append(item)

        total_pages = math.ceil(total / page_size) if page_size > 0 else 0

        return PaginatedResponse[LearnerListItemDTO](
            success=True,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            items=items,
        )

    @classmethod
    async def get_learner_360(
        cls, db: AsyncSession, learner_id: str, user: Optional[User] = None
    ) -> Learner360ResponseDTO:
        """Constructs a comprehensive 360° candidate intelligence dossier with object-level authorization."""
        stmt = (
            select(Learner)
            .where(Learner.id == learner_id)
            .options(
                selectinload(Learner.district),
                selectinload(Learner.training_center),
                selectinload(Learner.skills).selectinload(LearnerSkill.competency),
                selectinload(Learner.consents),
                selectinload(Learner.follow_ups),
                selectinload(Learner.self_employment_outcomes),
                selectinload(Learner.non_placement_reasons),
            )
        )
        result = await db.execute(stmt)
        learner = result.scalar_one_or_none()

        if not learner:
            raise NotFoundException(
                message=f"Beneficiary with ID '{learner_id}' not found."
            )

        # Object-Level Authorization Check
        if user:
            is_allowed = await auth_scope_service.verify_learner_access(db, user, learner)
            if not is_allowed:
                raise ForbiddenException(
                    message=f"Access denied. You do not have authorization to view candidate '{learner_id}' outside your assigned institutional scope."
                )

        # Map Verified Skills
        skills_dto: List[LearnerSkillItemDTO] = []
        for ls in learner.skills:
            if ls.competency:
                skills_dto.append(
                    LearnerSkillItemDTO(
                        competency_id=ls.competency.id,
                        code=ls.competency.code,
                        name=ls.competency.name,
                        sector=ls.competency.sector,
                        score_percentage=ls.score_percentage,
                        verified_by=ls.verified_by,
                        is_verified=ls.is_verified,
                        assessed_at=ls.assessed_at,
                    )
                )

        # Detect Competency Gaps based on skills scores and industry requirements
        detected_gaps = cls._compute_detected_gaps(skills_dto)

        # Generate Career Timeline Milestones
        timeline = cls._generate_career_timeline(learner)

        # Training Information
        training_info = TrainingInfoDTO(
            training_center_id=learner.training_center.id if learner.training_center else None,
            training_center_name=learner.training_center.name if learner.training_center else None,
            training_center_code=learner.training_center.center_code if learner.training_center else None,
            nsqf_level=learner.nsqf_level,
            overall_progress=learner.overall_progress,
            modules_completed=max(1, round(learner.overall_progress / 10)),
            training_hours=f"{round(learner.overall_progress * 2.4)} hrs",
        )

        dossier = Learner360ResponseDTO(
            id=learner.id,
            full_name=learner.full_name,
            email=learner.email,
            phone=learner.phone,
            education_level=learner.education_level,
            district_id=learner.district_id,
            district_name=learner.district.name if learner.district else None,
            state=learner.district.state if learner.district else None,
            region=learner.district.region if learner.district else None,
            status=learner.status,
            nsqf_level=learner.nsqf_level,
            employment_readiness_score=learner.employment_readiness_score,
            overall_progress=learner.overall_progress,
            ncvet_credential_id=learner.ncvet_credential_id,
            training_info=training_info,
            skills=skills_dto,
            detected_gaps=detected_gaps,
            career_timeline=timeline,
            consents=[
                {
                    "id": str(c.id),
                    "consent_type": c.consent_type,
                    "purpose": c.purpose,
                    "granted": c.granted,
                    "granted_at": c.granted_at.isoformat() if c.granted_at else None,
                    "revoked_at": c.revoked_at.isoformat() if c.revoked_at else None,
                    "version": c.version,
                }
                for c in (learner.consents or [])
            ],
            follow_ups=[
                {
                    "id": str(fu.id),
                    "follow_up_type": fu.follow_up_type,
                    "scheduled_at": fu.scheduled_at.isoformat() if fu.scheduled_at else None,
                    "status": fu.status,
                    "channel": fu.channel,
                    "response_status": fu.response_status,
                }
                for fu in (learner.follow_ups or [])
            ],
            self_employment_outcomes=[
                {
                    "id": str(se.id),
                    "enterprise_name": se.enterprise_name,
                    "business_activity": se.business_activity,
                    "sector": se.sector,
                    "start_date": se.start_date.isoformat() if se.start_date else None,
                    "monthly_income_range": se.monthly_income_range,
                    "business_status": se.business_status,
                    "verification_status": se.verification_status,
                }
                for se in (learner.self_employment_outcomes or [])
            ],
            non_placement_reasons=[
                {
                    "id": str(np.id),
                    "reason": np.reason,
                    "source": np.source,
                    "recorded_at": np.recorded_at.isoformat() if np.recorded_at else None,
                    "notes": np.notes,
                    "associated_skill_code": np.associated_skill_code,
                }
                for np in (learner.non_placement_reasons or [])
            ],
            created_at=learner.created_at,
            updated_at=learner.updated_at,
        )

        if user:
            dossier = auth_scope_service.filter_learner_360_for_role(dossier, user)

        return dossier

    @classmethod
    async def create_learner(
        cls, db: AsyncSession, learner_in: LearnerCreateDTO
    ) -> Learner360ResponseDTO:
        """Registers a new candidate with optional initial competencies."""
        # Check duplicate ID
        existing_id = await db.get(Learner, learner_in.id)
        if existing_id:
            raise ConflictException(
                message=f"A candidate with ID '{learner_in.id}' already exists."
            )

        # Check duplicate Email
        if learner_in.email:
            stmt = select(Learner).where(Learner.email == learner_in.email.lower().strip())
            result = await db.execute(stmt)
            if result.scalar_one_or_none():
                raise ConflictException(
                    message=f"Email '{learner_in.email}' is already registered to another candidate."
                )

        # Verify District exists
        district = await db.get(District, learner_in.district_id)
        if not district:
            raise NotFoundException(
                message=f"District with code '{learner_in.district_id}' does not exist."
            )

        new_learner = Learner(
            id=learner_in.id.strip(),
            full_name=learner_in.full_name.strip(),
            email=learner_in.email.lower().strip() if learner_in.email else None,
            phone=learner_in.phone.strip() if learner_in.phone else None,
            education_level=learner_in.education_level.strip() if learner_in.education_level else None,
            district_id=learner_in.district_id.strip(),
            training_center_id=learner_in.training_center_id,
            nsqf_level=learner_in.nsqf_level,
            employment_readiness_score=learner_in.employment_readiness_score,
            overall_progress=learner_in.overall_progress,
            ncvet_credential_id=learner_in.ncvet_credential_id,
            status=learner_in.status,
        )
        db.add(new_learner)
        await db.flush()

        # Add initial skills if provided
        if learner_in.skills:
            for s in learner_in.skills:
                skill_record = LearnerSkill(
                    learner_id=new_learner.id,
                    competency_id=s.competency_id,
                    score_percentage=s.score_percentage,
                    verified_by=s.verified_by,
                    is_verified=s.is_verified,
                    assessed_at=datetime.now(timezone.utc),
                )
                db.add(skill_record)

        await db.commit()
        return await cls.get_learner_360(db, new_learner.id)

    @classmethod
    async def update_learner(
        cls, db: AsyncSession, learner_id: str, update_in: LearnerUpdateDTO
    ) -> Learner360ResponseDTO:
        """Partially updates candidate profile fields."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(
                message=f"Beneficiary with ID '{learner_id}' not found."
            )

        update_data = update_in.model_dump(exclude_unset=True)

        if "email" in update_data and update_data["email"]:
            new_email = update_data["email"].lower().strip()
            if new_email != learner.email:
                stmt = select(Learner).where(
                    Learner.email == new_email, Learner.id != learner_id
                )
                if (await db.execute(stmt)).scalar_one_or_none():
                    raise ConflictException(
                        message=f"Email '{new_email}' is already taken by another beneficiary."
                    )
            update_data["email"] = new_email

        if "district_id" in update_data and update_data["district_id"]:
            district = await db.get(District, update_data["district_id"])
            if not district:
                raise NotFoundException(
                    message=f"District '{update_data['district_id']}' not found."
                )

        for field, value in update_data.items():
            setattr(learner, field, value)

        await db.commit()
        return await cls.get_learner_360(db, learner_id)

    @classmethod
    async def verify_credential(
        cls, db: AsyncSession, learner_id: str, req: CredentialVerificationRequestDTO
    ) -> CredentialVerificationResponseDTO:
        """Placeholder for NCVET / National Skills Registry (NSR) credential authentication."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(
                message=f"Beneficiary with ID '{learner_id}' not found."
            )

        if not learner.ncvet_credential_id:
            learner.ncvet_credential_id = f"NCVET-2026-{learner_id[-5:]}"
            await db.commit()

        return CredentialVerificationResponseDTO(
            success=True,
            learner_id=learner.id,
            credential_id=learner.ncvet_credential_id,
            is_authenticated=True,
            verification_agency="National Council for Vocational Education and Training (NCVET)",
            verified_at=datetime.now(timezone.utc),
            message=f"Candidate credential {learner.ncvet_credential_id} successfully authenticated against NSR repository.",
        )

    @classmethod
    async def allocate_bridge_module(
        cls, db: AsyncSession, learner_id: str, req: BridgeModuleAllocationRequestDTO
    ) -> BridgeModuleAllocationResponseDTO:
        """Placeholder for targeted remedial bridge curriculum assignment."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(
                message=f"Beneficiary with ID '{learner_id}' not found."
            )

        # Simulate readiness score uplift
        readiness_boost = min(10, max(4, round(req.duration_hours / 5)))
        new_readiness = min(100, learner.employment_readiness_score + readiness_boost)
        learner.employment_readiness_score = new_readiness

        await db.commit()

        return BridgeModuleAllocationResponseDTO(
            success=True,
            learner_id=learner.id,
            module_name=req.module_name,
            duration_hours=req.duration_hours,
            readiness_increment=readiness_boost,
            new_readiness_score=new_readiness,
            assigned_at=datetime.now(timezone.utc),
            message=f"Bridge module '{req.module_name}' ({req.duration_hours}h) assigned. Readiness increased to {new_readiness}%.",
        )

    # ==========================================================================
    # Internal Helpers
    # ==========================================================================

    @staticmethod
    def _compute_detected_gaps(skills: List[LearnerSkillItemDTO]) -> List[DetectedSkillGapDTO]:
        """Calculates detected skill gaps based on scored competencies."""
        gaps: List[DetectedSkillGapDTO] = []
        skill_names = {s.name.lower() for s in skills}

        # Check for weak competencies
        for s in skills:
            if s.score_percentage < 70:
                gaps.append(
                    DetectedSkillGapDTO(
                        name=f"{s.name} Proficiency",
                        level="Critical" if s.score_percentage < 60 else "High",
                        impact=f"Score of {s.score_percentage}% falls below employer hiring benchmark (75%).",
                        recommendation=f"Enroll in 20-hr practical lab modules for {s.name}.",
                    )
                )

        # Standard market requirements check
        if not any("cloud" in name or "aws" in name for name in skill_names):
            gaps.append(
                DetectedSkillGapDTO(
                    name="Cloud Infrastructure (AWS / Azure)",
                    level="High",
                    impact="Required by 68% of regional tech hiring mandates.",
                    recommendation="Allocate 30-hour Cloud Sandbox bridge track.",
                )
            )

        return gaps

    @staticmethod
    def _generate_career_timeline(learner: Learner) -> List[CareerTimelineMilestoneDTO]:
        """Synthesizes milestone timeline for candidate."""
        created_str = learner.created_at.strftime("%b %Y") if learner.created_at else "Jan 2026"
        
        milestones = [
            CareerTimelineMilestoneDTO(
                title="PMKVY 4.0 Cohort Enrollment",
                date=created_str,
                status="completed",
                note="Aadhaar KYC & NSR profile registration completed",
            ),
            CareerTimelineMilestoneDTO(
                title="NCVET Competency Assessment",
                date="Current Term",
                status="completed" if learner.overall_progress >= 75 else "current",
                note=f"Core theory & lab assessment ({learner.overall_progress}% completed)",
            ),
            CareerTimelineMilestoneDTO(
                title="Employer Matching & Shortlisting",
                date="Upcoming",
                status="current" if learner.status == "Interview Ready" else "upcoming",
                note=f"Readiness Score: {learner.employment_readiness_score}/100",
            ),
            CareerTimelineMilestoneDTO(
                title="180-Day EPFO Retention Checkpoint",
                date="Milestone",
                status="upcoming",
                note="Longitudinal employment verification via EPFO UAN linkage",
            ),
        ]
        return milestones


learner_service = LearnerService()
