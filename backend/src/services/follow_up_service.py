from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.authorization import auth_scope_service
from src.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from src.models.follow_up import (
    FollowUpChannel,
    FollowUpStatus,
    FollowUpType,
    OutcomeFollowUp,
    OutcomeResponseCategory,
)
from src.models.learner import Learner
from src.models.user import User
from src.schemas.follow_up_dto import (
    FollowUpCreateDTO,
    FollowUpRecordResponseDTO,
    FollowUpResponseDTO,
)
from src.services.consent_service import consent_service

logger = logging.getLogger(__name__)


class FollowUpNotificationAdapter:
    """
    Simulation & Sandbox Notification Gateway Adapter.
    
    IMPORTANT ARCHITECTURAL NOTICE:
    In accordance with SIH guidelines, external SMS, WhatsApp, and SMTP gateways
    are intentionally sandboxed. Real transmission occurs only when explicit
    production cloud provider credentials are configured.
    """

    @classmethod
    async def dispatch(
        cls,
        learner_id: str,
        channel: str,
        follow_up_type: str,
        recipient_contact: Optional[str],
    ) -> Dict[str, Any]:
        """Dispatches simulated outreach notification and returns mock delivery receipt."""
        logger.info(
            f"[SANDBOX NOTIFICATION] Dispatched {channel} outreach for candidate '{learner_id}' "
            f"(Milestone: {follow_up_type}) -> Recipient: {recipient_contact or 'Candidate Portal'}"
        )
        return {
            "channel": channel,
            "simulated": True,
            "gateway_status": "DELIVERED_SANDBOX",
            "receipt_id": f"RCVR-{uuid.uuid4().hex[:8].upper()}",
            "dispatched_at": datetime.now(timezone.utc).isoformat(),
        }


class FollowUpService:
    """
    Longitudinal follow-up service orchestrating scheduled candidate surveys,
    checking privacy consent compliance, and recording outcome feedback.
    """

    @classmethod
    async def schedule_follow_up(
        cls,
        db: AsyncSession,
        learner_id: str,
        req: FollowUpCreateDTO,
        user: Optional[User] = None,
    ) -> FollowUpResponseDTO:
        """Schedules a new longitudinal outreach milestone for a candidate."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Candidate '{learner_id}' not found.")

        if user:
            is_allowed = await auth_scope_service.verify_learner_access(db, user, learner)
            if not is_allowed:
                raise ForbiddenException(
                    message=f"Access denied. You cannot schedule follow-ups for candidate '{learner_id}'."
                )

        # Duplicate Prevention Check: Check for existing active/scheduled follow-up of same type within 7 days
        recent_window = req.scheduled_at - timedelta(days=7)
        future_window = req.scheduled_at + timedelta(days=7)

        dup_stmt = select(OutcomeFollowUp).where(
            OutcomeFollowUp.learner_id == learner_id,
            OutcomeFollowUp.follow_up_type == req.follow_up_type.value,
            OutcomeFollowUp.status.in_([FollowUpStatus.SCHEDULED.value, FollowUpStatus.SENT.value]),
            OutcomeFollowUp.scheduled_at >= recent_window,
            OutcomeFollowUp.scheduled_at <= future_window,
        )
        dup_res = await db.execute(dup_stmt)
        if dup_res.scalar_one_or_none():
            raise BadRequestException(
                message=f"A '{req.follow_up_type.value}' follow-up is already scheduled within this milestone window."
            )

        follow_up = OutcomeFollowUp(
            learner_id=learner_id,
            follow_up_type=req.follow_up_type.value,
            scheduled_at=req.scheduled_at,
            status=FollowUpStatus.SCHEDULED.value,
            channel=req.channel.value,
            notes=req.notes,
            attempt_count=0,
        )
        db.add(follow_up)
        await db.commit()
        await db.refresh(follow_up)
        return FollowUpResponseDTO.model_validate(follow_up)

    @classmethod
    async def get_learner_follow_ups(
        cls, db: AsyncSession, learner_id: str, user: Optional[User] = None
    ) -> List[FollowUpResponseDTO]:
        """Retrieves history of scheduled and completed outreach records for a candidate."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Candidate '{learner_id}' not found.")

        if user:
            is_allowed = await auth_scope_service.verify_learner_access(db, user, learner)
            if not is_allowed:
                raise ForbiddenException(
                    message=f"Access denied. You cannot view follow-up records for candidate '{learner_id}'."
                )

        stmt = (
            select(OutcomeFollowUp)
            .where(OutcomeFollowUp.learner_id == learner_id)
            .order_by(OutcomeFollowUp.scheduled_at.desc())
        )
        res = await db.execute(stmt)
        records = res.scalars().all()
        return [FollowUpResponseDTO.model_validate(r) for r in records]

    @classmethod
    async def process_due_follow_ups(
        cls, db: AsyncSession, batch_limit: int = 50
    ) -> Dict[str, Any]:
        """
        Processes pending outreach milestones due for transmission.
        Strictly enforces candidate FOLLOW_UP_COMMUNICATION consent before dispatching.
        """
        now = datetime.now(timezone.utc)
        stmt = (
            select(OutcomeFollowUp)
            .where(
                OutcomeFollowUp.scheduled_at <= now,
                OutcomeFollowUp.status.in_([FollowUpStatus.SCHEDULED.value, FollowUpStatus.FAILED.value]),
                OutcomeFollowUp.attempt_count < 3,
            )
            .limit(batch_limit)
        )
        res = await db.execute(stmt)
        due_follow_ups = res.scalars().all()

        processed_count = 0
        sent_count = 0
        skipped_consent_count = 0

        for fu in due_follow_ups:
            processed_count += 1
            # 1. Check Active Privacy Consent
            has_consent = await consent_service.check_active_consent(
                db=db,
                learner_id=fu.learner_id,
                consent_type="FOLLOW_UP_COMMUNICATION",
            )

            if not has_consent:
                fu.status = FollowUpStatus.SKIPPED.value
                fu.notes = (
                    f"Skipped on {now.strftime('%Y-%m-%d %H:%M')}: Beneficiary has not granted "
                    f"or has revoked active FOLLOW_UP_COMMUNICATION consent."
                )
                skipped_consent_count += 1
                continue

            # 2. Dispatch simulated notification
            try:
                learner = await db.get(Learner, fu.learner_id)
                contact = learner.phone if learner and fu.channel == "SMS" else (learner.email if learner else None)
                await FollowUpNotificationAdapter.dispatch(
                    learner_id=fu.learner_id,
                    channel=fu.channel,
                    follow_up_type=fu.follow_up_type,
                    recipient_contact=contact,
                )
                fu.status = FollowUpStatus.SENT.value
                fu.sent_at = now
                fu.attempt_count += 1
                sent_count += 1
            except Exception as exc:
                logger.error(f"Failed to dispatch follow-up {fu.id}: {exc}")
                fu.status = FollowUpStatus.FAILED.value
                fu.attempt_count += 1

        await db.commit()

        return {
            "processed": processed_count,
            "sent": sent_count,
            "skipped_no_consent": skipped_consent_count,
            "evaluated_at": now.isoformat(),
        }

    @classmethod
    async def record_follow_up_response(
        cls,
        db: AsyncSession,
        learner_id: str,
        follow_up_id: uuid.UUID,
        req: FollowUpRecordResponseDTO,
        user: Optional[User] = None,
    ) -> FollowUpResponseDTO:
        """Records outcome feedback provided by candidate or assisted counseling staff."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Candidate '{learner_id}' not found.")

        if user:
            is_allowed = await auth_scope_service.verify_learner_access(db, user, learner)
            if not is_allowed:
                raise ForbiddenException(
                    message=f"Access denied. You cannot record responses for candidate '{learner_id}'."
                )

        fu = await db.get(OutcomeFollowUp, follow_up_id)
        if not fu or fu.learner_id != learner_id:
            raise NotFoundException(message=f"Follow-up '{follow_up_id}' not found for candidate '{learner_id}'.")

        now = datetime.now(timezone.utc)
        fu.response_status = req.response_status.value
        fu.completed_at = now
        fu.status = FollowUpStatus.COMPLETED.value
        if req.notes:
            fu.notes = f"{fu.notes or ''}\n[Response {now.strftime('%Y-%m-%d')}]: {req.notes}".strip()

        # Update candidate status if outcome warrants update
        if req.response_status == OutcomeResponseCategory.SELF_EMPLOYED and learner.status != "Self-Employed":
            learner.status = "Self-Employed"
        elif req.response_status == OutcomeResponseCategory.EMPLOYED and learner.status in ("In Training", "Assessment Passed"):
            learner.status = "Placed & Verified"

        await db.commit()
        await db.refresh(fu)
        return FollowUpResponseDTO.model_validate(fu)


follow_up_service = FollowUpService()
