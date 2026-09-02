from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TaskTriggerResponseDTO(BaseModel):
    task_id: str
    task_name: str
    status: str = "QUEUED"
    queue: str = "default"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message: str


class TaskStatusResponseDTO(BaseModel):
    task_id: str
    status: str  # "QUEUED" | "RUNNING" | "PROGRESS" | "COMPLETED" | "FAILED" | "RETRYING"
    progress: int = 0  # 0 to 100
    stage: str = "Initialized"
    details: Dict[str, Any] = {}
    updated_at: Optional[float] = None
    result: Optional[Any] = None


class TestTaskRequestDTO(BaseModel):
    x: int = Field(10, description="First integer input")
    y: int = Field(25, description="Second integer input")


class EPFOSyncTriggerRequestDTO(BaseModel):
    batch_size: int = Field(25, ge=1, le=500)
    placement_ids: Optional[List[str]] = None
    sector: Optional[str] = "IT-ITeS"


class SIDSyncTriggerRequestDTO(BaseModel):
    batch_size: int = Field(30, ge=1, le=500)
    center_code: Optional[str] = "PMKK-UP-001"
    sector: Optional[str] = "IT-ITeS"


class ReportTriggerRequestDTO(BaseModel):
    district_id: Optional[str] = None
    quarter: str = "2026-Q1"
    report_format: str = "PDF"
