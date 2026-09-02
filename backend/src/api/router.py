from fastapi import APIRouter
from src.api.v1.ai import router as ai_router
from src.api.v1.router import api_v1_router
from src.core.config import settings

api_router = APIRouter()

# Mount API V1 routes (e.g. /api/v1/ai/skill-gap-analysis)
api_router.include_router(api_v1_router, prefix=settings.API_V1_STR)

# Also mount direct alias /api/ai for unified developer ergonomics
api_router.include_router(ai_router, prefix="/api/ai", tags=["AI & Gemini Services"])

