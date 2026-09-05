import uuid
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from src.models.district import District
    from src.models.training_center import TrainingCenter
    from src.models.competency import LearnerSkill
    from src.models.placement import Placement
    from src.models.consent import Consent
    from src.models.follow_up import OutcomeFollowUp
    from src.models.self_employment import SelfEmploymentOutcome
    from src.models.outcomes import NonPlacementReason
    from src.models.assessment import LearnerSkillMastery, AssessmentSubmission
    from src.models.user import User
    from src.models.role import Role
    from src.models.resume import Resume
    from src.models.learner_outcome import LearnerOutcome
    from src.models.learning_plan import LearningPlan, LearningActivity
    from src.models.career_event import CareerEvent, CareerApplication, LearnerProject
    from src.models.ml_feature_snapshot import MLFeatureSnapshot
    from src.models.placement_prediction import PlacementPrediction
    from src.models.learning_intervention import LearningIntervention


class Learner(Base, TimestampMixin):
    """Certified skilling candidate / beneficiary 360 dossier model."""
    __tablename__ = "learners"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        index=True,
        doc="Unique beneficiary identifier e.g. 'KN-2026-00561'",
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
        index=True,
        doc="Associated authentication user account foreign key",
    )
    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
        doc="Full legal name of candidate",
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=True,
        doc="Unique email address",
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(25),
        nullable=True,
        doc="Contact phone number",
    )
    education_level: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        doc="Highest education e.g. 'B.Sc Computer Science', 'Diploma Mechanical'",
    )
    institution: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        doc="Educational institution / university / college name",
    )
    graduation_year: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Graduation or expected completion year",
    )
    experience_years: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        doc="Prior relevant work or internship experience in years",
    )
    bio: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Professional headline or candidate bio",
    )
    github_url: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="GitHub profile link",
    )
    linkedin_url: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="LinkedIn profile link",
    )
    portfolio_url: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="Portfolio or personal website link",
    )
    aspiring_role_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Target aspiring occupation standard foreign key",
    )
    training_center_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("training_centers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Training center foreign key",
    )
    district_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("districts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="District location foreign key",
    )
    nsqf_level: Mapped[Optional[str]] = mapped_column(
        String(30),
        nullable=True,
        doc="National Skills Qualification Framework tier e.g. 'NSQF Level 5'",
    )
    employment_readiness_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Algorithmically scored readiness index (0-100)",
    )
    overall_progress: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Curriculum training completion percentage (0-100)",
    )
    ncvet_credential_id: Mapped[Optional[str]] = mapped_column(
        String(80),
        nullable=True,
        index=True,
        doc="Authenticated National Skills Registry / NCVET credential ID",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="In Training",
        nullable=False,
        index=True,
        doc="Cohort status: 'In Training' | 'Assessment Passed' | 'Interview Ready' | 'Placed & Verified' | 'Retained (180-Day)'",
    )

    # Relationships
    training_center: Mapped[Optional["TrainingCenter"]] = relationship(
        "TrainingCenter",
        back_populates="learners",
    )
    district: Mapped["District"] = relationship(
        "District",
        back_populates="learners",
    )
    skills: Mapped[List["LearnerSkill"]] = relationship(
        "LearnerSkill",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    placements: Mapped[List["Placement"]] = relationship(
        "Placement",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    consents: Mapped[List["Consent"]] = relationship(
        "Consent",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    follow_ups: Mapped[List["OutcomeFollowUp"]] = relationship(
        "OutcomeFollowUp",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    self_employment_outcomes: Mapped[List["SelfEmploymentOutcome"]] = relationship(
        "SelfEmploymentOutcome",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    non_placement_reasons: Mapped[List["NonPlacementReason"]] = relationship(
        "NonPlacementReason",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    skill_masteries: Mapped[List["LearnerSkillMastery"]] = relationship(
        "LearnerSkillMastery",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    assessment_submissions: Mapped[List["AssessmentSubmission"]] = relationship(
        "AssessmentSubmission",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="learner",
    )
    aspiring_role: Mapped[Optional["Role"]] = relationship(
        "Role",
        back_populates="aspiring_learners",
    )
    resumes: Mapped[List["Resume"]] = relationship(
        "Resume",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    outcomes: Mapped[List["LearnerOutcome"]] = relationship(
        "LearnerOutcome",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    learning_plans: Mapped[List["LearningPlan"]] = relationship(
        "LearningPlan",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    learning_activities: Mapped[List["LearningActivity"]] = relationship(
        "LearningActivity",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    career_events: Mapped[List["CareerEvent"]] = relationship(
        "CareerEvent",
        back_populates="learner",
        cascade="all, delete-orphan",
        order_by="CareerEvent.event_date.desc()",
    )
    career_applications: Mapped[List["CareerApplication"]] = relationship(
        "CareerApplication",
        back_populates="learner",
        cascade="all, delete-orphan",
        order_by="CareerApplication.applied_at.desc()",
    )
    projects: Mapped[List["LearnerProject"]] = relationship(
        "LearnerProject",
        back_populates="learner",
        cascade="all, delete-orphan",
        order_by="LearnerProject.completed_at.desc()",
    )
    feature_snapshots: Mapped[List["MLFeatureSnapshot"]] = relationship(
        "MLFeatureSnapshot",
        back_populates="learner",
        cascade="all, delete-orphan",
        order_by="MLFeatureSnapshot.snapshot_date.desc()",
    )
    placement_predictions: Mapped[List["PlacementPrediction"]] = relationship(
        "PlacementPrediction",
        back_populates="learner",
        cascade="all, delete-orphan",
        order_by="PlacementPrediction.prediction_timestamp.desc()",
    )
    interventions: Mapped[List["LearningIntervention"]] = relationship(
        "LearningIntervention",
        back_populates="learner",
        cascade="all, delete-orphan",
        order_by="LearningIntervention.recommended_at.desc()",
    )

    __table_args__ = (
        Index("ix_learners_district_status", "district_id", "status"),
        Index("ix_learners_status_readiness", "status", "employment_readiness_score"),
    )

    def __repr__(self) -> str:
        return f"<Learner(id='{self.id}', name='{self.full_name}', readiness={self.employment_readiness_score}%)>"
