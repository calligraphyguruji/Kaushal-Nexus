from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid

from src.core.logging import logger
from src.schemas.career_intelligence_dto import ActionType, NextBestActionDTO
from src.schemas.learner_intelligence_dto import RoleMatchResultDTO


class CareerActionService:
    """
    Synthesizes learner mastery states, role gaps, learning progress,
    project evidence, and application velocity to generate prioritized,
    evidence-backed next-best actions.
    """

    LEARNING_ACTION_TYPES = {
        ActionType.PRACTICE_DRILL,
        ActionType.LEARN_SKILL,
        ActionType.REASSESS,
        ActionType.IMPROVE_ROLE_ALIGNMENT,
    }

    APPLICATION_ACTION_TYPES = {
        ActionType.APPLY_TO_ROLE,
        ActionType.PREPARE_INTERVIEW,
        ActionType.CONTINUE_APPLICATIONS,
        ActionType.UPDATE_RESUME,
        ActionType.COMPLETE_PROJECT,
        ActionType.IMPROVE_PROJECT,
    }

    @classmethod
    def prioritize_actions(
        cls,
        role_match: Optional[RoleMatchResultDTO],
        readiness_score: float,
        readiness_tier: str,
        placement_probability: float,
        projects: List[Any],
        applications: List[Any],
        learning_progress: Optional[Any] = None,
        recent_practice_count: int = 0,
        resume_age_days: Optional[int] = None,
    ) -> List[NextBestActionDTO]:
        """
        Builds a ranked list of NextBestActionDTOs with auditable evidence.
        Higher priority score (0.0 to 1.0) reflects higher urgency.
        """
        actions: List[NextBestActionDTO] = []
        target_role_title = role_match.role_title if role_match else "Target Role"

        # 1. Interview Urgency: Highest priority if interview is ongoing/scheduled
        active_interviews = [
            a for a in applications
            if getattr(a, "status", "") in ("INTERVIEW_SCHEDULED", "INTERVIEWING")
        ]
        if active_interviews:
            first_int = active_interviews[0]
            org = getattr(first_int, "organization_name", "Employer")
            job = getattr(first_int, "job_title", target_role_title)
            actions.append(
                NextBestActionDTO(
                    action_type=ActionType.PREPARE_INTERVIEW,
                    priority=0.96,
                    title=f"Prepare for Interview with {org}",
                    reason=f"You have an active interview in progress for {job}. Review core technical topics and mock behavioral questions.",
                    related_role=job,
                    estimated_effort_hours=4.0,
                    evidence={
                        "organization_name": org,
                        "status": getattr(first_int, "status", ""),
                        "applied_at": str(getattr(first_int, "applied_at", "")),
                    },
                )
            )

        # 2. Critical Skill Gaps & Practice Drills
        if role_match and role_match.skill_details:
            critical_skills = [
                s for s in role_match.skill_details
                if s.status == "critical_gap" or s.gap >= 0.25
            ]
            for s in critical_skills[:3]:  # Top 3 critical gaps
                prio = min(0.93, round(0.72 + (s.gap * 0.25), 2))
                actions.append(
                    NextBestActionDTO(
                        action_type=ActionType.PRACTICE_DRILL,
                        priority=prio,
                        title=f"Practice Drill: {s.skill_name}",
                        reason=f"Identified critical deficit of {round(s.gap * 100, 1)}% against the {target_role_title} target. Adaptive drills will reinforce weak subskills.",
                        related_skill=s.skill_name,
                        related_role=target_role_title,
                        estimated_effort_hours=round(max(2.0, s.gap * 8.0), 1),
                        evidence={
                            "skill_name": s.skill_name,
                            "current_mastery": s.current_mastery,
                            "required_mastery": s.required_mastery,
                            "gap": s.gap,
                            "importance": s.importance,
                        },
                    )
                )

        # 3. Targeted Reassessment if recent practice occurred or plan modules completed
        if recent_practice_count >= 2 or (
            learning_progress and getattr(learning_progress, "skills_mastered_count", 0) > 0
        ):
            skill_to_reassess = (
                role_match.critical_gaps[0]
                if role_match and role_match.critical_gaps
                else "Core Competency"
            )
            actions.append(
                NextBestActionDTO(
                    action_type=ActionType.REASSESS,
                    priority=0.86,
                    title=f"Targeted Reassessment: {skill_to_reassess}",
                    reason="You have active practice or study history. Take a diagnostic reassessment to update your Bayesian mastery state.",
                    related_skill=skill_to_reassess,
                    related_role=target_role_title,
                    estimated_effort_hours=1.0,
                    evidence={
                        "recent_practice_count": recent_practice_count,
                        "prompt": "Verified assessment attempt updates BKT posterior.",
                    },
                )
            )

        # 4. Practical Project Evidence
        verified_projects = [
            p for p in projects
            if getattr(p, "verification_status", "") in ("VERIFIED", "INSTITUTION_VERIFIED")
        ]
        if len(projects) == 0:
            actions.append(
                NextBestActionDTO(
                    action_type=ActionType.COMPLETE_PROJECT,
                    priority=0.84,
                    title="Build Industry-Aligned Capstone Project",
                    reason="Employers and placement evaluators look for concrete portfolio code evidence. Implement an end-to-end project applying core competencies.",
                    related_role=target_role_title,
                    estimated_effort_hours=16.0,
                    evidence={
                        "total_projects": 0,
                        "verified_projects": 0,
                        "gap": "Lack of practical code evidence",
                    },
                )
            )
        elif len(verified_projects) == 0:
            unverified = projects[0]
            actions.append(
                NextBestActionDTO(
                    action_type=ActionType.IMPROVE_PROJECT,
                    priority=0.74,
                    title=f"Enhance Portfolio Proof: {getattr(unverified, 'title', 'Project')}",
                    reason="Attach working GitHub repository code and a live deployed demonstration link to verify implementation quality.",
                    related_role=target_role_title,
                    estimated_effort_hours=3.0,
                    evidence={
                        "project_title": getattr(unverified, "title", ""),
                        "has_github": bool(getattr(unverified, "github_url", "")),
                        "has_live": bool(getattr(unverified, "live_url", "")),
                    },
                )
            )

        # 5. Target Role Alignment Calibration
        if role_match and role_match.match_score < 50.0:
            actions.append(
                NextBestActionDTO(
                    action_type=ActionType.IMPROVE_ROLE_ALIGNMENT,
                    priority=0.78,
                    title="Review Target Role Alignment & Prerequisites",
                    reason=f"Current competency profile matches {role_match.match_score}% of requirements for {target_role_title}. Focus on prerequisite skills before intermediate topics.",
                    related_role=target_role_title,
                    estimated_effort_hours=2.5,
                    evidence={
                        "match_score": role_match.match_score,
                        "critical_gaps_count": len(role_match.critical_gaps),
                    },
                )
            )

        # 6. Apply to Roles / Application Pipeline
        active_applications_count = len(applications)
        if readiness_score >= 0.58 or placement_probability >= 0.45 or readiness_tier in ("CAREER_READY", "STRONG_READINESS"):
            if active_applications_count < 3:
                actions.append(
                    NextBestActionDTO(
                        action_type=ActionType.APPLY_TO_ROLE,
                        priority=0.89,
                        title=f"Submit Applications for {target_role_title} Openings",
                        reason=f"Your readiness profile ({readiness_tier}) meets primary qualification benchmarks. Initiate applications to verified employer openings.",
                        related_role=target_role_title,
                        estimated_effort_hours=3.0,
                        evidence={
                            "readiness_score": round(readiness_score, 2),
                            "placement_probability": round(placement_probability, 2),
                            "active_applications": active_applications_count,
                        },
                    )
                )
            else:
                actions.append(
                    NextBestActionDTO(
                        action_type=ActionType.CONTINUE_APPLICATIONS,
                        priority=0.70,
                        title="Maintain Application Momentum & Follow-Ups",
                        reason=f"You have {active_applications_count} applications submitted. Follow up on status updates and track feedback.",
                        related_role=target_role_title,
                        estimated_effort_hours=2.0,
                        evidence={"active_applications": active_applications_count},
                    )
                )

        # 7. Resume Update if stale
        if resume_age_days is not None and resume_age_days > 45:
            actions.append(
                NextBestActionDTO(
                    action_type=ActionType.UPDATE_RESUME,
                    priority=0.62,
                    title="Refresh Resume with Recent Competencies",
                    reason=f"Your resume was updated {resume_age_days} days ago. Ensure new projects, verified skills, and certifications are listed.",
                    related_role=target_role_title,
                    estimated_effort_hours=1.5,
                    evidence={"resume_age_days": resume_age_days},
                )
            )

        # Sort actions strictly by priority descending
        actions.sort(key=lambda a: a.priority, reverse=True)

        # Deduplicate titles if any
        seen_titles = set()
        deduped = []
        for a in actions:
            if a.title not in seen_titles:
                seen_titles.add(a.title)
                deduped.append(a)

        return deduped[:6]

    @classmethod
    def filter_learning_recommendations(cls, actions: List[NextBestActionDTO]) -> List[NextBestActionDTO]:
        return [a for a in actions if a.action_type in cls.LEARNING_ACTION_TYPES]

    @classmethod
    def filter_application_recommendations(cls, actions: List[NextBestActionDTO]) -> List[NextBestActionDTO]:
        return [a for a in actions if a.action_type in cls.APPLICATION_ACTION_TYPES]


career_action_service = CareerActionService()
