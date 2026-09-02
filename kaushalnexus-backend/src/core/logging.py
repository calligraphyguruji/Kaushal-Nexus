import contextvars
import json
import logging
import re
import sys
from typing import Any, Dict, Optional
from src.core.config import settings

# Context variable for request-scoped correlation IDs
correlation_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", default="SYSTEM-INIT"
)


def get_correlation_id() -> str:
    """Retrieves current request correlation ID from context."""
    return correlation_id_ctx.get()


def set_correlation_id(correlation_id: str) -> None:
    """Sets request correlation ID in current async context."""
    correlation_id_ctx.set(correlation_id)


class SensitiveDataFilter(logging.Filter):
    """
    Security filter to redact PII, Aadhaar numbers, and passwords from logs.
    Ensures no raw 12-digit Aadhaar, bearer tokens, or password strings leak into output streams.
    """

    AADHAAR_PATTERN = re.compile(r"\b(\d{4})[ -]?(\d{4})[ -]?(\d{4})\b")
    JWT_PATTERN = re.compile(r"eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}")
    PASSWORD_PATTERN = re.compile(r"('password'|\"password\"|password)\s*[:=]\s*['\"]([^'\"]+)['\"]", re.IGNORECASE)

    def filter(self, record: logging.LogRecord) -> bool:
        # Inject correlation_id if missing
        if not hasattr(record, "correlation_id"):
            record.correlation_id = get_correlation_id()

        # Sanitize message string
        if isinstance(record.msg, str):
            # 1. Mask Aadhaar numbers to 'XXXX-XXXX-1234'
            record.msg = self.AADHAAR_PATTERN.sub(r"XXXX-XXXX-\3", record.msg)
            # 2. Redact JWT tokens
            record.msg = self.JWT_PATTERN.sub("[REDACTED_JWT_TOKEN]", record.msg)
            # 3. Redact plaintext passwords
            record.msg = self.PASSWORD_PATTERN.sub(r"\1: '[REDACTED]'", record.msg)

        return True


def setup_logging() -> None:
    """Configures application-wide structured logging with correlation IDs and PII redaction."""
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    log_format = (
        "%(asctime)s | %(levelname)-8s | [%(correlation_id)s] | %(name)s:%(funcName)s:%(lineno)d - %(message)s"
    )
    date_format = "%Y-%m-%d %H:%M:%S"

    # Configure root logger handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(fmt=log_format, datefmt=date_format))
    handler.addFilter(SensitiveDataFilter())

    logging.basicConfig(
        level=log_level,
        handlers=[handler],
        force=True,
    )

    # Silence noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


logger = logging.getLogger("kaushalnexus")
