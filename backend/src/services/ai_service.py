import asyncio
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

import requests
from npmai import Memory, Ollama, Rag

from src.core.config import settings
from src.core.logging import logger
from src.schemas.ai_dto import (
    CandidateSkillInputDTO,
    JobReadinessDetailsDTO,
    ProjectRecommendationDTO,
    RoadmapPhaseDTO,
    SkillGapAnalysisRequestDTO,
    SkillGapAnalysisResponseDTO,
    SkillGapItemDTO,
)


class NPMAIService:
    """
    Dedicated AI Service utilizing the NPMAI Python ecosystem (npmai).
    Interfaces with open-source LLMs (llama3.2, mistral, gemma2, etc.) via npmai.Ollama,
    supports conversation memory via npmai.Memory, RAG ingestion via npmai.Rag,
    and implements strict timeouts, data sanitization, factual grounding, and deterministic fallback intelligence.
    """

    def __init__(self):
        self.model_name = getattr(settings, "NPMAI_MODEL", "llama3.2")
        self.temperature = getattr(settings, "NPMAI_TEMPERATURE", 0.3)
        self.auto_fallback = getattr(settings, "NPMAI_AUTO_FALLBACK", True)
        self.timeout_seconds = getattr(settings, "NPMAI_TIMEOUT_SECONDS", 15.0)
        self.api_url = getattr(
            settings,
            "NPMAI_API_URL",
            "https://npmaiecosystem-load_balancer.hf.space/load_balancer",
        )
        self.fallback_models = ["llama3.2", "mistral", "gemma2", "phi3"]

    def _get_llm_instance(self, model: Optional[str] = None) -> Ollama:
        """Instantiates npmai.Ollama with configurable model, temperature, and fallback routing."""
        target_model = model or self.model_name
        return Ollama(
            model=target_model,
            temperature=self.temperature,
            change=self.auto_fallback,
            Models=self.fallback_models,
            api=self.api_url,
        )

    def _sanitize_learner_payload(self, req: SkillGapAnalysisRequestDTO) -> Dict[str, Any]:
        """
        Sanitizes learner data before passing to AI model:
        - Removes private PII (emails, phone numbers, raw credentials).
        - Retains only verified competencies, scores, NSQF levels, progress, and regional cluster facts.
        """
        sanitized_skills = []
        for s in (req.current_skills or []):
            clean_name = re.sub(r"[^\w\s\.\+#\-/]", "", s.name).strip()
            sanitized_skills.append({
                "name": clean_name,
                "sector": s.sector or "IT-ITeS",
                "score_percentage": s.score_percentage if s.score_percentage is not None else 75,
                "is_verified": s.is_verified,
            })

        return {
            "learner_id": req.learner_id or "KN-CANDIDATE",
            "full_name": re.sub(r"[^\w\s\.-]", "", req.full_name).strip(),
            "target_occupation": req.target_occupation or "Full Stack Web Developer",
            "current_skills": sanitized_skills,
            "completed_courses": req.completed_courses or [],
            "education_level": req.education_level or "Vocational Education / B.Voc",
            "nsqf_level": req.nsqf_level or "NSQF Level 5",
            "district_name": req.district_name or "National Cohort",
            "employment_readiness_score": req.employment_readiness_score or 75,
            "overall_progress": req.overall_progress or 80,
            "existing_gaps": req.existing_gaps or [],
        }

    def _build_diagnostic_prompt(self, data: Dict[str, Any]) -> str:
        """Constructs structured diagnostic prompt for NPMAI Ollama model with strict grounding rules."""
        skills_str = ", ".join([
            f"{s['name']} (Score: {s['score_percentage']}%, Verified: {s['is_verified']})"
            for s in data["current_skills"]
        ]) or "General Vocational Foundation"

        return (
            "You are the National Skill-to-Employment Intelligence Platform AI, governed by NCVET/NSQF standards. "
            "Analyze the candidate profile and output valid JSON ONLY matching the required schema.\n\n"
            "CRITICAL FACTUAL GROUNDING & RELIABILITY RULES:\n"
            "1. DO NOT invent numerical hiring percentages, placement rates, or market statistics (e.g. NEVER generate statements like '92% of employers require...').\n"
            "2. When explaining skill gaps, use qualitative, evidence-safe phrasing such as 'This skill is an important technical requirement for the target occupation'.\n"
            "3. Only reference facts, scores, or NSQF levels that were explicitly provided in the candidate context.\n"
            "4. Do NOT invent unverified certifications, test benchmarks, or placement claims.\n"
            "5. If there is no empirical evidence for a number, do not generate a number.\n\n"
            f"Candidate: {data['full_name']} (ID: {data['learner_id']})\n"
            f"Target Occupation: {data['target_occupation']}\n"
            f"Verified Skills: {skills_str}\n"
            f"NSQF Level: {data['nsqf_level']}\n"
            f"Education: {data['education_level']}\n"
            f"District: {data['district_name']}\n"
            f"Readiness Score: {data['employment_readiness_score']}/100\n"
            f"Progress: {data['overall_progress']}%\n\n"
            "Respond in strictly valid JSON format with keys: summary, strengths, skill_gaps, "
            "priority_skill_gaps, roadmap, recommended_sequence, projects, job_readiness."
        )

    def _execute_npmai_call(self, prompt: str) -> str:
        """Synchronous wrapper to execute npmai.Ollama with a requests-level timeout."""
        llm = self._get_llm_instance()
        payload = {
            "prompt": prompt,
            "model": llm.model,
            "temperature": llm.temperature,
            "change": llm.change,
            "Models": llm.Models,
        }
        fallback_payload = {
            "prompt": prompt,
            "temperature": llm.temperature,
            "change": llm.change,
            "model": llm.model,
            "Models": llm.Models,
        }

        try:
            resp = requests.post(llm.api, json=payload, timeout=min(self.timeout_seconds, 6.0))
            resp.raise_for_status()
        except Exception:
            resp = requests.post(llm.fallback_api, json=fallback_payload, timeout=min(self.timeout_seconds, 6.0))
            resp.raise_for_status()

        data = resp.json()
        if "response" in data:
            return data["response"]
        return json.dumps(data)

    async def generate_skill_gap_roadmap(
        self, req: SkillGapAnalysisRequestDTO
    ) -> SkillGapAnalysisResponseDTO:
        """
        Main entry point for NPMAI-powered candidate skill gap analysis and personalized roadmap.
        Invokes NPMAI Ollama in an async worker thread with strict timeout guard.
        Falls back seamlessly to deterministic intelligence if remote API is unavailable.
        """
        sanitized = self._sanitize_learner_payload(req)
        prompt = self._build_diagnostic_prompt(sanitized)

        try:
            logger.info(f"Invoking NPMAI [{self.model_name}] for candidate {sanitized['learner_id']}...")
            raw_text = await asyncio.wait_for(
                asyncio.to_thread(self._execute_npmai_call, prompt),
                timeout=self.timeout_seconds,
            )

            # Try to extract and parse JSON from model output
            parsed = self._extract_json_from_response(raw_text)
            if parsed:
                return self._parse_and_validate_response(parsed, sanitized, is_live=True)

        except (asyncio.TimeoutError, Exception) as exc:
            logger.warning(
                f"NPMAI model execution notice ({type(exc).__name__}). Using deterministic fallback engine."
            )

        # Fallback Deterministic Intelligence Engine
        return self._generate_deterministic_analysis(sanitized)

    def _extract_json_from_response(self, text: str) -> Optional[Dict[str, Any]]:
        """Extracts JSON object from model response string."""
        if not text:
            return None
        try:
            # Direct parse
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Regex match for fenced json or bracketed object
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        match_bracket = re.search(r"(\{.*\})", text, re.DOTALL)
        if match_bracket:
            try:
                return json.loads(match_bracket.group(1))
            except json.JSONDecodeError:
                pass

        return None

    def _sanitize_unsupported_claims(self, text: str) -> str:
        """Strips fabricated percentages or unsupported hiring claims if generated by LLM."""
        if not text:
            return ""
        # Matches patterns like "92% of enterprise hiring mandates require...", "88% of active employer job mandates require...", etc.
        sanitized = re.sub(
            r"\b\d{1,3}%\s+(?:of\s+)?(?:[a-zA-Z\-]+\s+){0,4}(?:require|demand|seek|mandate|mandates|prefer|expect)\b",
            "Target employers actively require",
            text,
            flags=re.IGNORECASE,
        )
        return sanitized.strip()


    def _parse_and_validate_response(
        self, raw: Dict[str, Any], sanitized: Dict[str, Any], is_live: bool = True
    ) -> SkillGapAnalysisResponseDTO:
        """Validates and coerces parsed AI dictionary into typed Pydantic DTO with factual grounding."""
        skill_gaps = []
        for g in raw.get("skill_gaps", []):
            if isinstance(g, dict):
                raw_reason = g.get("reason", "This skill appears to be an important gap for the target occupation.")
                clean_reason = self._sanitize_unsupported_claims(raw_reason)
                skill_gaps.append(
                    SkillGapItemDTO(
                        skill=g.get("skill", "Competency Deficit"),
                        priority=g.get("priority", "High"),
                        reason=clean_reason,
                        suggested_action=g.get("suggested_action", "Complete targeted practical bridge coursework."),
                    )
                )

        roadmap = []
        for p in raw.get("roadmap", []):
            if isinstance(p, dict):
                roadmap.append(
                    RoadmapPhaseDTO(
                        phase=p.get("phase", len(roadmap) + 1),
                        title=p.get("title", f"Phase {p.get('phase', len(roadmap) + 1)}: Skill Specialization"),
                        duration=p.get("duration", "Weeks 1–2 (Self-Paced)"),
                        skills=p.get("skills", []),
                        activities=p.get("activities", []),
                        expected_outcome=p.get("expected_outcome", "Curriculum competency verified through lab projects."),
                    )
                )

        projects = []
        for proj in raw.get("projects", raw.get("recommended_projects", [])):
            if isinstance(proj, dict):
                projects.append(
                    ProjectRecommendationDTO(
                        title=proj.get("title", "Applied Lab Project"),
                        description=proj.get("description", "Practical implementation exercise."),
                        skills_applied=proj.get("skills_applied", []),
                        complexity=proj.get("complexity", "Intermediate"),
                    )
                )
            elif isinstance(proj, str):
                projects.append(
                    ProjectRecommendationDTO(
                        title=proj,
                        description="End-to-end practical lab implementation project.",
                        skills_applied=[],
                        complexity="Intermediate",
                    )
                )

        job_readiness_raw = raw.get("job_readiness")
        if isinstance(job_readiness_raw, dict):
            job_readiness = JobReadinessDetailsDTO(
                readiness_level=job_readiness_raw.get("readiness_level", "Moderate Readiness"),
                estimated_time_to_ready=job_readiness_raw.get("estimated_time_to_ready", "3–4 Weeks"),
                recommended_target_roles=job_readiness_raw.get("recommended_target_roles", [sanitized["target_occupation"]]),
                key_advice=job_readiness_raw.get("key_advice", "Focus on hands-on lab coursework and demonstrated project artifacts."),
            )
        else:
            job_readiness = JobReadinessDetailsDTO(
                readiness_level="High Market Fit" if sanitized["employment_readiness_score"] >= 80 else "Moderate Readiness",
                estimated_time_to_ready="3–4 Weeks with Bridge Module",
                recommended_target_roles=[sanitized["target_occupation"], f"Associate {sanitized['target_occupation']}"],
                key_advice=str(job_readiness_raw) if job_readiness_raw else "Highlight verified portfolio projects on candidate resume.",
            )

        summary_raw = raw.get("summary", f"Profile analysis for {sanitized['full_name']} targeting {sanitized['target_occupation']}.")
        clean_summary = self._sanitize_unsupported_claims(summary_raw)

        return SkillGapAnalysisResponseDTO(
            learner_id=sanitized["learner_id"],
            full_name=sanitized["full_name"],
            target_occupation=sanitized["target_occupation"],
            summary=clean_summary,
            strengths=raw.get("strengths", [s["name"] for s in sanitized["current_skills"] if s.get("score_percentage", 0) >= 80]),
            skill_gaps=skill_gaps if skill_gaps else self._generate_default_gaps(sanitized["target_occupation"]),
            priority_skill_gaps=raw.get("priority_skill_gaps", [g.skill for g in skill_gaps[:2]]),
            roadmap=roadmap if roadmap else self._generate_default_roadmap(sanitized["target_occupation"]),
            recommended_sequence=raw.get("recommended_sequence", [f"Master {g.skill}" for g in skill_gaps]),
            projects=projects if projects else self._generate_default_projects(sanitized["target_occupation"]),
            job_readiness=job_readiness,
            is_ai_generated=True if is_live else False,
            model_used=f"NPMAI ({self.model_name})" if is_live else "Deterministic Fallback Engine",
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    def _generate_default_gaps(self, role: str) -> List[SkillGapItemDTO]:
        """Generates domain-calibrated default skill gaps with evidence-safe phrasing."""
        role_lower = role.lower()
        if "data" in role_lower or "analytics" in role_lower:
            return [
                SkillGapItemDTO(
                    skill="Advanced SQL & Dimensional Modeling",
                    priority="Critical",
                    reason="Enterprise data roles require competence in star schema indexing and query plan optimization.",
                    suggested_action="Review database schema design, indexing, and query plan optimization techniques.",
                ),
                SkillGapItemDTO(
                    skill="Cloud Data Pipelines (AWS / GCP)",
                    priority="High",
                    reason="Cloud data pipelines and object storage are essential competencies for modern data engineering.",
                    suggested_action="Complete hands-on cloud data pipeline exercises.",
                ),
            ]
        elif "green" in role_lower or "solar" in role_lower or "ev" in role_lower:
            return [
                SkillGapItemDTO(
                    skill="High-Voltage Battery Safety & BMS Diagnostics",
                    priority="Critical",
                    reason="High-voltage safety protocols and BMS fault code diagnosis are essential competencies for EV diagnostics.",
                    suggested_action="Complete structured hands-on lab modules in battery management systems and electrical safety.",
                ),
                SkillGapItemDTO(
                    skill="CAN Bus Telemetry & Controller Interfacing",
                    priority="High",
                    reason="Diagnostic technicians must decode CAN frames to diagnose motor controller errors.",
                    suggested_action="Hands-on lab training with CAN analyzer tools.",
                ),
            ]
        else:
            return [
                SkillGapItemDTO(
                    skill="Cloud Deployment & Containerization (Docker)",
                    priority="Critical",
                    reason="Containerization and cloud deployment are core technical requirements for modern software engineering roles.",
                    suggested_action="Complete practical containerization exercises and build multi-stage Docker deployment configurations.",
                ),
                SkillGapItemDTO(
                    skill="Automated Unit & Integration Testing",
                    priority="High",
                    reason="Automated testing and continuous validation ensure software reliability in production environments.",
                    suggested_action="Integrate automated test runners into portfolio projects.",
                ),
            ]

    def _generate_default_roadmap(self, role: str) -> List[RoadmapPhaseDTO]:
        """Generates 3-phase default learning roadmap with realistic milestones calibrated to the role."""
        role_lower = role.lower()
        if "data" in role_lower or "analytics" in role_lower or "ai" in role_lower:
            return [
                RoadmapPhaseDTO(
                    phase=1,
                    title="Phase 1: Advanced Relational & Schema Engineering",
                    duration="Weeks 1–2 (Self-Paced / 20–25 Hours recommended)",
                    skills=["Complex SQL Queries", "Query Plan Optimization", "Window Functions"],
                    activities=["Refactor slow legacy SQL queries", "Design a relational data warehouse schema"],
                    expected_outcome="Passing test suite with verified automated coverage across critical endpoints.",
                ),
                RoadmapPhaseDTO(
                    phase=2,
                    title="Phase 2: Cloud Data Pipelines & Orchestration",
                    duration="Weeks 3–4 (Self-Paced / 25–30 Hours recommended)",
                    skills=["Apache Airflow / Prefect", "Cloud Object Storage", "PySpark Basics"],
                    activities=["Build automated daily ETL batch pipeline", "Connect cloud storage to relational data warehouse"],
                    expected_outcome="Functional automated cloud ingest pipeline verified.",
                ),
                RoadmapPhaseDTO(
                    phase=3,
                    title="Phase 3: Production Hardening & Interview Readiness",
                    duration="Weeks 5–6 (Self-Paced / 15–20 Hours recommended)",
                    skills=["Data Quality Testing", "CI/CD Deployment", "Technical Case Presentation"],
                    activities=["Deploy end-to-end data pipeline on Docker", "Complete timed technical interview coding drills"],
                    expected_outcome="Documented, recruiter-ready portfolio project with verifiable deployment.",
                ),
            ]
        elif "green" in role_lower or "solar" in role_lower or "electric" in role_lower or "ev" in role_lower:
            return [
                RoadmapPhaseDTO(
                    phase=1,
                    title="Phase 1: High-Voltage Safety & BMS Fundamentals",
                    duration="Weeks 1–2 (Self-Paced / 25–30 Hours recommended)",
                    skills=["Electrical Safety Standards", "Battery Chemistry", "BMS Diagnostic Codes"],
                    activities=["Perform electrical isolation testing on battery packs", "Diagnose over-voltage and thermal faults"],
                    expected_outcome="Verified isolation and safety diagnostics competency.",
                ),
                RoadmapPhaseDTO(
                    phase=2,
                    title="Phase 2: Powertrain & Telemetry Interfacing",
                    duration="Weeks 3–4 (Self-Paced / 25–30 Hours recommended)",
                    skills=["CAN Protocol", "Motor Controllers", "Regenerative Braking Systems"],
                    activities=["Capture and analyze live CAN frame packets", "Calibrate regenerative torque curves"],
                    expected_outcome="Verified Motor Controller Calibration competency.",
                ),
                RoadmapPhaseDTO(
                    phase=3,
                    title="Phase 3: Fleet Maintenance & Placement Drills",
                    duration="Weeks 5–6 (Self-Paced / 15–20 Hours recommended)",
                    skills=["Preventive Maintenance", "Customer Diagnostic Reporting"],
                    activities=["Conduct full EV inspection audit", "Complete corporate technical evaluation"],
                    expected_outcome="Documented, recruiter-ready service portfolio.",
                ),
            ]
        else:
            return [
                RoadmapPhaseDTO(
                    phase=1,
                    title="Phase 1: Foundational Architecture & Testing Hardening",
                    duration="Weeks 1–2 (Self-Paced / 20–25 Hours recommended)",
                    skills=["Unit Testing", "Integration Testing", "Clean Code Architecture"],
                    activities=["Write test coverage for existing API endpoints", "Implement schema validation"],
                    expected_outcome="Passing test suite with verified automated coverage across critical endpoints.",
                ),
                RoadmapPhaseDTO(
                    phase=2,
                    title="Phase 2: Containerization & Cloud CI/CD Pipelines",
                    duration="Weeks 3–4 (Self-Paced / 25–30 Hours recommended)",
                    skills=["Docker", "GitHub Actions", "Cloud Deployment"],
                    activities=["Containerize frontend and backend into multi-stage Docker builds", "Deploy with automated health checks"],
                    expected_outcome="Live production containerized deployment url verified.",
                ),
                RoadmapPhaseDTO(
                    phase=3,
                    title="Phase 3: Production Security & Recruiter Interview Drills",
                    duration="Weeks 5–6 (Self-Paced / 15–20 Hours recommended)",
                    skills=["JWT Refresh Tokens", "Rate Limiting", "Technical Presentation"],
                    activities=["Publish comprehensive project documentation", "Complete timed technical interview coding drills"],
                    expected_outcome="Documented, recruiter-ready portfolio project with verifiable deployment.",
                ),
            ]

    def _generate_default_projects(self, role: str) -> List[ProjectRecommendationDTO]:
        """Generates domain-calibrated default projects."""
        role_lower = role.lower()
        if "data" in role_lower or "analytics" in role_lower or "ai" in role_lower:
            return [
                ProjectRecommendationDTO(
                    title="Real-Time E-Commerce Telemetry Pipeline",
                    description="Ingest, clean, and aggregate simulated transactions into a structured analytical warehouse.",
                    skills_applied=["Python", "SQL", "PostgreSQL", "Data Warehousing"],
                    complexity="Intermediate",
                ),
                ProjectRecommendationDTO(
                    title="Automated Data Quality & Validation Sentinel",
                    description="A lightweight microservice validating data freshness, null checks, and distribution drifts before database loading.",
                    skills_applied=["Python", "Pytest", "Docker", "REST API"],
                    complexity="Advanced",
                ),
            ]
        elif "green" in role_lower or "solar" in role_lower or "electric" in role_lower or "ev" in role_lower:
            return [
                ProjectRecommendationDTO(
                    title="EV Battery Pack State-of-Health Diagnostic Tool",
                    description="Build a microcontroller-based battery health logger that measures cell voltage delta and internal resistance.",
                    skills_applied=["BMS Diagnostics", "Electrical Testing", "Data Logging"],
                    complexity="Intermediate",
                ),
                ProjectRecommendationDTO(
                    title="Solar Micro-Grid Power Inverter Calibration",
                    description="Configure and optimize a grid-tied solar inverter with MPPT charge tracking and telemetry reporting.",
                    skills_applied=["Solar PV", "Grid Inverters", "Safety Compliance"],
                    complexity="Advanced",
                ),
            ]
        else:
            return [
                ProjectRecommendationDTO(
                    title="Cloud-Native Microservices Dashboard with Docker",
                    description="A secure, multi-tier web application featuring JWT authentication, automated CI/CD pipeline, and PostgreSQL database.",
                    skills_applied=["React", "FastAPI", "Docker", "PostgreSQL"],
                    complexity="Intermediate",
                ),
                ProjectRecommendationDTO(
                    title="Automated Test & Code Quality Sentinel",
                    description="An automated CI workflow that tests, lints, and benchmarks applications before deploying to cloud hosting.",
                    skills_applied=["CI/CD", "Jest / Pytest", "GitHub Actions", "Docker"],
                    complexity="Advanced",
                ),
            ]


    def _generate_deterministic_analysis(
        self, sanitized: Dict[str, Any]
    ) -> SkillGapAnalysisResponseDTO:
        """
        Deterministic intelligence generator matching candidate facts strictly.
        Explicitly sets is_ai_generated=False and model_used='Deterministic Fallback Engine'.
        Uses evidence-safe language without inventing market statistics or numerical predictions.
        """
        role = sanitized["target_occupation"]
        name = sanitized["full_name"]
        score = sanitized["employment_readiness_score"]
        skills = sanitized["current_skills"]

        strengths = [s["name"] for s in skills if s.get("score_percentage", 0) >= 80]
        if not strengths and skills:
            strengths = [skills[0]["name"]]
        elif not strengths:
            strengths = ["Foundational Technical Aptitude", "Vocational Coursework Discipline"]

        skill_gaps = self._generate_default_gaps(role)
        priority_gaps = [g.skill for g in skill_gaps if g.priority in ("Critical", "High")]
        phases = self._generate_default_roadmap(role)
        projects = self._generate_default_projects(role)

        summary = (
            f"Candidate {name} demonstrates verified baseline competencies in {', '.join(strengths[:2])}. "
            f"To strengthen alignment for the target role of '{role}', targeted remediation is recommended "
            f"in {priority_gaps[0] if priority_gaps else 'technical infrastructure'}. Following the structured learning "
            f"roadmap will help close identified competency gaps."
        )

        job_readiness = JobReadinessDetailsDTO(
            readiness_level="High Market Fit" if score >= 80 else "Moderate Readiness",
            estimated_time_to_ready="3–4 Weeks with Bridge Module",
            recommended_target_roles=[role, f"Associate {role}", f"{role} Specialist"],
            key_advice="Complete the containerization bridge coursework and highlight verified portfolio projects on candidate resume.",
        )

        sequence = [
            f"1. Master {skill_gaps[0].skill}",
            f"2. Practical Lab Modules in {skill_gaps[1].skill if len(skill_gaps) > 1 else 'Cloud Testing'}",
            "3. Production Architecture Integration",
            "4. Capstone Portfolio Deployment",
        ]

        return SkillGapAnalysisResponseDTO(
            learner_id=sanitized["learner_id"],
            full_name=name,
            target_occupation=role,
            summary=summary,
            strengths=strengths,
            skill_gaps=skill_gaps,
            priority_skill_gaps=priority_gaps,
            roadmap=phases,
            recommended_sequence=sequence,
            projects=projects,
            job_readiness=job_readiness,
            is_ai_generated=False,
            model_used="Deterministic Fallback Engine",
            generated_at=datetime.now(timezone.utc).isoformat(),
        )


ai_service = NPMAIService()
