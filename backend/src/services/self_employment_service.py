from datetime import datetime, timezone
from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.authorization import auth_scope_service
from src.core.exceptions import ForbiddenException, NotFoundException
from src.models.district import District
from src.models.learner import Learner
from src.models.self_employment import (
    BusinessStatus,
    SelfEmploymentOutcome,
    SelfEmploymentVerificationStatus,
)
from src.models.user import User
from src.schemas.self_employment_dto import (
    SelfEmploymentCreateDTO,
    SelfEmploymentResponseDTO,
    SelfEmploymentUpdateDTO,
    SelfEmploymentVerifyDTO,
)


class SelfEmploymentService:
    """
    Service layer managing candidate micro-enterprise creation,
    income bracket reporting, and field/document-based verification.
    """

    @classmethod
    async def create_outcome(
        cls,
        db: AsyncSession,
        learner_id: str,
        req: SelfEmploymentCreateDTO,
        user: Optional[User] = None,
    ) -> SelfEmploymentResponseDTO:
        """Registers a candidate self-employment or entrepreneurship milestone."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Candidate '{learner_id}' not found.")

        if user:
            is_allowed = await auth_scope_service.verify_learner_access(db, user, learner)
            if not is_allowed:
                raise ForbiddenException(
                    message=f"Access denied. You cannot record self-employment for candidate '{learner_id}'."
                )

        # Validate District
        district = await db.get(District, req.district_id)
        district_name = district.name if district else None

        outcome = SelfEmploymentOutcome(
            learner_id=learner_id,
            enterprise_name=req.enterprise_name,
            business_activity=req.business_activity,
            sector=req.sector,
            district_id=req.district_id,
            start_date=req.start_date,
            monthly_income_range=req.monthly_income_range,
            business_status=req.business_status or BusinessStatus.OPERATIONAL.value,
            verification_status=SelfEmploymentVerificationStatus.SELF_REPORTED.value,
            notes=req.notes,
        )
        db.add(outcome)

        # Update candidate status
        if learner.status in ("In Training", "Assessment Passed", "Interview Ready"):
            learner.status = "Self-Employed"

        await db.commit()
        await db.refresh(outcome)

        res_dto = SelfEmploymentResponseDTO.model_validate(outcome)
        res_dto.district_name = district_name
        return res_dto

    @classmethod
    async def get_outcomes_by_learner(
        cls, db: AsyncSession, learner_id: str, user: Optional[User] = None
    ) -> List[SelfEmploymentResponseDTO]:
        """Retrieves self-employment and micro-enterprise records for a candidate."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Candidate '{learner_id}' not found.")

        if user:
            is_allowed = await auth_scope_service.verify_learner_access(db, user, learner)
            if not is_allowed:
                raise ForbiddenException(
                    message=f"Access denied. You cannot view self-employment records for candidate '{learner_id}'."
                )

        stmt = (
            select(SelfEmploymentOutcome)
            .where(SelfEmploymentOutcome.learner_id == learner_id)
            .options(selectinload(SelfEmploymentOutcome.district))
            .order_by(SelfEmploymentOutcome.start_date.desc())
        )
        res = await db.execute(stmt)
        outcomes = res.scalars().all()

        results = []
        for o in outcomes:
            dto = SelfEmploymentResponseDTO.model_validate(o)
            dto.district_name = o.district.name if o.district else None
            results.append(dto)
        return results

    @classmethod
    async def verify_outcome(
        cls,
        db: AsyncSession,
        learner_id: str,
        outcome_id: uuid.UUID,
        req: SelfEmploymentVerifyDTO,
        user: Optional[User] = None,
    ) -> SelfEmploymentResponseDTO:
        """Field/Evaluator verification of candidate's micro-enterprise operations."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Candidate '{learner_id}' not found.")

        if user:
            is_allowed = await auth_scope_service.verify_learner_access(db, user, learner)
            if not is_allowed:
                raise ForbiddenException(
                    message=f"Access denied. You cannot verify self-employment for candidate '{learner_id}'."
                )

        outcome = await db.get(SelfEmploymentOutcome, outcome_id)
        if not outcome or outcome.learner_id != learner_id:
            raise NotFoundException(message=f"Self-employment outcome '{outcome_id}' not found for candidate '{learner_id}'.")

        now = datetime.now(timezone.utc)
        outcome.verification_status = req.verification_status.value
        outcome.verified_at = now
        outcome.verified_by_id = str(user.id) if user else "SYSTEM"
        if req.notes:
            outcome.notes = f"{outcome.notes or ''}\n[Verified {now.strftime('%Y-%m-%d')}]: {req.notes}".strip()

        if req.verification_status in (
            SelfEmploymentVerificationStatus.DOCUMENT_VERIFIED,
            SelfEmploymentVerificationStatus.ADMIN_VERIFIED,
        ):
            learner.status = "Self-Employed (Verified)"

        await db.commit()
        await db.refresh(outcome)
        return SelfEmploymentResponseDTO.model_validate(outcome)


self_employment_service = SelfEmploymentService()
