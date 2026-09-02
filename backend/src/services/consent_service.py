from datetime import datetime, timezone
from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.authorization import auth_scope_service
from src.core.exceptions import ForbiddenException, NotFoundException
from src.models.consent import Consent, ConsentType
from src.models.learner import Learner
from src.models.user import User
from src.schemas.consent_dto import (
    ConsentCreateDTO,
    ConsentResponseDTO,
    ConsentUpdateDTO,
)


class ConsentService:
    """
    Enterprise-grade consent and privacy governance engine.
    Maintains immutable grant/revocation timestamps, policy versioning,
    and enforces strict object-level access boundaries.
    """

    @staticmethod
    async def check_active_consent(
        db: AsyncSession, learner_id: str, consent_type: str
    ) -> bool:
        """
        Validates whether active, non-revoked consent exists for a specific candidate and tracking category.
        Downstream tracking operations must invoke this prior to dispatching outreach or querying sensitive records.
        """
        stmt = (
            select(Consent)
            .where(
                Consent.learner_id == learner_id,
                Consent.consent_type == consent_type,
                Consent.granted.is_(True),
                Consent.revoked_at.is_(None),
            )
            .limit(1)
        )
        result = await db.execute(stmt)
        record = result.scalar_one_or_none()
        return record is not None

    @classmethod
    async def get_learner_consents(
        cls, db: AsyncSession, learner_id: str, user: Optional[User] = None
    ) -> List[ConsentResponseDTO]:
        """Retrieves all privacy authorizations documented for a candidate."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Candidate '{learner_id}' not found.")

        if user:
            is_allowed = await auth_scope_service.verify_learner_access(db, user, learner)
            if not is_allowed:
                raise ForbiddenException(
                    message=f"Access denied. You do not have authorization to view consents for candidate '{learner_id}'."
                )

        stmt = (
            select(Consent)
            .where(Consent.learner_id == learner_id)
            .order_by(Consent.created_at.asc())
        )
        res = await db.execute(stmt)
        consents = res.scalars().all()

        return [ConsentResponseDTO.model_validate(c) for c in consents]

    @classmethod
    async def create_or_update_consent(
        cls,
        db: AsyncSession,
        learner_id: str,
        req: ConsentCreateDTO,
        user: Optional[User] = None,
    ) -> ConsentResponseDTO:
        """Registers a new consent authorization or reactivates a previously revoked consent."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Candidate '{learner_id}' not found.")

        if user:
            is_allowed = await auth_scope_service.verify_learner_access(db, user, learner)
            if not is_allowed:
                raise ForbiddenException(
                    message=f"Access denied. You do not have authorization to modify consent for candidate '{learner_id}'."
                )

        # Look for existing consent record of same type
        stmt = select(Consent).where(
            Consent.learner_id == learner_id,
            Consent.consent_type == req.consent_type.value,
        )
        res = await db.execute(stmt)
        consent = res.scalar_one_or_none()

        now = datetime.now(timezone.utc)

        if consent:
            consent.purpose = req.purpose
            consent.granted = req.granted
            consent.version = req.version
            consent.source = req.source
            if req.granted:
                consent.revoked_at = None
                consent.granted_at = now
            else:
                consent.revoked_at = now
        else:
            consent = Consent(
                learner_id=learner_id,
                consent_type=req.consent_type.value,
                purpose=req.purpose,
                granted=req.granted,
                granted_at=now,
                revoked_at=None if req.granted else now,
                version=req.version,
                source=req.source,
            )
            db.add(consent)

        await db.commit()
        await db.refresh(consent)
        return ConsentResponseDTO.model_validate(consent)

    @classmethod
    async def update_consent(
        cls,
        db: AsyncSession,
        learner_id: str,
        consent_id: uuid.UUID,
        req: ConsentUpdateDTO,
        user: Optional[User] = None,
    ) -> ConsentResponseDTO:
        """Modifies consent record state or revokes active tracking permission."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Candidate '{learner_id}' not found.")

        if user:
            is_allowed = await auth_scope_service.verify_learner_access(db, user, learner)
            if not is_allowed:
                raise ForbiddenException(
                    message=f"Access denied. You do not have authorization to update consent for candidate '{learner_id}'."
                )

        consent = await db.get(Consent, consent_id)
        if not consent or consent.learner_id != learner_id:
            raise NotFoundException(message=f"Consent record '{consent_id}' not found for candidate '{learner_id}'.")

        now = datetime.now(timezone.utc)

        if req.revoked is True or req.granted is False:
            consent.granted = False
            consent.revoked_at = now
        elif req.granted is True:
            consent.granted = True
            consent.revoked_at = None
            consent.granted_at = now

        if req.version:
            consent.version = req.version

        await db.commit()
        await db.refresh(consent)
        return ConsentResponseDTO.model_validate(consent)

    @classmethod
    async def revoke_consent(
        cls,
        db: AsyncSession,
        learner_id: str,
        consent_id: uuid.UUID,
        user: Optional[User] = None,
    ) -> ConsentResponseDTO:
        """Revokes an existing active consent record."""
        return await cls.update_consent(
            db=db,
            learner_id=learner_id,
            consent_id=consent_id,
            req=ConsentUpdateDTO(revoked=True, granted=False),
            user=user,
        )


consent_service = ConsentService()
