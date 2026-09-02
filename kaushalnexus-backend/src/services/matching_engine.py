from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional, Tuple
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import NotFoundException
from src.ml.embeddings import SkillEmbeddingService, skill_embedding_service
from src.ml.wage_predictor import WagePredictionService, wage_prediction_service
from src.models.competency import Competency, LearnerSkill
from src.models.district import District
from src.models.employer import Employer, HiringMandate
from src.models.learner import Learner
from src.schemas.matching_dto import (
    DispatchBatchRequestDTO,
    DispatchBatchResponseDTO,
    HiringMandateItemDTO,
    JobMatchResultDTO,
    LearnerMatchCalculationResponseDTO,
)


class MatchingEngine:
    """
    Explainable Multi-Signal Placement Matching Engine powered by ML embeddings.
    
    Mathematical Formulation:
      Score = 0.50 * SkillAlignment + 0.30 * LocationFit + 0.20 * Readiness
      
      LocationFit:
        1.0 = same district
        0.7 = same state (different district)
        0.4 = different state
        0.0 = incompatible
        
      Readiness:
        learner_readiness_score / 100.0
    """

    def __init__(
        self,
        embedding_service: Optional[SkillEmbeddingService] = None,
        wage_service: Optional[WagePredictionService] = None,
    ) -> None:
        self.embedding_service = embedding_service or skill_embedding_service
        self.wage_service = wage_service or wage_prediction_service

    @staticmethod
    def compute_location_fit(
        learner_district_id: Optional[str],
        learner_state: Optional[str],
        mandate_district_id: Optional[str],
        mandate_state: Optional[str],
    ) -> float:
        """Evaluates geographic proximity between candidate and employer job vacancy."""
        if mandate_district_id and learner_district_id:
            if learner_district_id.strip().upper() == mandate_district_id.strip().upper():
                return 1.0  # Same district

        if mandate_state and learner_state:
            if learner_state.strip().lower() == mandate_state.strip().lower():
                return 0.7  # Same state

        if mandate_state and learner_state:
            return 0.4  # Different state

        return 0.5  # Neutral default

    @classmethod
    def compute_skill_alignment(
        cls,
        learner_skills: List[LearnerSkill],
        required_skills: List[str],
        embedding_service: Optional[SkillEmbeddingService] = None,
    ) -> Tuple[float, List[str], List[str]]:
        """
        Calculates skill match ratio and competency score weights using semantic ML embeddings.
        Returns: (skill_alignment_ratio, matched_skills_list, missing_skills_list)
        """
        if not required_skills:
            return 1.0, ["General Industry Competencies"], []

        embed_svc = embedding_service or skill_embedding_service

        # Extract skill strings and proficiency map
        candidate_skill_names: List[str] = []
        learner_skill_map: Dict[str, int] = {}

        for ls in learner_skills:
            if ls.competency:
                name_clean = ls.competency.name
                code_clean = ls.competency.code
                candidate_skill_names.extend([name_clean, code_clean])
                learner_skill_map[name_clean.lower()] = ls.score_percentage
                learner_skill_map[code_clean.lower()] = ls.score_percentage

        # Use SkillEmbeddingService interface for semantic extraction
        matched, missing, match_scores = embed_svc.extract_matched_and_missing(
            candidate_skills=candidate_skill_names,
            required_skills=required_skills,
            threshold=0.35,
        )

        # Compute weighted proficiency score for matched skills
        weighted_scores: List[float] = []
        for req in matched:
            req_lower = req.lower().strip()
            found_score = None
            for key, score in learner_skill_map.items():
                if key in req_lower or req_lower in key:
                    found_score = score
                    break

            if found_score is not None:
                weighted_scores.append(min(1.0, max(0.4, found_score / 100.0)))
            else:
                weighted_scores.append(0.75)  # Baseline semantic match score

        match_ratio = len(matched) / len(required_skills)
        avg_proficiency = (
            sum(weighted_scores) / max(1, len(weighted_scores))
            if weighted_scores
            else 0.0
        )

        alignment = (match_ratio * 0.70) + (avg_proficiency * match_ratio * 0.30)
        return min(1.0, max(0.0, alignment)), matched, missing

    @classmethod
    def calculate_match_score(
        cls,
        skill_alignment: float,
        location_fit: float,
        readiness: float,
    ) -> float:
        """
        Score = 0.50 * SkillAlignment + 0.30 * LocationFit + 0.20 * Readiness
        """
        composite = (0.50 * skill_alignment) + (0.30 * location_fit) + (0.20 * readiness)
        return round(min(1.0, max(0.0, composite)) * 100.0, 1)

    @classmethod
    async def calculate_matches_for_learner(
        cls,
        db: AsyncSession,
        learner_id: str,
        top_n: int = 10,
    ) -> LearnerMatchCalculationResponseDTO:
        """Calculates multi-signal job match scores for a candidate across active mandates."""
        # 1. Fetch Candidate
        stmt = (
            select(Learner)
            .where(Learner.id == learner_id)
            .options(
                selectinload(Learner.district),
                selectinload(Learner.skills).selectinload(LearnerSkill.competency),
            )
        )
        result = await db.execute(stmt)
        learner = result.scalar_one_or_none()

        if not learner:
            raise NotFoundException(message=f"Candidate with ID '{learner_id}' not found.")

        # 2. Fetch Active Hiring Mandates
        mandates_stmt = (
            select(HiringMandate)
            .where(HiringMandate.is_active == True)
            .options(
                selectinload(HiringMandate.employer),
                selectinload(HiringMandate.district),
            )
            .order_by(HiringMandate.created_at.desc())
        )
        mandates = (await db.execute(mandates_stmt)).scalars().all()

        # If no active mandates in database, seed baseline mandates
        if not mandates:
            await cls._seed_default_mandates(db)
            mandates = (await db.execute(mandates_stmt)).scalars().all()

        readiness_norm = min(1.0, max(0.0, learner.employment_readiness_score / 100.0))
        learner_state = learner.district.state if learner.district else "Uttar Pradesh"
        learner_district_id = learner.district_id

        evaluated_matches: List[JobMatchResultDTO] = []

        for m in mandates:
            # Parse required competencies
            req_skills: List[str] = []
            if m.required_competencies_json:
                try:
                    req_skills = json.loads(m.required_competencies_json)
                except Exception:
                    req_skills = [m.sector]
            else:
                req_skills = [m.sector, "Core Technical Lab Proficiency"]

            # 1. Skill Alignment
            skill_align, matched_skills, missing_skills = cls.compute_skill_alignment(
                learner.skills, req_skills
            )

            # 2. Location Fit
            mandate_state = m.state or (m.district.state if m.district else "Uttar Pradesh")
            loc_fit = cls.compute_location_fit(
                learner_district_id, learner_state, m.district_id, mandate_state
            )

            # 3. Overall Match Score
            total_score = cls.calculate_match_score(skill_align, loc_fit, readiness_norm)

            # Verdict classification
            verdict = (
                "Strong Match" if total_score >= 80.0 else ("Good Match" if total_score >= 65.0 else "Moderate Match")
            )

            loc_str = f"{m.district.name if m.district else 'Statewide'}, {m.state}"
            salary_str = f"₹{m.salary_min_lpa:.1f} - ₹{m.salary_max_lpa:.1f} LPA"

            evaluated_matches.append(
                JobMatchResultDTO(
                    mandate_id=m.id,
                    job_title=m.job_title,
                    employer_name=m.employer.company_name if m.employer else "Enterprise Partner",
                    employer_tier=m.employer.tier if m.employer else "Enterprise",
                    sector=m.sector,
                    location=loc_str,
                    salary_range=salary_str,
                    openings_count=m.openings_count,
                    match_score=total_score,
                    skill_alignment=round(skill_align * 100.0, 1),
                    location_fit=round(loc_fit * 100.0, 1),
                    readiness=round(readiness_norm * 100.0, 1),
                    matched_skills=matched_skills,
                    missing_skills=missing_skills,
                    fit_verdict=verdict,
                )
            )

        evaluated_matches.sort(key=lambda x: x.match_score, reverse=True)

        return LearnerMatchCalculationResponseDTO(
            learner_id=learner.id,
            full_name=learner.full_name,
            district_id=learner.district_id,
            district_name=learner.district.name if learner.district else learner.district_id,
            state=learner_state,
            readiness_score=learner.employment_readiness_score,
            total_active_jobs_evaluated=len(mandates),
            top_matches=evaluated_matches[:top_n],
        )

    @classmethod
    async def list_mandates(
        cls,
        db: AsyncSession,
        sector: Optional[str] = None,
        state: Optional[str] = None,
        is_active: bool = True,
    ) -> List[HiringMandateItemDTO]:
        """Lists active employer hiring mandates."""
        query = (
            select(HiringMandate)
            .where(HiringMandate.is_active == is_active)
            .options(
                selectinload(HiringMandate.employer),
                selectinload(HiringMandate.district),
            )
            .order_by(HiringMandate.created_at.desc())
        )

        if sector and sector.strip():
            query = query.where(HiringMandate.sector.ilike(f"%{sector.strip()}%"))
        if state and state.strip():
            query = query.where(HiringMandate.state.ilike(f"%{state.strip()}%"))

        result = await db.execute(query)
        mandates = result.scalars().all()

        items: List[HiringMandateItemDTO] = []
        for m in mandates:
            req_skills = []
            if m.required_competencies_json:
                try:
                    req_skills = json.loads(m.required_competencies_json)
                except Exception:
                    req_skills = [m.sector]

            items.append(
                HiringMandateItemDTO(
                    id=m.id,
                    employer_id=m.employer_id,
                    employer_name=m.employer.company_name if m.employer else "Corporate Partner",
                    employer_tier=m.employer.tier if m.employer else "Enterprise",
                    job_title=m.job_title,
                    sector=m.sector,
                    district_id=m.district_id,
                    district_name=m.district.name if m.district else None,
                    state=m.state,
                    openings_count=m.openings_count,
                    min_nsqf_level=m.min_nsqf_level,
                    required_competencies=req_skills,
                    salary_range=f"₹{m.salary_min_lpa:.1f} - ₹{m.salary_max_lpa:.1f} LPA",
                    salary_min_lpa=m.salary_min_lpa,
                    salary_max_lpa=m.salary_max_lpa,
                    retention_benchmark_days=m.retention_benchmark_days,
                    is_active=m.is_active,
                    created_at=m.created_at,
                )
            )

        return items

    @classmethod
    async def dispatch_batch(
        cls,
        db: AsyncSession,
        req: DispatchBatchRequestDTO,
    ) -> DispatchBatchResponseDTO:
        """Dispatches shortlisted candidate batch to hiring partner."""
        mandate = await db.get(HiringMandate, req.mandate_id)
        if not mandate:
            raise NotFoundException(message=f"Hiring Mandate '{req.mandate_id}' not found.")

        # Update candidate statuses
        for l_id in req.learner_ids:
            learner = await db.get(Learner, l_id)
            if learner and learner.status == "In Training":
                learner.status = "Interview Ready"

        await db.commit()

        # Load employer
        employer = await db.get(Employer, mandate.employer_id)
        emp_name = employer.company_name if employer else "Hiring Partner"

        batch_id = uuid.uuid4()
        return DispatchBatchResponseDTO(
            batch_id=batch_id,
            mandate_id=mandate.id,
            job_title=mandate.job_title,
            employer_name=emp_name,
            candidates_dispatched_count=len(req.learner_ids),
            dispatched_learner_ids=req.learner_ids,
            status="DISPATCHED",
            dispatched_at=datetime.now(timezone.utc),
            message=(
                f"Successfully dispatched {len(req.learner_ids)} shortlisted candidates to {emp_name} "
                f"for position '{mandate.job_title}'."
            ),
        )

    # ==========================================================================
    # Internal Seed Helper
    # ==========================================================================

    @staticmethod
    async def _seed_default_mandates(db: AsyncSession) -> None:
        """Seeds baseline employers and hiring mandates for matching engine."""
        emp1 = Employer(
            company_name="TechNova Systems India",
            industry_sector="IT-ITeS",
            tier="Enterprise",
            contact_email="careers@technova.in",
            contact_person="Priya Nair",
        )
        emp2 = Employer(
            company_name="Bharat Precision Robotics",
            industry_sector="Smart Manufacturing",
            tier="Enterprise",
            contact_email="talent@bharatrobotics.com",
            contact_person="Karan Singhania",
        )
        db.add_all([emp1, emp2])
        await db.flush()

        m1 = HiringMandate(
            employer_id=emp1.id,
            job_title="Junior Cloud Operations Analyst",
            sector="IT-ITeS",
            state="Uttar Pradesh",
            openings_count=15,
            min_nsqf_level="NSQF Level 5",
            required_competencies_json=json.dumps(["Python for Data Analytics", "Cloud Engineering", "Linux"]),
            salary_min_lpa=3.6,
            salary_max_lpa=5.2,
            retention_benchmark_days=180,
            is_active=True,
        )
        m2 = HiringMandate(
            employer_id=emp2.id,
            job_title="CNC Multi-Axis Operator",
            sector="Smart Manufacturing",
            state="Uttar Pradesh",
            openings_count=20,
            min_nsqf_level="NSQF Level 4",
            required_competencies_json=json.dumps(["CNC Precision Machining", "Industrial Safety"]),
            salary_min_lpa=3.0,
            salary_max_lpa=4.2,
            retention_benchmark_days=180,
            is_active=True,
        )
        db.add_all([m1, m2])
        await db.commit()


matching_engine = MatchingEngine()
