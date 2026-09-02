from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_correlation_id, logger
from src.core.security import redact_sensitive_payload
from src.models.audit_log import AuditLog
from src.models.user import User


class AuditService:
    """
    Enterprise Audit Logging & Compliance Ledger Service.
    
    Persists immutable audit records for:
      - Authentication (Login success, login failures, token refresh, logout)
      - Learner Lifecycle (Creation, skill updates, profile mutations)
      - Statutory Credential Verification (Aadhaar KYC, EPFO passbook, NCVET qualifications)
      - Placement & Retention (Placement created, retention checkpoint verified, wage increment)
      - Matching Engine (Batch calculations, candidate dispatch)
      - Policy & Intervention (Deployment of skill gap interventions)
      - Administrative Operations (Role elevation, user privilege adjustments)
    
    Security & Privacy Enforcement:
      Automatically redacts all passwords, API keys, JWT tokens, and raw Aadhaar numbers
      from the audit metadata prior to database insertion.
    """

    @classmethod
    async def log_action(
        cls,
        db: AsyncSession,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        actor: Optional[User] = None,
        actor_id: Optional[str] = None,
        actor_role: Optional[str] = None,
        actor_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        correlation_id: Optional[str] = None,
        status: str = "SUCCESS",
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        Records an immutable audit entry in the database.
        """
        # Resolve actor identity
        final_actor_id = actor.id if actor else (actor_id or "SYSTEM")
        final_actor_role = actor.role.value if (actor and hasattr(actor.role, "value")) else (
            actor.role if actor else (actor_role or "SYSTEM")
        )
        final_actor_email = actor.email if actor else actor_email
        final_corr_id = correlation_id or get_correlation_id()

        # Sanitize details payload (deep redaction)
        clean_details = redact_sensitive_payload(details or {})

        audit_entry = AuditLog(
            action=action.strip().upper(),
            resource_type=resource_type.strip().upper(),
            resource_id=str(resource_id) if resource_id else None,
            actor_id=str(final_actor_id),
            actor_role=str(final_actor_role) if final_actor_role else None,
            actor_email=str(final_actor_email) if final_actor_email else None,
            ip_address=ip_address,
            user_agent=user_agent[:255] if user_agent else None,
            correlation_id=final_corr_id,
            status=status.strip().upper(),
            details=clean_details,
            created_at=datetime.now(timezone.utc),
        )

        try:
            db.add(audit_entry)
            await db.commit()
            await db.refresh(audit_entry)
            logger.info(
                f"[AUDIT] action={audit_entry.action} resource={audit_entry.resource_type}:{audit_entry.resource_id} "
                f"actor={audit_entry.actor_email or audit_entry.actor_id} status={audit_entry.status}"
            )
            return audit_entry
        except Exception as exc:
            await db.rollback()
            logger.error(f"Failed to record audit log: {str(exc)}", exc_info=True)
            return audit_entry

    @classmethod
    async def get_audit_trail(
        cls,
        db: AsyncSession,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[AuditLog]:
        """Queries historical audit records for compliance reporting."""
        stmt = select(AuditLog).order_by(desc(AuditLog.created_at)).offset(offset).limit(limit)

        if action:
            stmt = stmt.where(AuditLog.action == action.strip().upper())
        if resource_type:
            stmt = stmt.where(AuditLog.resource_type == resource_type.strip().upper())
        if resource_id:
            stmt = stmt.where(AuditLog.resource_id == str(resource_id))
        if actor_id:
            stmt = stmt.where(AuditLog.actor_id == str(actor_id))
        if correlation_id:
            stmt = stmt.where(AuditLog.correlation_id == correlation_id)

        result = await db.execute(stmt)
        return list(result.scalars().all())


# Global singleton instance
audit_service = AuditService()
