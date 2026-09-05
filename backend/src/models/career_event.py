from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, TYPE_CHECKING
import uuid
from sqlalchemy import DateTime, Float, ForeignKey, Index, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.learner import Learner
    from src.models.role import Role


class CareerEventType(str, Enum):
    """Controlled taxonomy of career events throughout candidate journey."""
    PROFILE_CREATED = "PROFILE_CREATED"
    RESUME_UPLOADED = "RESUME_UPLOADED"
    ASSESSMENT_COMPLETED = "ASSESSMENT_COMPLETED"
    LEARNING_STARTED = "LEARNING_STARTED"
    LEARNING_COMPLETED = "LEARNING_COMPLETED"
    PROJECT_COMPLETED = "PROJECT_COMPLETED"
    APPLICATION_SUBMITTED = "APPLICATION_SUBMITTED"
    INTERVIEW_INVITED = "INTERVIEW_INVITED"
    INTERVIEW_ATTENDED = "INTERVIEW_ATTENDED"
    INTERNSHIP_OFFERED = "INTERNSHIP_OFFERED"
    INTERNSHIP_ACCEPTED = "INTERNSHIP_ACCEPTED"
    INTERNSHIP_COMPLETED = "INTERNSHIP_COMPLETED"
    EMPLOYMENT_OFFERED = "EMPLOYMENT_OFFERED"
    EMPLOYMENT_ACCEPTED = "EMPLOYMENT_ACCEPTED"
    PLACED = "PLACED"


class CareerSource(str, Enum):
    """Source attribution for career events and outcomes."""
    SELF_REPORTED = "SELF_REPORTED"
    INSTITUTION_VERIFIED = "INSTITUTION_VERIFIED"
    EMPLOYER_VERIFIED = "EMPLOYER_VERIFIED"
    SYSTEM_GENERATED = "SYSTEM_GENERATED"
    IMPORTED = "IMPORTED"


CareerEventSource = CareerSource


class OutcomeStatus(str, Enum):
    """Verification lifecycle status for reported outcomes."""
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class ApplicationStatus(str, Enum):
    """Application progression stages."""
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    SCREENING = "SCREENING"
    INTERVIEW = "INTERVIEW"
    OFFERED = "OFFERED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class ProjectVerificationStatus(str, Enum):
    """Verification status of practical project evidence."""
    SELF_REPORTED = "SELF_REPORTED"
    SYSTEM_REVIEWED = "SYSTEM_REVIEWED"
    INSTITUTION_VERIFIED = "INSTITUTION_VERIFIED"


# Confidence levels mapped by source
SOURCE_CONFIDENCE_MAP = {
    CareerSource.EMPLOYER_VERIFIED.value: 1.0,
    CareerSource.INSTITUTION_VERIFIED.value: 0.9,
    CareerSource.SYSTEM_GENERATED.value: 0.8,
    CareerSource.IMPORTED.value: 0.7,
    CareerSource.SELF_REPORTED.value: 0.6,
}


class CareerEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Timestamped career activity record for tracking candidate progression.
    Maintains strict separation between operational activity events and final outcomes.
    """
    __tablename__ = "career_events"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Candidate beneficiary identifier",
    )
    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="CareerEventType taxonomy e.g. 'APPLICATION_SUBMITTED' | 'INTERVIEW_ATTENDED'",
    )
    role_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Associated role if applicable",
    )
    organization_name: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
        doc="Employer, institution, or hiring entity",
    )
    event_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        doc="Historical timestamp when event actually took place (critical for cutoff)",
    )
    source: Mapped[str] = mapped_column(
        String(50),
        default=CareerSource.SELF_REPORTED.value,
        nullable=False,
        doc="Source attribution (e.g. SELF_REPORTED, INSTITUTION_VERIFIED)",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Non-sensitive contextual notes",
    )
    metadata_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        doc="Auxiliary non-sensitive metadata (e.g. platform, interview_round)",
    )

    # Relationships
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="career_events",
    )
    role: Mapped[Optional["Role"]] = relationship("Role")

    __table_args__ = (
        Index("ix_career_events_learner_date", "learner_id", "event_date"),
        Index("ix_career_events_type_date", "event_type", "event_date"),
    )

    def __repr__(self) -> str:
        return f"<CareerEvent(learner='{self.learner_id}', type='{self.event_type}', date='{self.event_date}')>"


class CareerApplication(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Candidate job/internship application tracker.
    Allows candidates to log and manage multiple concurrent applications with status transitions.
    """
    __tablename__ = "career_applications"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Candidate identifier",
    )
    role_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Standardized target role",
    )
    organization_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        doc="Target company or hiring entity",
    )
    job_title: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
        doc="Specific job or internship title applied for",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default=ApplicationStatus.SUBMITTED.value,
        nullable=False,
        index=True,
        doc="Application stage: DRAFT, SUBMITTED, SCREENING, INTERVIEW, OFFERED, ACCEPTED, REJECTED, WITHDRAWN",
    )
    source: Mapped[str] = mapped_column(
        String(50),
        default=CareerSource.SELF_REPORTED.value,
        nullable=False,
        doc="Report source",
    )
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        doc="Date application was submitted",
    )
    salary_offered: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        doc="Offered stipend/salary in LPA if offered/accepted",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Application notes",
    )

    # Relationships
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="career_applications",
    )
    role: Mapped[Optional["Role"]] = relationship("Role")

    __table_args__ = (
        Index("ix_career_apps_learner_applied", "learner_id", "applied_at"),
        Index("ix_career_apps_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<CareerApplication(learner='{self.learner_id}', org='{self.organization_name}', status='{self.status}')>"


class LearnerProject(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Practical portfolio project evidence.
    Reflects tangible technical implementations without inflating BKT mastery directly.
    """
    __tablename__ = "learner_projects"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Candidate identifier",
    )
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        doc="Project headline / title",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Technical overview and personal contributions",
    )
    skills: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True,
        doc="List of competencies or skills demonstrated",
    )
    technologies: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True,
        doc="Tools, frameworks, languages used (e.g. ['FastAPI', 'React', 'PostgreSQL'])",
    )
    github_url: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="Source code repository link",
    )
    live_url: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="Live demo or production URL",
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        doc="Project completion date for historical cutoff verification",
    )
    verification_status: Mapped[str] = mapped_column(
        String(50),
        default=ProjectVerificationStatus.SELF_REPORTED.value,
        nullable=False,
        doc="SELF_REPORTED, SYSTEM_REVIEWED, INSTITUTION_VERIFIED",
    )

    # Relationships
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="projects",
    )

    __table_args__ = (
        Index("ix_learner_projects_learner_date", "learner_id", "completed_at"),
    )

    def __repr__(self) -> str:
        return f"<LearnerProject(learner='{self.learner_id}', title='{self.title}', status='{self.verification_status}')>"
