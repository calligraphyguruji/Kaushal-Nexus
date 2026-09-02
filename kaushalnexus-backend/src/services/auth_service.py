from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ConflictException, UnauthorizedException
from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from src.models.user import User
from src.schemas.user import TokenResponse, UserCreate, UserResponse
from src.services.audit_service import audit_service


class AuthService:
    """Service layer handling hardened user authentication, JWT lifecycle, and audit logging."""

    @staticmethod
    async def register_user(
        db: AsyncSession,
        user_in: UserCreate,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """Registers a new user after verifying unique email address."""
        # Check if email is already taken
        stmt = select(User).where(User.email == user_in.email.lower().strip())
        result = await db.execute(stmt)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            await audit_service.log_action(
                db=db,
                action="AUTH_REGISTER_FAILED",
                resource_type="USER",
                resource_id=None,
                actor_email=user_in.email,
                ip_address=ip_address,
                user_agent=user_agent,
                status="FAILED",
                details={"reason": "Email already registered"},
            )
            raise ConflictException(
                message=f"An account with email '{user_in.email}' already exists."
            )

        # Hash password and create user
        hashed_password = get_password_hash(user_in.password)
        db_user = User(
            email=user_in.email.lower().strip(),
            hashed_password=hashed_password,
            full_name=user_in.full_name.strip(),
            role=user_in.role.value if hasattr(user_in.role, "value") else str(user_in.role),
            is_active=True,
            is_superuser=False,
        )

        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)

        # Record registration audit log
        await audit_service.log_action(
            db=db,
            action="AUTH_REGISTER_SUCCESS",
            resource_type="USER",
            resource_id=str(db_user.id),
            actor=db_user,
            ip_address=ip_address,
            user_agent=user_agent,
            status="SUCCESS",
            details={"role": db_user.role, "full_name": db_user.full_name},
        )
        return db_user

    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """Validates user credentials and logs security audit trail."""
        stmt = select(User).where(User.email == email.lower().strip())
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.hashed_password):
            await audit_service.log_action(
                db=db,
                action="AUTH_LOGIN_FAILED",
                resource_type="USER",
                resource_id=str(user.id) if user else None,
                actor_email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                status="FAILED",
                details={"reason": "Invalid credentials"},
            )
            raise UnauthorizedException(
                message="Invalid email or password",
                details="Authentication failed",
            )

        if not user.is_active:
            await audit_service.log_action(
                db=db,
                action="AUTH_LOGIN_BLOCKED",
                resource_type="USER",
                resource_id=str(user.id),
                actor=user,
                ip_address=ip_address,
                user_agent=user_agent,
                status="FAILED",
                details={"reason": "Account deactivated"},
            )
            raise UnauthorizedException(
                message="User account is deactivated"
            )

        # Record successful login
        await audit_service.log_action(
            db=db,
            action="AUTH_LOGIN_SUCCESS",
            resource_type="USER",
            resource_id=str(user.id),
            actor=user,
            ip_address=ip_address,
            user_agent=user_agent,
            status="SUCCESS",
            details={"role": user.role},
        )

        return user

    @staticmethod
    def generate_token_response(user: User) -> TokenResponse:
        """Generates short-lived access token and long-lived refresh token."""
        access_token = create_access_token(
            subject=str(user.id),
            role=user.role,
        )
        refresh_token = create_refresh_token(
            subject=str(user.id),
            role=user.role,
        )
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in_seconds=1800,
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    async def refresh_user_token(
        db: AsyncSession,
        refresh_token_str: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> TokenResponse:
        """Validates refresh token and issues rotated access & refresh tokens."""
        try:
            payload = decode_access_token(refresh_token_str, expected_type="refresh")
        except Exception:
            raise UnauthorizedException(message="Invalid or expired refresh token")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException(message="Invalid token claims")

        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise UnauthorizedException(message="User account not found or inactive")

        # Record token refresh audit
        await audit_service.log_action(
            db=db,
            action="AUTH_TOKEN_REFRESHED",
            resource_type="USER",
            resource_id=str(user.id),
            actor=user,
            ip_address=ip_address,
            user_agent=user_agent,
            status="SUCCESS",
            details={"role": user.role},
        )

        return AuthService.generate_token_response(user)


auth_service = AuthService()
