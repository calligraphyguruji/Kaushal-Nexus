from datetime import datetime, timedelta, timezone
import hashlib
import re
from typing import Any, Dict, Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext

from src.core.config import settings

# Password hashing context with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==============================================================================
# Password Hashing & Verification
# ==============================================================================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against an encoded bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate secure bcrypt hash of a plain password."""
    return pwd_context.hash(password)


# ==============================================================================
# JWT Access & Refresh Token Management
# ==============================================================================

def create_access_token(
    subject: Union[str, Any],
    role: Optional[str] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Generate short-lived signed JWT access token.
    Defaults to 30 minutes expiration with 'type: access' claim.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode: Dict[str, Any] = {
        "exp": expire,
        "sub": str(subject),
        "type": "access",
        "iat": datetime.now(timezone.utc),
    }
    if role:
        to_encode["role"] = role
    if extra_claims:
        to_encode.update(extra_claims)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def create_refresh_token(
    subject: Union[str, Any],
    role: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Generate long-lived signed JWT refresh token.
    Defaults to 7 days expiration with 'type: refresh' claim.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

    to_encode: Dict[str, Any] = {
        "exp": expire,
        "sub": str(subject),
        "type": "refresh",
        "iat": datetime.now(timezone.utc),
    }
    if role:
        to_encode["role"] = role

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
    """
    Decode, validate signature, check expiration, and enforce token type.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        token_type = payload.get("type", "access")
        if token_type != expected_type:
            raise JWTError(f"Invalid token type: expected '{expected_type}', got '{token_type}'")
        return payload
    except JWTError as exc:
        raise exc


# ==============================================================================
# Sensitive Data Masking & Anonymization
# ==============================================================================

def mask_aadhaar(aadhaar_raw: Optional[str]) -> str:
    """Returns 'XXXX-XXXX-1234' (only last 4 digits visible). Never plaintext."""
    if not aadhaar_raw:
        return "XXXX-XXXX-XXXX"
    clean = re.sub(r"\D", "", str(aadhaar_raw).strip())
    if len(clean) >= 4:
        return f"XXXX-XXXX-{clean[-4:]}"
    return "XXXX-XXXX-XXXX"


def mask_email(email: Optional[str]) -> str:
    """Masks email address e.g. 'am****@domain.com'."""
    if not email or "@" not in email:
        return "an***@domain.com"
    user_part, domain = email.split("@", 1)
    if len(user_part) <= 2:
        masked_user = user_part + "***"
    else:
        masked_user = user_part[:2] + "***"
    return f"{masked_user}@{domain}"


def mask_phone(phone: Optional[str]) -> str:
    """Masks mobile number e.g. '+91-XXXXX-XX890'."""
    if not phone:
        return "+91-XXXXX-XXXXX"
    clean = re.sub(r"\D", "", str(phone).strip())
    if len(clean) >= 4:
        return f"+91-XXXXX-XX{clean[-3:]}"
    return "+91-XXXXX-XXXXX"


def hash_identifier(val: Optional[str]) -> str:
    """Deterministic cryptographic SHA-256 fingerprint for deduplication."""
    if not val:
        return "sha256:none"
    clean = str(val).strip()
    return f"sha256:{hashlib.sha256(clean.encode('utf-8')).hexdigest()}"


def redact_sensitive_payload(data: Any) -> Any:
    """
    Deeply redacts passwords, tokens, API keys, Aadhaar numbers, and PII from
    any Python object/dictionary before audit logging or storage.
    """
    REDACT_KEYS = {
        "password", "hashed_password", "token", "access_token",
        "refresh_token", "secret", "secret_key", "api_key",
        "otp", "auth",
    }
    MASK_AADHAAR_KEYS = {"aadhaar", "aadhaar_number", "raw_aadhaar", "uid"}
    MASK_EMAIL_KEYS = {"email", "contact_email"}
    MASK_PHONE_KEYS = {"phone", "mobile", "contact_phone"}

    if isinstance(data, dict):
        cleaned = {}
        for k, v in data.items():
            k_lower = str(k).lower()
            if any(target in k_lower for target in REDACT_KEYS):
                cleaned[k] = "[REDACTED]"
            elif any(target in k_lower for target in MASK_AADHAAR_KEYS):
                cleaned[k] = mask_aadhaar(str(v))
            elif any(target in k_lower for target in MASK_EMAIL_KEYS):
                cleaned[k] = mask_email(str(v))
            elif any(target in k_lower for target in MASK_PHONE_KEYS):
                cleaned[k] = mask_phone(str(v))
            else:
                cleaned[k] = redact_sensitive_payload(v)
        return cleaned
    elif isinstance(data, list):
        return [redact_sensitive_payload(item) for item in data]
    return data
