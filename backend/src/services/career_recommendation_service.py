from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid

from src.core.logging import logger
from src.schemas.career_intelligence_dto import (
    CareerRecommendationDTO,
    RiskItemDTO,
    StrengthItemDTO,
)
from src.schemas.learner_intelligence_dto import RoleMatchResultDTO


class CareerRecommendationService:
    """
    Synthesizes multi-factor career intelligence into strategic guidance,
    highlighting key candidate strengths, priority risk factors, and
    non-coercive adjacent role opportunities.
    """

    @classmethod
    def extract_strengths(
        cls,
        role_match: Optional[RoleMatchResultDTO],
        readiness_score: float,
        placement_probability: float,
        projects: List[Any],
        applications: List[Any],
    ) -> List[StrengthItemDTO]:
        """Identifies verified competencies, portfolio credibility, and career milestones."""
        strengths: List[StrengthItemDTO] = []

        # 1. Competency Masteries
        if role_match and role_match.strong_skills:
            top_skills = role_match.strong_skills[:3]
            strengths.append(
                StrengthItemDTO(
                    title=f"Core Competency Strengths ({', '.join(top_skills)})",
                    description=f"Demonstrated verified mastery meeting or exceeding benchmark thresholds for {role_match.role_title}.",
                    evidence={
                        "strong_skills": top_skills,
                        "role_match_score": role_match.match_score,
                    },
                )
            )

        # 2. Portfolio Evidence
        verified_projects = [
            p for p in projects
            if getattr(p, "verification_status", "") in ("VERIFIED", "INSTITUTION_VERIFIED")
        ]
        if len(verified_projects) > 0:
            strengths.append(
                StrengthItemDTO(
                    title=f"Verified Technical Portfolio ({len(verified_projects)} project{'s' if len(verified_projects) > 1 else ''})",
                    description="Portfolio implementations have undergone institutional or evaluator verification with live repository evidence.",
                    evidence={
                        "verified_count": len(verified_projects),
                        "project_titles": [getattr(p, "title", "") for p in verified_projects[:2]],
                    },
                )
            )
        elif len(projects) > 0:
            strengths.append(
                StrengthItemDTO(
                    title=f"Active Project Submissions ({len(projects)} submitted)",
                    description="Candidate possesses hands-on project artifacts showcasing applied coding capabilities.",
                    evidence={"total_projects": len(projects)},
                )
            )

        # 3. Interview Traction
        interviewing_apps = [
            a for a in applications
            if getattr(a, "status", "") in ("INTERVIEW_SCHEDULED", "INTERVIEWING", "OFFERED", "ACCEPTED")
        ]
        if interviewing_apps:
            strengths.append(
                StrengthItemDTO(
                    title="Active Employer Pipeline Traction",
                    description=f"Successfully progressed to interview/offer phase with {len(interviewing_apps)} employer(s).",
                    evidence={
                        "organizations": [getattr(a, "organization_name", "") for a in interviewing_apps],
                    },
                )
            )

        # 4. Statistical Placement Index
        if placement_probability >= 0.65:
            strengths.append(
                StrengthItemDTO(
                    title="High Statistical Placement Velocity",
                    description=f"Calibrated 90-day forward placement probability is {round(placement_probability * 100, 1)}%, positioning candidate in top quartile.",
                    evidence={"placement_probability": round(placement_probability, 4)},
                )
            )

        return strengths

    @classmethod
    def extract_risks(
        cls,
        role_match: Optional[RoleMatchResultDTO],
        readiness_score: float,
        placement_probability: float,
        projects: List[Any],
        applications: List[Any],
    ) -> List[RiskItemDTO]:
        """Flags critical skill gaps, lack of practical proof, or pipeline bottlenecks."""
        risks: List[RiskItemDTO] = []

        # 1. Critical Skill Gaps
        if role_match and role_match.critical_gaps:
            risks.append(
                RiskItemDTO(
                    title=f"Critical Competency Gaps ({', '.join(role_match.critical_gaps[:2])})",
                    description=f"Key technical requirements for {role_match.role_title} have not reached baseline proficiency thresholds.",
                    severity="CRITICAL",
                    evidence={
                        "critical_gaps": role_match.critical_gaps,
                        "role_match_score": role_match.match_score,
                    },
                )
            )

        # 2. Project Proof Deficit
        verified_projects = [
            p for p in projects
            if getattr(p, "verification_status", "") in ("VERIFIED", "INSTITUTION_VERIFIED")
        ]
        if len(projects) == 0:
            risks.append(
                RiskItemDTO(
                    title="Absence of Practical Code Evidence",
                    description="No technical capstone projects or repository links are attached to candidate profile.",
                    severity="CRITICAL",
                    evidence={"projects_count": 0},
                )
            )
        elif len(verified_projects) == 0:
            risks.append(
                RiskItemDTO(
                    title="Unverified Project Portfolio",
                    description="Candidate projects have not completed evaluator review or lack live deployment links.",
                    severity="MODERATE",
                    evidence={"unverified_projects": len(projects)},
                )
            )

        # 3. Low Application Velocity When Ready
        if (readiness_score >= 0.60 or placement_probability >= 0.50) and len(applications) == 0:
            risks.append(
                RiskItemDTO(
                    title="Zero Active Application Pipeline",
                    description="Candidate is career-ready but has not initiated applications to open internship or job requisitions.",
                    severity="MODERATE",
                    evidence={
                        "readiness_score": round(readiness_score, 2),
                        "application_count": 0,
                    },
                )
            )

        # 4. Low Overall Match
        if role_match and role_match.match_score < 40.0:
            risks.append(
                RiskItemDTO(
                    title="Significant Role Requirement Divergence",
                    description=f"Overall match score ({role_match.match_score}%) indicates prerequisite coursework is required before intermediate placement.",
                    severity="MODERATE",
                    evidence={"match_score": role_match.match_score},
                )
            )

        return risks

    @classmethod
    def generate_career_recommendations(
        cls,
        role_match: Optional[RoleMatchResultDTO],
        all_role_matches: List[RoleMatchResultDTO],
        readiness_score: float,
        projects: List[Any],
    ) -> List[CareerRecommendationDTO]:
        """
        Generates strategic recommendations, including non-coercive
        adjacent role suggestions when an alternative role has materially better alignment.
        """
        recs: List[CareerRecommendationDTO] = []
        target_role_title = role_match.role_title if role_match else "Target Role"

        # 1. Non-Coercive Alternative Role Suggestion
        if role_match and all_role_matches:
            target_score = role_match.match_score
            for alt in all_role_matches:
                if alt.role_id != role_match.role_id and alt.match_score >= (target_score + 15.0):
                    recs.append(
                        CareerRecommendationDTO(
                            recommendation_type="ALTERNATIVE_ROLE_SUGGESTION",
                            title=f"Consider Exploring {alt.role_title}",
                            reason=(
                                f"Your current competency profile achieves a {round(alt.match_score, 1)}% alignment "
                                f"with {alt.role_title} (compared to {round(target_score, 1)}% for {target_role_title}). "
                                f"Exploring this pathway may provide faster near-term placement while you develop primary role requirements."
                            ),
                            priority=0.78,
                            target_role=target_role_title,
                            alternative_role=alt.role_title,
                            evidence={
                                "target_match_score": target_score,
                                "alternative_match_score": alt.match_score,
                                "strong_skills": alt.strong_skills[:3],
                                "critical_gaps_count": len(alt.critical_gaps),
                                "disclaimer": "Advisory recommendation only. Aspiring role choice remains under candidate control.",
                            },
                        )
                    )
                    break  # Suggest highest alternative match only

        # 2. Portfolio Verification Recommendation
        unverified_projects = [
            p for p in projects
            if getattr(p, "verification_status", "") not in ("VERIFIED", "INSTITUTION_VERIFIED")
        ]
        if unverified_projects:
            recs.append(
                CareerRecommendationDTO(
                    recommendation_type="VERIFY_PORTFOLIO",
                    title="Request Evaluator Verification for Projects",
                    reason="Verified project artifacts establish tamper-proof proof of work for prospective hiring partners.",
                    priority=0.72,
                    target_role=target_role_title,
                    evidence={"unverified_count": len(unverified_projects)},
                )
            )

        # 3. Targeted Bridge Module
        if role_match and role_match.critical_gaps:
            top_gap = role_match.critical_gaps[0]
            recs.append(
                CareerRecommendationDTO(
                    recommendation_type="BRIDGE_MODULE_FOCUS",
                    title=f"Prioritize Bridge Module for {top_gap}",
                    reason=f"Closing the deficit in {top_gap} delivers the highest marginal gain in qualification for {target_role_title}.",
                    priority=0.85,
                    target_role=target_role_title,
                    evidence={"priority_gap": top_gap},
                )
            )

        return recs


career_recommendation_service = CareerRecommendationService()
