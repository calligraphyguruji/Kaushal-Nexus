from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    UnauthorizedException,
)
from src.core.logging import logger
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
from src.services.email_service import email_service


class AuthService:
    """Service layer handling hardened user authentication, JWT lifecycle, email verification, and audit logging."""

    @staticmethod
    def generate_verification_token() -> str:
        """Generates a cryptographically secure URL-safe verification token."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def hash_verification_token(token: str) -> str:
        """Computes SHA-256 hash of verification token for secure database storage."""
        return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()

    @staticmethod
    async def register_user(
        db: AsyncSession,
        user_in: UserCreate,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """Registers a new user after verifying unique email address and dispatches verification link."""
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

        # Generate cryptographically secure token and hash
        raw_token = AuthService.generate_verification_token()
        token_hash = AuthService.hash_verification_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS
        )

        # Hash password and create user with unverified email state
        hashed_password = get_password_hash(user_in.password)
        db_user = User(
            email=user_in.email.lower().strip(),
            hashed_password=hashed_password,
            full_name=user_in.full_name.strip(),
            role=user_in.role.value if hasattr(user_in.role, "value") else str(user_in.role),
            is_active=True,
            is_superuser=False,
            email_verified=False,
            email_verification_token_hash=token_hash,
            email_verification_expires_at=expires_at,
        )

        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)

        # Dispatch verification email safely
        verification_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={raw_token}"
        try:
            await email_service.send_verification_email(
                to_email=db_user.email,
                recipient_name=db_user.full_name,
                verification_url=verification_url,
                expires_in_hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS,
            )
        except Exception as exc:
            logger.error(f"Failed to dispatch initial verification email to {db_user.email}: {exc}")

        # If user registered as LEARNER, link or auto-provision candidate dossier
        if db_user.role == "LEARNER":
            from src.models.learner import Learner
            import uuid
            l_stmt = select(Learner).where(Learner.email == db_user.email)
            l_res = await db.execute(l_stmt)
            learner = l_res.scalar_one_or_none()
            if learner:
                learner.user_id = db_user.id
                if getattr(user_in, "phone", None):
                    learner.phone = user_in.phone.strip()
            else:
                now_year = datetime.now().year
                unique_suffix = uuid.uuid4().hex[:5].upper()
                new_learner = Learner(
                    id=f"KN-{now_year}-{unique_suffix}",
                    user_id=db_user.id,
                    full_name=db_user.full_name,
                    email=db_user.email,
                    phone=user_in.phone.strip() if getattr(user_in, "phone", None) else None,
                    district_id="UP-LUCKNOW",
                    employment_readiness_score=0,
                    overall_progress=0,
                    status="In Training",
                )
                db.add(new_learner)
            await db.commit()

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
        bypass_email_verification: bool = False,
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

        # Enforce email verification on login unless superuser or test bypass
        if (
            settings.REQUIRE_EMAIL_VERIFICATION_TO_LOGIN
            and not user.email_verified
            and not user.is_superuser
            and not bypass_email_verification
        ):
            await audit_service.log_action(
                db=db,
                action="AUTH_LOGIN_BLOCKED",
                resource_type="USER",
                resource_id=str(user.id),
                actor=user,
                ip_address=ip_address,
                user_agent=user_agent,
                status="FAILED",
                details={"reason": "Email not verified", "code": "EMAIL_NOT_VERIFIED"},
            )
            raise ForbiddenException(
                message="Email address has not been verified. Please verify your email or request a new verification link.",
                details="EMAIL_NOT_VERIFIED",
                code="EMAIL_NOT_VERIFIED",
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
    async def verify_email(
        db: AsyncSession,
        token: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> dict:
        """
        Validates token hash, checks expiration, and marks email as verified.
        Invalidates the token hash upon verification to prevent reuse.
        """
        if not token or not token.strip():
            raise BadRequestException(
                message="Verification token is required.",
                code="VERIFICATION_TOKEN_INVALID",
            )

        token_hash = AuthService.hash_verification_token(token.strip())

        stmt = select(User).where(User.email_verification_token_hash == token_hash)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            raise BadRequestException(
                message="Invalid or expired verification token.",
                code="VERIFICATION_TOKEN_INVALID",
            )

        if user.email_verified:
            # Already verified; clean up token hash and return clean success
            user.email_verification_token_hash = None
            user.email_verification_expires_at = None
            await db.commit()
            return {
                "success": True,
                "message": "Email is already verified. You may now log in.",
                "email_verified": True,
            }

        # Check expiration
        now = datetime.now(timezone.utc)
        if user.email_verification_expires_at:
            expires_at = user.email_verification_expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < now:
                raise BadRequestException(
                    message="Verification token has expired. Please request a new verification email.",
                    code="VERIFICATION_TOKEN_EXPIRED",
                )

        # Mark user as verified and invalidate token
        user.email_verified = True
        user.email_verification_token_hash = None
        user.email_verification_expires_at = None
        await db.commit()
        await db.refresh(user)

        await audit_service.log_action(
            db=db,
            action="AUTH_EMAIL_VERIFIED_SUCCESS",
            resource_type="USER",
            resource_id=str(user.id),
            actor=user,
            ip_address=ip_address,
            user_agent=user_agent,
            status="SUCCESS",
            details={"email": user.email},
        )

        return {
            "success": True,
            "message": "Email address verified successfully. You may now log in.",
            "email_verified": True,
        }

    @staticmethod
    async def resend_verification(
        db: AsyncSession,
        email: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> dict:
        """
        Replaces existing token with a fresh secure token, updates expiration,
        and dispatches a new verification email.
        Avoids user enumeration vulnerabilities by returning a uniform success message.
        """
        cleaned_email = email.lower().strip()
        generic_message = (
            "If an unverified account exists for this email address, "
            "a new verification link has been sent."
        )

        stmt = select(User).where(User.email == cleaned_email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        # If user does not exist or is already verified, return generic response without leaking existence
        if not user or user.email_verified:
            return {
                "success": True,
                "message": generic_message,
            }

        # Generate fresh token & expiration
        new_token = AuthService.generate_verification_token()
        token_hash = AuthService.hash_verification_token(new_token)
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS
        )

        user.email_verification_token_hash = token_hash
        user.email_verification_expires_at = expires_at
        await db.commit()
        await db.refresh(user)

        verification_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={new_token}"
        try:
            await email_service.send_verification_email(
                to_email=user.email,
                recipient_name=user.full_name,
                verification_url=verification_url,
                expires_in_hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS,
            )
        except Exception as exc:
            logger.error(f"Failed to resend verification email to {user.email}: {exc}")

        await audit_service.log_action(
            db=db,
            action="AUTH_RESEND_VERIFICATION_SUCCESS",
            resource_type="USER",
            resource_id=str(user.id),
            actor=user,
            ip_address=ip_address,
            user_agent=user_agent,
            status="SUCCESS",
            details={"email": user.email},
        )

        return {
            "success": True,
            "message": generic_message,
        }

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

    @staticmethod
    async def authenticate_or_register_phone_user(
        db: AsyncSession,
        phone: str,
        firebase_id_token: Optional[str] = None,
        full_name: Optional[str] = None,
        role: Optional[str] = "LEARNER",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """
        Authenticates an existing user via verified phone number,
        or auto-provisions a candidate account with associated Learner record.
        """
        import re
        from src.models.learner import Learner
        from datetime import datetime
        import uuid

        cleaned_phone = re.sub(r"[^\d+]", "", phone.strip())
        phone_digits = re.sub(r"\D", "", cleaned_phone)
        synthetic_email = f"{phone_digits}@phone.kaushalnexus.gov.in"

        # Check if user already exists with this phone email
        stmt = select(User).where(User.email == synthetic_email)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user:
            # Check if a learner already exists with this phone number
            l_stmt = select(Learner).where(Learner.phone == cleaned_phone)
            l_res = await db.execute(l_stmt)
            existing_learner = l_res.scalar_one_or_none()
            if existing_learner and existing_learner.user_id:
                u_stmt = select(User).where(User.id == existing_learner.user_id)
                u_res = await db.execute(u_stmt)
                user = u_res.scalar_one_or_none()

        if not user:
            # Register new user
            display_name = full_name.strip() if full_name and full_name.strip() else f"Candidate (+{phone_digits[-10:] if len(phone_digits) >= 10 else phone_digits})"
            user_role = role.value if hasattr(role, "value") else str(role or "LEARNER")
            random_pwd = uuid.uuid4().hex + "KN2026!"
            hashed_pwd = get_password_hash(random_pwd)

            user = User(
                email=synthetic_email,
                hashed_password=hashed_pwd,
                full_name=display_name,
                role=user_role,
                is_active=True,
                is_superuser=False,
                email_verified=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

            # Auto-provision learner profile
            if user.role == "LEARNER":
                now_year = datetime.now().year
                unique_suffix = uuid.uuid4().hex[:5].upper()
                new_learner = Learner(
                    id=f"KN-{now_year}-{unique_suffix}",
                    user_id=user.id,
                    full_name=user.full_name,
                    email=user.email,
                    phone=cleaned_phone,
                    district_id="UP-LUCKNOW",
                    employment_readiness_score=0,
                    overall_progress=0,
                    status="In Training",
                )
                db.add(new_learner)
                await db.commit()

            await audit_service.log_action(
                db=db,
                action="AUTH_PHONE_REGISTER_SUCCESS",
                resource_type="USER",
                resource_id=str(user.id),
                actor=user,
                ip_address=ip_address,
                user_agent=user_agent,
                status="SUCCESS",
                details={"role": user.role, "phone": cleaned_phone},
            )
        else:
            if not user.is_active:
                raise ForbiddenException("User account is deactivated. Contact platform administrator.")

            await audit_service.log_action(
                db=db,
                action="AUTH_PHONE_LOGIN_SUCCESS",
                resource_type="USER",
                resource_id=str(user.id),
                actor=user,
                ip_address=ip_address,
                user_agent=user_agent,
                status="SUCCESS",
                details={"role": user.role, "phone": cleaned_phone},
            )

        return user

    @staticmethod
    async def check_phone_registration(
        db: AsyncSession,
        phone: str,
    ) -> dict:
        """
        Checks if a given phone number is registered on KaushalNexus
        (either in Learner records or User accounts).
        """
        import re
        from sqlalchemy import or_
        from src.models.learner import Learner

        cleaned = re.sub(r"[^\d+]", "", phone.strip())
        digits = re.sub(r"\D", "", cleaned)

        if len(digits) < 10:
            return {
                "registered": False,
                "full_name": None,
                "message": "Invalid mobile phone number. Must be at least 10 digits.",
            }

        last_10 = digits[-10:]

        # 1. Check if a learner has this phone number
        stmt = select(Learner).where(
            or_(
                Learner.phone.like(f"%{last_10}%"),
                Learner.phone == cleaned,
                Learner.phone == f"+91{last_10}",
                Learner.phone == f"+91 {last_10[:5]} {last_10[5:]}",
            )
        )
        res = await db.execute(stmt)
        learner = res.scalars().first()
        if learner:
            return {
                "registered": True,
                "full_name": learner.full_name,
                "message": "Phone number is registered.",
            }

        # 2. Check if a user has a synthetic or matching phone email
        user_stmt = select(User).where(
            or_(
                User.email.like(f"%{last_10}@phone.kaushalnexus.gov.in"),
                User.email.like(f"%{last_10}%"),
            )
        )
        user_res = await db.execute(user_stmt)
        user = user_res.scalars().first()
        if user:
            return {
                "registered": True,
                "full_name": user.full_name,
                "message": "Phone number is registered.",
            }

        return {
            "registered": False,
            "full_name": None,
            "message": "This phone number is not registered on KaushalNexus. Please register first to continue.",
        }


auth_service = AuthService()
