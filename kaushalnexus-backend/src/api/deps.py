import uuid
from typing import Callable, List, Union
from fastapi import Depends, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.exceptions import ForbiddenException, UnauthorizedException
from src.core.security import decode_access_token
from src.models.user import User
from src.schemas.user import TokenPayload, UserRole

# OAuth2 Password Bearer Scheme
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Decodes JWT token, extracts user ID subject, and retrieves user from database.
    """
    credentials_exception = UnauthorizedException(
        message="Could not validate credentials",
        details="Invalid or expired access token",
    )

    try:
        payload = decode_access_token(token)
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id_str, role=payload.get("role"))
    except (JWTError, Exception):
        raise credentials_exception

    try:
        user_uuid = uuid.UUID(token_data.sub)
    except ValueError:
        raise credentials_exception

    stmt = select(User).where(User.id == user_uuid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedException(
            message="User associated with this token no longer exists"
        )
    if not user.is_active:
        raise ForbiddenException(message="User account is deactivated")

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Validates that current user is active."""
    if not current_user.is_active:
        raise ForbiddenException(message="Inactive user")
    return current_user


def require_role(*allowed_roles: Union[UserRole, str]) -> Callable:
    """
    Role-Based Access Control (RBAC) dependency factory.
    Verifies that the authenticated user possesses one of the allowed institutional roles.
    Superusers bypass role restrictions.
    """
    role_strings = {r.value if isinstance(r, UserRole) else str(r) for r in allowed_roles}

    async def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.is_superuser:
            return current_user

        if current_user.role not in role_strings:
            raise ForbiddenException(
                message=f"Access denied. Required roles: {', '.join(sorted(role_strings))}. Your role: {current_user.role}",
                details={"user_role": current_user.role, "required_roles": list(role_strings)},
            )
        return current_user

    return role_checker
