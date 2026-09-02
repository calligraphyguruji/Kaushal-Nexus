from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user
from src.core.database import get_db
from src.models.user import User
from src.schemas.user import RefreshTokenRequest, TokenResponse, UserCreate, UserLogin, UserResponse
from src.services.audit_service import audit_service
from src.services.auth_service import auth_service

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register Institutional User",
    description="Create a new user account with an institutional RBAC role (MSDE_OFFICER, STATE_ADMIN, etc.).",
)
async def register(
    user_in: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Register a new user account."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    user = await auth_service.register_user(
        db, user_in, ip_address=client_ip, user_agent=user_agent
    )
    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate User (JSON)",
    description="Authenticate via email and password to receive signed JWT access and refresh tokens.",
)
async def login(
    user_login: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """JSON-based login endpoint."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    user = await auth_service.authenticate_user(
        db,
        email=user_login.email,
        password=user_login.password,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    return auth_service.generate_token_response(user)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate JWT Access & Refresh Tokens",
    description="Exchanges a valid 7-day refresh token for a fresh access token and rotated refresh token.",
)
async def refresh_token_endpoint(
    req: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Token rotation endpoint."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return await auth_service.refresh_user_token(
        db,
        refresh_token_str=req.refresh_token,
        ip_address=client_ip,
        user_agent=user_agent,
    )


@router.post(
    "/token",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="OAuth2 Password Flow Token Endpoint (Swagger UI)",
    description="Standard OAuth2 form-data endpoint supporting Swagger UI authorization.",
    include_in_schema=True,
)
async def login_oauth2_form(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """OAuth2 password form login endpoint."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    user = await auth_service.authenticate_user(
        db,
        email=form_data.username,
        password=form_data.password,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    return auth_service.generate_token_response(user)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Current Authenticated User Profile",
    description="Retrieve the profile and role credentials of the authenticated user.",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Returns profile for currently authenticated user."""
    return UserResponse.model_validate(current_user)

