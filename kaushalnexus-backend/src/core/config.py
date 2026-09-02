import os
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Configuration
    APP_NAME: str = "KaushalNexus Backend API"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    
    # Security & Tokens (JWT & Cryptography)
    SECRET_KEY: str = "change-this-to-a-super-secret-hex-key-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # 30 minutes short-lived access tokens
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # 7 days refresh tokens
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT_PER_MINUTE: int = 300
    RATE_LIMIT_AUTH_PER_MINUTE: int = 100

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1

    # CORS Allowed Origins
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    # Database Configuration (PostgreSQL 16+ with asyncpg)
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "kaushal_admin"
    POSTGRES_PASSWORD: str = "kaushal_secret"
    POSTGRES_DB: str = "kaushalnexus_db"
    
    DATABASE_URL: Optional[str] = None

    # Database Connection Pool Tuning
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800  # 30 minutes

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info) -> str:
        if isinstance(v, str) and v.strip():
            return v
        values = info.data
        user = values.get("POSTGRES_USER", "kaushal_admin")
        password = values.get("POSTGRES_PASSWORD", "kaushal_secret")
        server = values.get("POSTGRES_SERVER", "localhost")
        port = values.get("POSTGRES_PORT", 5432)
        db = values.get("POSTGRES_DB", "kaushalnexus_db")
        return f"postgresql+asyncpg://{user}:{password}@{server}:{port}/{db}"

    # Redis Cache & Broker
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # External Integrations & Gateway Abstraction Layer
    EXTERNAL_INTEGRATION_MODE: str = "mock"  # "mock" | "live"
    EXTERNAL_INTEGRATION_TIMEOUT_SECONDS: float = 5.0
    EXTERNAL_INTEGRATION_MAX_RETRIES: int = 3
    
    # Aadhaar / UIDAI Gateway Config
    AADHAAR_GATEWAY_URL: str = "https://api.uidai.gov.in/mock"
    AADHAAR_API_KEY: Optional[str] = None
    AADHAAR_CLIENT_ID: Optional[str] = None

    # EPFO Gateway Config
    EPFO_GATEWAY_URL: str = "https://passbook.epfindia.gov.in/mock"
    EPFO_API_KEY: Optional[str] = None

    # Skill India Digital (SID) / NCVET Gateway Config
    SID_GATEWAY_URL: str = "https://api.skillindiadigital.gov.in/mock"
    SID_API_KEY: Optional[str] = None

    # NPMAI Ecosystem Configuration (pip install npmai)
    NPMAI_MODEL: str = "llama3.2"
    NPMAI_TEMPERATURE: float = 0.3
    NPMAI_AUTO_FALLBACK: bool = True
    NPMAI_TIMEOUT_SECONDS: float = 15.0
    NPMAI_API_URL: str = "https://npmaiecosystem-load_balancer.hf.space/load_balancer"

    # Google Gemini AI Config (Google AI Studio)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.7-flash"
    GEMINI_API_TIMEOUT_SECONDS: float = 30.0
    GEMINI_API_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"


    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "text"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )


settings = Settings()
