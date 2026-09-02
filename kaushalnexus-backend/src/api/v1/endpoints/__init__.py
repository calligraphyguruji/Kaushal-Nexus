from src.api.v1.endpoints.auth import router as auth_router
from src.api.v1.endpoints.health import router as health_router
from src.api.v1.endpoints.learners import router as learners_router

__all__ = ["auth_router", "health_router", "learners_router"]
