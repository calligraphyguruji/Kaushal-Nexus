from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict


class AuditLogItemDTO(BaseModel):
    id: uuid.UUID
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    actor_id: Optional[str] = None
    actor_role: Optional[str] = None
    actor_email: Optional[str] = None
    ip_address: Optional[str] = None
    correlation_id: Optional[str] = None
    status: str
    details: Dict[str, Any] = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditTrailResponseDTO(BaseModel):
    total: int
    items: List[AuditLogItemDTO]
    timestamp: datetime
