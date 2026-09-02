from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, Index, JSON, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, UUIDPrimaryKeyMixin


class AuditLog(Base, UUIDPrimaryKeyMixin):
    """
    Immutable System & Compliance Audit Trail.
    
    Captures:
      - Critical state mutations (learner lifecycle, placement verification, intervention deployments)
      - Security events (login attempts, privilege escalation, role changes)
      - Request correlation tracking for distributed tracing
      
    Security Guarantee:
      Sensitive data (passwords, JWT tokens, Aadhaar numbers, private keys)
      are strictly sanitized and redacted prior to persisting into details.
    """
    __tablename__ = "audit_logs"

    # Action Identifier (e.g. 'AUTH_LOGIN_SUCCESS', 'LEARNER_CREATED', 'PLACEMENT_CREATED')
    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="Standardized action verb",
    )

    # Resource Category (e.g. 'USER', 'LEARNER', 'PLACEMENT', 'MANDATE', 'CREDENTIAL')
    resource_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Target entity domain category",
    )

    # Specific Resource Target ID
    resource_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        doc="Unique identifier of affected entity",
    )

    # Actor Identity
    actor_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        doc="UUID of initiating user or 'SYSTEM'",
    )
    actor_role: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        doc="Role of user at execution time",
    )
    actor_email: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
        doc="Sanitized actor email reference",
    )

    # Network & Tracing Context
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        doc="Client remote IP address",
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="Client user agent signature",
    )
    correlation_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        index=True,
        doc="Distributed request correlation UUID for end-to-end tracing",
    )

    # Execution Status ('SUCCESS', 'FAILED', 'WARNING')
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="SUCCESS",
        index=True,
    )

    # Sanitized Contextual Details
    details: Mapped[Dict[str, Any]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=False,
        default=dict,
        doc="Sanitized non-sensitive event parameters and change diffs",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        Index("ix_audit_logs_actor_action", "actor_id", "action"),
        Index("ix_audit_logs_resource", "resource_type", "resource_id"),
        Index("ix_audit_logs_created_at_desc", created_at.desc()),
    )

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action} actor={self.actor_email} status={self.status}>"
