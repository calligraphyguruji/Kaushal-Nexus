from fastapi import APIRouter
from src.api.v1.ai import router as ai_router
from src.api.v1.audit import router as audit_router
from src.api.v1.dashboard import router as dashboard_router
from src.api.v1.endpoints.auth import router as auth_router
from src.api.v1.endpoints.health import router as health_router
from src.api.v1.learners import router as learners_router
from src.api.v1.matching import router as matching_router
from src.api.v1.ml import router as ml_router
from src.api.v1.placements import router as placements_router
from src.api.v1.regional import router as regional_router
from src.api.v1.skill_gaps import router as skill_gaps_router
from src.api.v1.tasks import router as tasks_router
from src.api.v1.verification import router as verification_router

api_v1_router = APIRouter()

# Mount endpoints
api_v1_router.include_router(health_router, prefix="/health", tags=["Health"])
api_v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_v1_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_v1_router.include_router(learners_router, prefix="/learners", tags=["Learners"])
api_v1_router.include_router(skill_gaps_router, prefix="/skill-gaps", tags=["Skill Gaps"])
api_v1_router.include_router(ai_router, prefix="/ai", tags=["AI & Gemini Services"])
api_v1_router.include_router(regional_router, prefix="/regional", tags=["Regional Intelligence"])
api_v1_router.include_router(matching_router, prefix="/matching", tags=["Employer Matching"])
api_v1_router.include_router(placements_router, prefix="/placements", tags=["Placements & Retention"])
api_v1_router.include_router(tasks_router, prefix="/tasks", tags=["Background Tasks"])
api_v1_router.include_router(tasks_router, prefix="/reports", tags=["Reports"])
api_v1_router.include_router(ml_router, prefix="/ml", tags=["Machine Learning Layer"])
api_v1_router.include_router(verification_router, prefix="/verification", tags=["External Verification"])
api_v1_router.include_router(audit_router, prefix="/audit", tags=["Compliance & Audit Logs"])
