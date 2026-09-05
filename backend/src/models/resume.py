from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
import uuid
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.competency import Competency
    from src.models.learner import Learner


class Resume(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Uploaded candidate CV / resume document record."""
    __tablename__ = "resumes"

    learner_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("learners.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Candidate foreign key e.g. 'KN-2026-00561'",
    )
    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Original uploaded file name e.g. 'alex_resume.pdf'",
    )
    storage_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Sanitized filesystem or object storage location",
    )
    file_size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Size of file in bytes",
    )
    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        doc="MIME content type e.g. 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'",
    )
    parsed_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Extracted plain text content",
    )
    parsed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp when parsing and entity extraction completed",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Whether this is the current active resume for the candidate",
    )

    # Relationships
    learner: Mapped["Learner"] = relationship(
        "Learner",
        back_populates="resumes",
    )
    skills: Mapped[List["ResumeSkill"]] = relationship(
        "ResumeSkill",
        back_populates="resume",
        cascade="all, delete-orphan",
    )
    projects: Mapped[List["ResumeProject"]] = relationship(
        "ResumeProject",
        back_populates="resume",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Resume(id={self.id}, learner_id='{self.learner_id}', file='{self.filename}')>"


class ResumeSkill(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Candidate-asserted skill extracted from uploaded resume (candidate evidence, not BKT mastery)."""
    __tablename__ = "resume_skills"

    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Resume foreign key",
    )
    raw_skill_text: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
        doc="Original text extracted from CV e.g. 'Python 3.11', 'PostgreSQL'",
    )
    competency_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competencies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Matched standardized competency dictionary foreign key",
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        default=1.0,
        nullable=False,
        doc="Extraction and semantic matching confidence score (0.0 - 1.0)",
    )
    category: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        doc="Skill category: 'language' | 'framework' | 'database' | 'tool' | 'concept'",
    )
    years_experience: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        doc="Estimated years of experience if mentioned in resume context",
    )

    # Relationships
    resume: Mapped["Resume"] = relationship(
        "Resume",
        back_populates="skills",
    )
    competency: Mapped[Optional["Competency"]] = relationship(
        "Competency",
    )

    def __repr__(self) -> str:
        return f"<ResumeSkill(raw='{self.raw_skill_text}', comp_id={self.competency_id}, conf={self.confidence})>"


class ResumeProject(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Extracted project experience from uploaded resume."""
    __tablename__ = "resume_projects"

    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Resume foreign key",
    )
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        doc="Project title e.g. 'E-Commerce Analytics Platform'",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Project synopsis or responsibilities",
    )
    technologies: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        doc="Comma-delimited technologies used e.g. 'FastAPI, PostgreSQL, Docker'",
    )
    start_date: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        doc="Start period e.g. 'Jan 2025'",
    )
    end_date: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        doc="End period or 'Present'",
    )

    # Relationships
    resume: Mapped["Resume"] = relationship(
        "Resume",
        back_populates="projects",
    )

    def __repr__(self) -> str:
        return f"<ResumeProject(title='{self.title}', resume_id={self.resume_id})>"
