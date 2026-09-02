import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

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


class GeminiAIService:
    """
    Core AI Service interfacing with Google Gemini Flash models.
    Supports structured JSON generation, input data sanitization, privacy protection,
    graceful timeout handling, factual grounding, and deterministic fallback generation.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL or "gemini-3.7-flash"
        self.timeout_seconds = getattr(settings, "GEMINI_API_TIMEOUT_SECONDS", 30.0)
        self.base_url = getattr(
            settings,
            "GEMINI_API_BASE_URL",
            "https://generativelanguage.googleapis.com/v1beta",
        )

    def _sanitize_learner_payload(self, req: SkillGapAnalysisRequestDTO) -> Dict[str, Any]:
        """
        Sanitizes learner profile before forwarding to AI:
        - Removes sensitive PII (emails, phone numbers, Aadhaar, private keys).
        - Retains only educational, vocational, skill assessment, and regional cluster metadata.
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

    def _build_system_instruction(self) -> str:
        """Constructs system prompt for the National Skill Analyst persona with strict grounding rules."""
        return (
            "You are the senior National Skill-to-Employment Intelligence AI Analyst for KaushalNexus, "
            "governed by NCVET and NSQF standards. Your role is to provide rigorous, actionable, "
            "and objective candidate skill gap diagnoses and personalized learning roadmaps.\n\n"
            "STRICT FACTUAL GROUNDING & RELIABILITY RULES:\n"
            "1. DO NOT invent numerical hiring percentages, placement rates, or market statistics (e.g. NEVER generate '92% of employers require...').\n"
            "2. Ground all diagnoses firmly in the candidate's actual provided competencies and target occupation.\n"
            "3. Clearly distinguish between verified candidate strengths and missing high-priority skill gaps.\n"
            "4. For each identified skill gap, provide a qualitative, evidence-safe explanation of why it matters for the target role.\n"
            "5. If there is no empirical evidence for a numerical claim, do not generate a number.\n"
            "6. Output MUST strictly follow the provided JSON schema."
        )

    def _build_user_prompt(self, sanitized_data: Dict[str, Any]) -> str:
        """Constructs structured user prompt containing sanitized candidate profile."""
        skills_text = ", ".join([
            f"{s['name']} (Score: {s['score_percentage']}%, Verified: {s['is_verified']})"
            for s in sanitized_data["current_skills"]
        ]) or "General Vocational IT Foundation"

        return (
            f"Analyze the following vocational beneficiary profile and generate a comprehensive "
            f"Skill Gap Analysis and Personalized Learning Roadmap:\n\n"
            f"- Candidate: {sanitized_data['full_name']} (ID: {sanitized_data['learner_id']})\n"
            f"- Target Job / Occupation: {sanitized_data['target_occupation']}\n"
            f"- Current Assessed Skills: {skills_text}\n"
            f"- NSQF Level: {sanitized_data['nsqf_level']}\n"
            f"- Education Level: {sanitized_data['education_level']}\n"
            f"- Region / District: {sanitized_data['district_name']}\n"
            f"- Employment Readiness Score: {sanitized_data['employment_readiness_score']}/100\n"
            f"- Overall Training Progress: {sanitized_data['overall_progress']}%\n"
            f"- Existing Identified Bottlenecks: {', '.join(sanitized_data['existing_gaps']) if sanitized_data['existing_gaps'] else 'None specified'}\n\n"
            f"Generate structured JSON output containing:\n"
            f"1. summary: A 2-3 sentence executive assessment of candidate fit for the target role.\n"
            f"2. strengths: Array of 2-4 verified strengths.\n"
            f"3. skill_gaps: Array of objects [{{\"skill\": string, \"priority\": \"Critical\"|\"High\"|\"Moderate\", \"reason\": string, \"suggested_action\": string}}].\n"
            f"4. priority_skill_gaps: Array of 2-3 top priority skill strings.\n"
            f"5. roadmap: Array of 3 phased milestones [{{\"phase\": integer, \"title\": string, \"duration\": string, \"skills\": [string], \"activities\": [string], \"expected_outcome\": string}}].\n"
            f"6. recommended_sequence: Array of 4-6 sequential topic learning steps.\n"
            f"7. projects: Array of 2 practical projects [{{\"title\": string, \"description\": string, \"skills_applied\": [string], \"complexity\": \"Beginner\"|\"Intermediate\"|\"Advanced\"}}].\n"
            f"8. job_readiness: Object {{\"readiness_level\": string, \"estimated_time_to_ready\": string, \"recommended_target_roles\": [string], \"key_advice\": string}}."
        )

    async def generate_skill_gap_roadmap(
        self, req: SkillGapAnalysisRequestDTO
    ) -> SkillGapAnalysisResponseDTO:
        """
        Executes AI Skill Gap Analysis & Roadmap Generation.
        Calls Google Gemini API when GEMINI_API_KEY is present; otherwise falls back gracefully.
        """
        sanitized = self._sanitize_learner_payload(req)
        api_key = settings.GEMINI_API_KEY or self.api_key

        # If API key is available, attempt live Gemini API call
        if api_key and api_key.strip() and not api_key.startswith("your_api_key"):
            try:
                logger.info(f"Calling Google Gemini API [{self.model_name}] for learner {sanitized['learner_id']}...")
                response_dto = await self._call_gemini_api(sanitized, api_key)
                if response_dto:
                    return response_dto
            except Exception as e:
                logger.warning(
                    f"Gemini API request failed or timed out ({str(e)}). Falling back to deterministic intelligence engine."
                )

        # Fallback / Deterministic Intelligence Engine
        logger.info(
            f"Generating deterministic AI Skill Gap Intelligence for learner {sanitized['learner_id']}."
        )
        return self._generate_deterministic_analysis(sanitized)

    async def _call_gemini_api(
        self, sanitized: Dict[str, Any], api_key: str
    ) -> Optional[SkillGapAnalysisResponseDTO]:
        """Calls Google Gemini GenerateContent REST API endpoint with JSON mode."""
        endpoint = f"{self.base_url}/models/{self.model_name}:generateContent?key={api_key}"

        payload = {
            "system_instruction": {
                "parts": [{"text": self._build_system_instruction()}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": self._build_user_prompt(sanitized)}],
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2,
                "topP": 0.95,
                "topK": 40,
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            resp = await client.post(
                endpoint,
                json=payload,
                headers={"Content-Type": "application/json"},
            )

            if resp.status_code != 200:
                logger.error(f"Gemini API error status {resp.status_code}: {resp.text[:300]}")
                return None

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return None

            content_text = (
                candidates[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )

            parsed_json = json.loads(content_text)
            return self._parse_and_validate_response(parsed_json, sanitized, is_live=True)

    def _sanitize_unsupported_claims(self, text: str) -> str:
        """Strips fabricated percentages or unsupported hiring claims if generated by LLM."""
        if not text:
            return ""
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
        """Validates and coerces raw AI response into typed Pydantic DTO."""
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
        for proj in raw.get("projects", []):
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
                        description="End-to-end practical implementation project.",
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
                key_advice=job_readiness_raw.get("key_advice", "Focus on practical lab projects and mock interview drills."),
            )
        else:
            job_readiness = JobReadinessDetailsDTO(
                readiness_level="High Market Fit" if sanitized["employment_readiness_score"] >= 80 else "Moderate Readiness",
                estimated_time_to_ready="2–4 Weeks with Bridge Module",
                recommended_target_roles=[sanitized["target_occupation"], f"Associate {sanitized['target_occupation']}"],
                key_advice=str(job_readiness_raw) if job_readiness_raw else "Enhance portfolio with GitHub repositories and verified project artifacts.",
            )

        summary_raw = raw.get("summary", f"Profile analysis for {sanitized['full_name']} targeting {sanitized['target_occupation']}.")
        clean_summary = self._sanitize_unsupported_claims(summary_raw)

        return SkillGapAnalysisResponseDTO(
            learner_id=sanitized["learner_id"],
            full_name=sanitized["full_name"],
            target_occupation=sanitized["target_occupation"],
            summary=clean_summary,
            strengths=raw.get("strengths", [s["name"] for s in sanitized["current_skills"] if s.get("score_percentage", 0) >= 80]),
            skill_gaps=skill_gaps,
            priority_skill_gaps=raw.get("priority_skill_gaps", [g.skill for g in skill_gaps[:2]]),
            roadmap=roadmap,
            recommended_sequence=raw.get("recommended_sequence", [f"Master {g.skill}" for g in skill_gaps]),
            projects=projects,
            job_readiness=job_readiness,
            is_ai_generated=True if is_live else False,
            model_used=self.model_name if is_live else "Deterministic Fallback Engine",
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    def _generate_deterministic_analysis(
        self, sanitized: Dict[str, Any]
    ) -> SkillGapAnalysisResponseDTO:
        """
        Deterministic, high-quality skill gap & roadmap engine.
        Used when GEMINI_API_KEY is not configured or in offline/test modes.
        Tailors recommendations strictly to the candidate's actual competencies, scores, and target role.
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

        role_lower = role.lower()
        if "data" in role_lower or "analytics" in role_lower or "ai" in role_lower:
            gap_definitions = [
                {
                    "skill": "Advanced SQL & Dimensional Modeling",
                    "priority": "Critical",
                    "reason": "Enterprise data roles require competence in star schema indexing and query plan optimization.",
                    "suggested_action": "Review database schema design, indexing, and query plan optimization techniques.",
                },
                {
                    "skill": "Cloud Data Pipelines (AWS / GCP)",
                    "priority": "High",
                    "reason": "Cloud data pipelines and object storage are essential competencies for modern data engineering.",
                    "suggested_action": "Complete hands-on cloud data pipeline exercises.",
                },
            ]
            phases = [
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
            projects = [
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
            sequence = [
                "1. Advanced SQL Indexing & Optimization",
                "2. Python Data Ingestion & Transformation",
                "3. Cloud Data Warehouse Architecture",
                "4. Orchestration with Airflow / Cron",
                "5. End-to-End Production Pipeline Project",
            ]
        elif "green" in role_lower or "solar" in role_lower or "electric" in role_lower or "ev" in role_lower:
            gap_definitions = [
                {
                    "skill": "High-Voltage Battery Safety & BMS Diagnostics",
                    "priority": "Critical",
                    "reason": "High-voltage safety protocols and BMS fault code diagnosis are essential competencies for EV diagnostics.",
                    "suggested_action": "Complete structured hands-on lab modules in battery management systems and electrical safety.",
                },
                {
                    "skill": "CAN Bus Telemetry & Controller Interfacing",
                    "priority": "High",
                    "reason": "Diagnostic technicians must decode CAN frames to diagnose motor controller communication errors.",
                    "suggested_action": "Hands-on lab training with CAN analyzer tools.",
                },
            ]
            phases = [
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
            projects = [
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
            sequence = [
                "1. Electrical Isolation & High-Voltage Safety",
                "2. Battery Management System (BMS) Architecture",
                "3. CAN Bus Signal Decoding & Diagnostics",
                "4. Motor Controller & Inverter Calibration",
                "5. Practical Fleet Inspection & Audit Project",
            ]
        else:
            gap_definitions = [
                {
                    "skill": "Cloud Deployment & Containerization (Docker)",
                    "priority": "Critical",
                    "reason": "Containerization and cloud deployment are core technical requirements for modern software engineering roles.",
                    "suggested_action": "Complete practical containerization exercises and build multi-stage Docker deployment configurations.",
                },
                {
                    "skill": "Automated Unit & Integration Testing",
                    "priority": "High",
                    "reason": "Automated testing and continuous validation ensure software reliability in production environments.",
                    "suggested_action": "Integrate automated test runners into portfolio projects.",
                },
            ]
            phases = [
                RoadmapPhaseDTO(
                    phase=1,
                    title="Phase 1: Architecture & Testing Hardening",
                    duration="Weeks 1–2 (Self-Paced / 20–25 Hours recommended)",
                    skills=["Unit Testing", "Integration Testing", "Clean Code Architecture"],
                    activities=["Write test coverage for existing API endpoints", "Implement input schema validation with Pydantic/Zod"],
                    expected_outcome="Passing test suite with verified automated coverage across critical endpoints.",
                ),
                RoadmapPhaseDTO(
                    phase=2,
                    title="Phase 2: Containerization & Cloud Infrastructure",
                    duration="Weeks 3–4 (Self-Paced / 25–30 Hours recommended)",
                    skills=["Docker", "Docker Compose", "CI/CD GitHub Actions", "Cloud Deployment"],
                    activities=["Containerize frontend and backend into multi-stage Docker builds", "Deploy to cloud environment with automated health checks"],
                    expected_outcome="Live production containerized deployment url verified.",
                ),
                RoadmapPhaseDTO(
                    phase=3,
                    title="Phase 3: Production Security & Recruiter Portfolio",
                    duration="Weeks 5–6 (Self-Paced / 15–20 Hours recommended)",
                    skills=["JWT Refresh Tokens", "Rate Limiting", "Technical Presentation"],
                    activities=["Publish comprehensive GitHub documentation and system architecture diagram", "Complete timed technical interview coding drills"],
                    expected_outcome="Documented, recruiter-ready portfolio project with verifiable deployment.",
                ),
            ]
            projects = [
                ProjectRecommendationDTO(
                    title="Cloud-Native Microservices Dashboard with Docker",
                    description="A secure, multi-tier web application featuring JWT authentication, automated CI/CD pipeline, and PostgreSQL database.",
                    skills_applied=["React", "FastAPI / Node.js", "Docker", "PostgreSQL"],
                    complexity="Intermediate",
                ),
                ProjectRecommendationDTO(
                    title="Automated Test & Code Quality Sentinel",
                    description="An automated CI workflow that tests, lints, and benchmarks web applications before deploying to cloud hosting.",
                    skills_applied=["CI/CD", "Jest/Pytest", "GitHub Actions", "Docker"],
                    complexity="Advanced",
                ),
            ]
            sequence = [
                "1. Comprehensive Unit & Integration Testing",
                "2. Containerization with Multi-Stage Dockerfiles",
                "3. API Security & Role-Based Access Control",
                "4. CI/CD Automated Deployment Pipelines",
                "5. Capstone Production Portfolio Deployment",
            ]

        skill_gaps = [
            SkillGapItemDTO(
                skill=g["skill"],
                priority=g["priority"],
                reason=g["reason"],
                suggested_action=g["suggested_action"],
            )
            for g in gap_definitions
        ]

        priority_gaps = [g.skill for g in skill_gaps if g.priority in ("Critical", "High")]

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


gemini_service = GeminiAIService()
