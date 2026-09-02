from datetime import datetime, timezone
from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.authorization import auth_scope_service
from src.core.exceptions import ForbiddenException, NotFoundException
from src.models.learner import Learner
from src.models.outcomes import NonPlacementReason, PlacementSeparation
from src.models.placement import Placement, RetentionCheckpoint
from src.models.user import User
from src.schemas.outcome_dto import (
    NonPlacementReasonCreateDTO,
    NonPlacementReasonResponseDTO,
    PlacementSeparationCreateDTO,
    PlacementSeparationResponseDTO,
)


class OutcomeTrackingService:
    """
    Longitudinal outcome intelligence service tracking non-placement bottlenecks
    and employment attrition / separation root-causes.
    """

    # ==========================================================================
    # Non-Placement Reasons Management
    # ==========================================================================

    @classmethod
    async def record_non_placement_reason(
        cls,
        db: AsyncSession,
        learner_id: str,
        req: NonPlacementReasonCreateDTO,
        user: Optional[User] = None,
    ) -> NonPlacementReasonResponseDTO:
        """Documents diagnostic reasons explaining why a certified candidate remains unplaced."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Candidate '{learner_id}' not found.")

        if user:
            is_allowed = await auth_scope_service.verify_learner_access(db, user, learner)
            if not is_allowed:
                raise ForbiddenException(
                    message=f"Access denied. You cannot record non-placement reasons for candidate '{learner_id}'."
                )

        record = NonPlacementReason(
            learner_id=learner_id,
            reason=req.reason.value,
            source=req.source.value,
            recorded_at=datetime.now(timezone.utc),
            recorded_by=user.email if user else "SYSTEM",
            notes=req.notes,
            associated_skill_code=req.associated_skill_code,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return NonPlacementReasonResponseDTO.model_validate(record)

    @classmethod
    async def get_non_placement_reasons(
        cls, db: AsyncSession, learner_id: str, user: Optional[User] = None
    ) -> List[NonPlacementReasonResponseDTO]:
        """Retrieves history of non-placement observations for a candidate."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Candidate '{learner_id}' not found.")

        if user:
            is_allowed = await auth_scope_service.verify_learner_access(db, user, learner)
            if not is_allowed:
                raise ForbiddenException(
                    message=f"Access denied. You cannot view non-placement reasons for candidate '{learner_id}'."
                )

        stmt = (
            select(NonPlacementReason)
            .where(NonPlacementReason.learner_id == learner_id)
            .order_by(NonPlacementReason.recorded_at.desc())
        )
        res = await db.execute(stmt)
        records = res.scalars().all()
        return [NonPlacementReasonResponseDTO.model_validate(r) for r in records]

    # ==========================================================================
    # Attrition & Placement Separation Management
    # ==========================================================================

    @classmethod
    async def record_placement_separation(
        cls,
        db: AsyncSession,
        placement_id: uuid.UUID,
        req: PlacementSeparationCreateDTO,
        user: Optional[User] = None,
    ) -> PlacementSeparationResponseDTO:
        """
        Records employment separation / job turnover, marks placement as Separated,
        and flags affected retention checkpoints.
        """
        placement = await db.get(Placement, placement_id)
        if not placement:
            raise NotFoundException(message=f"Placement '{placement_id}' not found.")

        # Check access via candidate
        learner = await db.get(Learner, placement.learner_id)
        if user and learner:
            is_allowed = await auth_scope_service.verify_learner_access(db, user, learner)
            if not is_allowed:
                raise ForbiddenException(
                    message=f"Access denied. You cannot record separation for placement '{placement_id}'."
                )

        # 1. Create Separation Record
        separation = PlacementSeparation(
            placement_id=placement_id,
            checkpoint_id=req.checkpoint_id,
            reason=req.reason.value,
            separation_date=req.separation_date,
            source=req.source.value,
            recorded_by=user.email if user else "SYSTEM",
            notes=req.notes,
            associated_skill_gap=req.associated_skill_gap,
        )
        db.add(separation)

        # 2. Update Placement Status
        placement.status = "Separated"

        # 3. Update Checkpoint if targeted or mark upcoming checkpoints as Separated
        if req.checkpoint_id:
            checkpoint = await db.get(RetentionCheckpoint, req.checkpoint_id)
            if checkpoint and checkpoint.placement_id == placement_id:
                checkpoint.is_active_at_checkpoint = False
                checkpoint.verification_status = "SEPARATED"
                checkpoint.remarks = f"Separated on {req.separation_date}: {req.reason.value}"
        else:
            # Mark any active checkpoints after separation date as inactive
            cp_stmt = select(RetentionCheckpoint).where(
                RetentionCheckpoint.placement_id == placement_id,
                RetentionCheckpoint.checkpoint_date >= req.separation_date,
            )
            cp_res = await db.execute(cp_stmt)
            for cp in cp_res.scalars().all():
                cp.is_active_at_checkpoint = False
                cp.verification_status = "SEPARATED"
                cp.remarks = f"Separation recorded on {req.separation_date}: {req.reason.value}"

        await db.commit()
        await db.refresh(separation)
        return PlacementSeparationResponseDTO.model_validate(separation)

    @classmethod
    async def get_placement_separations(
        cls, db: AsyncSession, placement_id: uuid.UUID, user: Optional[User] = None
    ) -> List[PlacementSeparationResponseDTO]:
        """Retrieves turnover records associated with an employment placement."""
        placement = await db.get(Placement, placement_id)
        if not placement:
            raise NotFoundException(message=f"Placement '{placement_id}' not found.")

        stmt = (
            select(PlacementSeparation)
            .where(PlacementSeparation.placement_id == placement_id)
            .order_by(PlacementSeparation.separation_date.desc())
        )
        res = await db.execute(stmt)
        records = res.scalars().all()
        return [PlacementSeparationResponseDTO.model_validate(r) for r in records]


outcome_tracking_service = OutcomeTrackingService()
