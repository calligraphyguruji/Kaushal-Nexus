from abc import ABC, abstractmethod
import asyncio
import hashlib
import re
import time
from typing import Any, Callable, Dict, Optional, TypeVar
from src.core.config import settings
from src.core.logging import logger

T = TypeVar("T")


# ==============================================================================
# Security & Privacy Utilities (Aadhaar & PII Masking)
# ==============================================================================

def mask_aadhaar(aadhaar_raw: Optional[str]) -> str:
    """
    Masks a 12-digit Aadhaar number per UIDAI compliance guidelines.
    Returns: 'XXXX-XXXX-1234' (only last 4 digits visible).
    NEVER logs or stores raw 12-digit Aadhaar in plaintext.
    """
    if not aadhaar_raw:
        return "XXXX-XXXX-XXXX"

    clean = re.sub(r"\D", "", aadhaar_raw.strip())
    if len(clean) >= 4:
        last4 = clean[-4:]
        return f"XXXX-XXXX-{last4}"
    return "XXXX-XXXX-XXXX"


def hash_aadhaar(aadhaar_raw: Optional[str]) -> str:
    """
    Generates a one-way cryptographic SHA-256 fingerprint for deduplication.
    Raw Aadhaar number is never retained in databases or logs.
    """
    if not aadhaar_raw:
        return "sha256:none"
    clean = re.sub(r"\D", "", aadhaar_raw.strip())
    digest = hashlib.sha256(clean.encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def sanitize_log_data(data: Any) -> Any:
    """Recursively redacts sensitive PII fields (aadhaar, password, secret, token, key)."""
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            k_lower = str(k).lower()
            if any(s in k_lower for s in ["aadhaar", "uid", "aadhar"]):
                sanitized[k] = mask_aadhaar(str(v))
            elif any(s in k_lower for s in ["password", "secret", "token", "key", "auth"]):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = sanitize_log_data(v)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_log_data(item) for item in data]
    return data


# ==============================================================================
# Base External Integration Adapter
# ==============================================================================

class BaseIntegrationAdapter(ABC):
    """
    Base Integration Adapter providing:
    - Timeout configuration & retry mechanism with exponential backoff
    - Automatic error isolation & fallback handling (graceful degradation)
    - Privacy-compliant structured logging
    """

    def __init__(
        self,
        adapter_name: str,
        gateway_url: str,
        timeout_seconds: Optional[float] = None,
        max_retries: Optional[int] = None,
    ) -> None:
        self.adapter_name = adapter_name
        self.gateway_url = gateway_url
        self.timeout_seconds = timeout_seconds or settings.EXTERNAL_INTEGRATION_TIMEOUT_SECONDS
        self.max_retries = max_retries or settings.EXTERNAL_INTEGRATION_MAX_RETRIES

    async def execute_with_resilience(
        self,
        operation_name: str,
        action: Callable[[], Any],
        fallback_factory: Callable[[Exception], T],
    ) -> T:
        """
        Executes an asynchronous integration call with timeout, exponential backoff retries,
        and graceful fallback when the remote gateway is unavailable.
        """
        last_exception: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            start_time = time.perf_counter()
            try:
                # Wrap with timeout
                result = await asyncio.wait_for(action(), timeout=self.timeout_seconds)
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                logger.info(
                    f"[{self.adapter_name}] {operation_name} succeeded on attempt {attempt} ({elapsed_ms}ms)"
                )
                return result
            except asyncio.TimeoutError as exc:
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                last_exception = exc
                logger.warning(
                    f"[{self.adapter_name}] {operation_name} timed out after {elapsed_ms}ms "
                    f"(attempt {attempt}/{self.max_retries})"
                )
            except Exception as exc:
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                last_exception = exc
                logger.warning(
                    f"[{self.adapter_name}] {operation_name} failed on attempt {attempt}/{self.max_retries} "
                    f"({elapsed_ms}ms): {str(exc)}"
                )

            if attempt < self.max_retries:
                # Exponential backoff: 0.1s, 0.2s, 0.4s
                backoff_delay = 0.1 * (2 ** (attempt - 1))
                await asyncio.sleep(backoff_delay)

        # All retries exhausted: return graceful fallback
        logger.error(
            f"[{self.adapter_name}] {operation_name} failed after {self.max_retries} attempts. "
            f"Activating fallback response (graceful degradation). Last error: {last_exception}"
        )
        return fallback_factory(last_exception or Exception(f"{operation_name} gateway unavailable"))

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """Performs connectivity ping and health assessment for the gateway adapter."""
        pass
