from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


# ==============================================================================
# Nested AI Feature Sub-Schemas
# ==============================================================================

class CandidateSkillInputDTO(BaseModel):
    name: str = Field(..., description="Skill / Competency name e.g. 'React.js', 'Python'")
    sector: Optional[str] = Field("IT-ITeS", description="Industry sector")
    score_percentage: Optional[int] = Field(None, ge=0, le=100, description="Proficiency score 0-100")
    is_verified: Optional[bool] = Field(True, description="Whether credential is authenticated")

    model_config = ConfigDict(from_attributes=True)


class SkillGapItemDTO(BaseModel):
    skill: str = Field(..., description="Skill or competency gap name")
    priority: str = Field("High", description="Priority tier: 'Critical', 'High', 'Moderate', 'Low'")
    reason: str = Field(..., description="Explanation of why this skill gap matters for target employment")
    suggested_action: Optional[str] = Field(None, description="Recommended remediation action or coursework")

    model_config = ConfigDict(from_attributes=True)


class RoadmapPhaseDTO(BaseModel):
    phase: int = Field(..., description="Phase sequence index (1, 2, 3, etc.)")
    title: Optional[str] = Field(None, description="Phase title e.g. 'Foundational Diagnostics & Core Mastery'")
    duration: str = Field(..., description="Phase timeline duration e.g. 'Weeks 1-2' or '30 Hours'")
    skills: List[str] = Field(default_factory=list, description="Target competencies addressed in this phase")
    activities: List[str] = Field(default_factory=list, description="Curriculum modules, lab exercises, or practical drills")
    expected_outcome: Optional[str] = Field(None, description="Milestone benchmark outcome upon completion")

    model_config = ConfigDict(from_attributes=True)


class ProjectRecommendationDTO(BaseModel):
    title: str = Field(..., description="Project title")
    description: str = Field(..., description="Practical activity description")
    skills_applied: List[str] = Field(default_factory=list, description="Skills strengthened by this project")
    complexity: Optional[str] = Field("Intermediate", description="'Beginner', 'Intermediate', 'Advanced'")

    model_config = ConfigDict(from_attributes=True)


class JobReadinessDetailsDTO(BaseModel):
    readiness_level: str = Field(..., description="e.g. 'High Market Fit', 'Moderate Readiness', 'Foundation Building'")
    estimated_time_to_ready: str = Field(..., description="e.g. '3–4 Weeks with Bridge Module'")
    recommended_target_roles: List[str] = Field(default_factory=list, description="Specific target job roles aligned with candidate trajectory")
    key_advice: str = Field(..., description="Strategic recommendations for employer interviews and hiring benchmarks")

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Request & Response Root Schemas
# ==============================================================================

class SkillGapAnalysisRequestDTO(BaseModel):
    learner_id: Optional[str] = Field(None, description="Learner ID if looking up / linking existing learner e.g. 'KN-2026-9812'")
    full_name: str = Field(..., min_length=2, max_length=150, description="Learner full name")
    target_occupation: Optional[str] = Field("Full Stack Web Developer", description="Target job role / occupation")
    current_skills: Optional[List[CandidateSkillInputDTO]] = Field(default_factory=list, description="Current candidate skills")
    completed_courses: Optional[List[str]] = Field(default_factory=list, description="Completed courses or training programs")
    education_level: Optional[str] = Field(None, description="Candidate education level e.g. 'Vocational Diploma'")
    nsqf_level: Optional[str] = Field(None, description="NSQF Qualification Level e.g. 'NSQF Level 5'")
    district_name: Optional[str] = Field(None, description="District / Region e.g. 'Lucknow, UP'")
    employment_readiness_score: Optional[int] = Field(None, ge=0, le=100, description="Current employment readiness score")
    overall_progress: Optional[int] = Field(None, ge=0, le=100, description="Overall course progress percentage")
    existing_gaps: Optional[List[str]] = Field(default_factory=list, description="Known skill deficits")


class SkillGapAnalysisResponseDTO(BaseModel):
    learner_id: Optional[str] = None
    full_name: str
    target_occupation: str
    summary: str = Field(..., description="Executive summary of the candidate's profile and readiness trajectory")
    strengths: List[str] = Field(default_factory=list, description="Core verified competency strengths")
    skill_gaps: List[SkillGapItemDTO] = Field(default_factory=list, description="Identified skill gaps with priority and rationale")
    priority_skill_gaps: List[str] = Field(default_factory=list, description="Top priority skill gaps requiring immediate focus")
    roadmap: List[RoadmapPhaseDTO] = Field(default_factory=list, description="Personalized phased learning roadmap")
    recommended_sequence: List[str] = Field(default_factory=list, description="Ordered step-by-step learning sequence")
    projects: List[ProjectRecommendationDTO] = Field(default_factory=list, description="Suggested practical projects and lab activities")
    job_readiness: Union[JobReadinessDetailsDTO, str] = Field(..., description="Job-readiness recommendations and evaluation")
    is_ai_generated: bool = True
    model_used: str = "gemini-3.7-flash"
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    model_config = ConfigDict(from_attributes=True)
