from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


# ==============================================================================
# Learner Profile DTOs
# ==============================================================================

class LearnerProfileResponseDTO(BaseModel):
    id: str = Field(..., description="Unique candidate ID e.g. 'KN-2026-00561'")
    user_id: Optional[uuid.UUID] = None
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    education_level: Optional[str] = None
    institution: Optional[str] = None
    graduation_year: Optional[int] = None
    experience_years: float = 0.0
    bio: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    district_id: str
    district_name: Optional[str] = None
    nsqf_level: Optional[str] = None
    employment_readiness_score: int = 0
    overall_progress: int = 0
    status: str
    aspiring_role_id: Optional[uuid.UUID] = None
    aspiring_role_title: Optional[str] = None
    has_active_resume: bool = False
    active_resume_filename: Optional[str] = None
    total_skills_assessed: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LearnerProfileUpdateDTO(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = Field(None, max_length=25)
    education_level: Optional[str] = Field(None, max_length=100)
    institution: Optional[str] = Field(None, max_length=200)
    graduation_year: Optional[int] = Field(None, ge=1970, le=2040)
    experience_years: Optional[float] = Field(None, ge=0.0, le=50.0)
    bio: Optional[str] = Field(None, max_length=1000)
    github_url: Optional[str] = Field(None, max_length=255)
    linkedin_url: Optional[str] = Field(None, max_length=255)
    portfolio_url: Optional[str] = Field(None, max_length=255)
    district_id: Optional[str] = Field(None, max_length=50)
    aspiring_role_id: Optional[uuid.UUID] = None


# ==============================================================================
# Role & Requirements DTOs
# ==============================================================================

class RoleRequirementItemDTO(BaseModel):
    id: uuid.UUID
    competency_id: uuid.UUID
    competency_code: str
    competency_name: str
    sector: str
    required_mastery: float
    importance: str
    weight: float

    model_config = ConfigDict(from_attributes=True)


class RoleListItemDTO(BaseModel):
    id: uuid.UUID
    code: str
    title: str
    sector: str
    description: Optional[str] = None
    min_experience_years: float = 0.0
    total_requirements: int = 0
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class RoleDetailDTO(BaseModel):
    id: uuid.UUID
    code: str
    title: str
    sector: str
    description: Optional[str] = None
    min_experience_years: float = 0.0
    is_active: bool = True
    requirements: List[RoleRequirementItemDTO] = []

    model_config = ConfigDict(from_attributes=True)


class AspiringRoleUpdateDTO(BaseModel):
    role_id: uuid.UUID = Field(..., description="Target role UUID")


# ==============================================================================
# Resume & Skill Extraction DTOs
# ==============================================================================

class ResumeSkillItemDTO(BaseModel):
    id: uuid.UUID
    raw_skill_text: str
    competency_id: Optional[uuid.UUID] = None
    competency_code: Optional[str] = None
    competency_name: Optional[str] = None
    confidence: float = 1.0
    category: Optional[str] = None
    years_experience: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class ResumeProjectItemDTO(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    technologies: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ResumeResponseDTO(BaseModel):
    id: uuid.UUID
    learner_id: str
    filename: str
    file_size_bytes: int
    mime_type: str
    parsed_at: Optional[datetime] = None
    is_active: bool = True
    skills_count: int = 0
    skills: List[ResumeSkillItemDTO] = []
    projects: List[ResumeProjectItemDTO] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Role Matching & Gap Analytics DTOs
# ==============================================================================

class RoleMatchSkillDetailDTO(BaseModel):
    competency_code: str
    skill_name: str
    current_mastery: float
    required_mastery: float
    gap: float
    importance: str
    weight: float
    status: str  # 'mastered' | 'proficient' | 'developing' | 'critical_gap'


class RoleMatchResultDTO(BaseModel):
    role_id: uuid.UUID
    role_code: str
    role_title: str
    sector: str
    match_score: float = Field(..., ge=0.0, le=100.0, description="Overall weighted alignment score (0-100%)")
    strong_skills: List[str] = []
    development_skills: List[str] = []
    critical_gaps: List[str] = []
    skill_details: List[RoleMatchSkillDetailDTO] = []
    is_aspiring_role: bool = False


class LearnerRoleMatchesResponseDTO(BaseModel):
    learner_id: str
    aspiring_role: Optional[RoleMatchResultDTO] = None
    top_matches: List[RoleMatchResultDTO] = []
    computed_at: str


# ==============================================================================
# ML Tabular Feature Pipeline & Outcomes DTOs
# ==============================================================================

class MLFeatureVectorResponseDTO(BaseModel):
    learner_id: str
    features: Dict[str, float]
    feature_names: List[str]
    feature_vector: List[float]
    total_skills_assessed: int
    has_resume: bool
    resume_skills_count: int
    readiness_score: float
    leakage_guarantee: str = "Pre-outcome snapshot strictly enforced: no outcome metrics included."
    generated_at: str


class LearnerOutcomeCreateDTO(BaseModel):
    role_id: Optional[uuid.UUID] = None
    outcome_type: str = Field("INTERNSHIP_PLACED", description="'INTERNSHIP_OFFER' | 'INTERNSHIP_PLACED' | 'INTERNSHIP_ACCEPTED' | 'EMPLOYMENT_OFFERED' | 'EMPLOYMENT_ACCEPTED' | 'PLACED' | 'ASSESSMENT_COMPLETED' | 'RETAINED_90_DAY' | 'NOT_PLACED'")
    outcome_value: float = Field(1.0, description="1.0 for positive placement or numerical score/compensation")
    outcome_date: Optional[datetime] = None
    source: str = Field("DIRECT_PORTAL", max_length=100)
    status: str = Field("VERIFIED", description="'PENDING' | 'VERIFIED' | 'REJECTED'")
    confidence: Optional[float] = Field(None, description="Confidence score 0.0 - 1.0 (auto-derived from source if omitted)")
    notes: Optional[str] = None


class LearnerOutcomeResponseDTO(BaseModel):
    id: uuid.UUID
    learner_id: str
    role_id: Optional[uuid.UUID] = None
    role_title: Optional[str] = None
    outcome_type: str
    outcome_value: float
    outcome_date: datetime
    source: str
    status: str = "VERIFIED"
    confidence: float = 1.0
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
