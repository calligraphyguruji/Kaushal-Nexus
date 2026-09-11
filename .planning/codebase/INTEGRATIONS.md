# External Integrations

**Analysis Date:** 2026-09-12

## APIs & External Services

**AI & LLM Services:**
- Google Gemini API (`gemini-3.7-flash`, `gemini-2.5-flash`) - Generative AI reasoning for learner skill gaps, resume parsing, and personalized career roadmaps
  - SDK/Client: Direct async `httpx.AsyncClient` REST calls in `backend/src/services/gemini_service.py` and `@ai-sdk/google` in `frontend/src/api/`
  - Auth: `GEMINI_API_KEY`
- NPMAI Ecosystem Load Balancer - Machine-learning load-balanced model inference (e.g. `llama3.2`)
  - SDK/Client: `npmai` package in `backend/src/services/ai_service.py`
  - Auth: Endpoint configured via `NPMAI_API_URL`

**Government Skilling & Identity Gateways:**
- UIDAI / Aadhaar Gateway - Biometric/demographic identity verification and consent lifecycle management
  - Client: `backend/src/services/aadhaar_adapter.py`
  - Auth: `AADHAAR_API_KEY`, `AADHAAR_CLIENT_ID` (Mock and Live modes supported via `EXTERNAL_INTEGRATION_MODE`)
- EPFO (Employees' Provident Fund Organisation) Gateway - Longitudinal employment verification and EPFO contribution status tracking
  - Client: `backend/src/services/epfo_adapter.py`, `backend/src/services/epfo_service.py`, `backend/src/workers/epfo_sync_task.py`
  - Auth: `EPFO_API_KEY`
- Skill India Digital (SID) / NCVET - Candidate qualification registry synchronization, NSQF level mappings, and certificate verification
  - Client: `backend/src/services/sid_adapter.py`, `backend/src/workers/sid_pipeline.py`
  - Auth: `SID_API_KEY`

## Data Storage

**Databases:**
- PostgreSQL 16+ (Async)
  - Connection: `DATABASE_URL` (with automatic `postgresql+asyncpg://` schema resolution in `backend/src/core/config.py`)
  - Client: SQLAlchemy 2.0 AsyncEngine + `async_sessionmaker` (`backend/src/core/database.py`)
  - Migrations: Alembic async migrations (`backend/alembic/`)

**File Storage:**
- Local filesystem with upload directories (`backend/uploads/`, `backend/generated_reports/`)
- Client: `aiofiles` and `backend/src/services/storage_service.py`

**Caching:**
- Redis 7+
  - Connection: `REDIS_URL` (`redis://localhost:6379/0`)
  - Client: `redis.asyncio` connection pool (`backend/src/core/redis.py`)
  - Used for: Rate-limiting buckets, API response caching, and Celery broker

## Authentication & Identity

**Auth Provider:**
- Custom JWT Authentication with Role-Based Access Control (RBAC)
  - Implementation: `backend/src/core/security.py`, `backend/src/services/auth_service.py`
  - Tokens: HS256 JWT access tokens (30-min TTL) and refresh tokens (7-day TTL)
  - Password Hashing: `passlib` with `bcrypt`
  - Roles: `ADMIN`, `POLICY_MAKER`, `TRAINING_PARTNER`, `EMPLOYER`, `LEARNER`

## Monitoring & Observability

**Error Tracking:**
- Structured JSON / text logging with request correlation IDs
- Client: Custom `CorrelationIdMiddleware` and `backend/src/core/logging.py`

**Health Checks:**
- Composite health endpoint at `/health` and `/api/v1/health`
- Verifies PostgreSQL engine query response and Redis `ping()` latency (`backend/src/api/v1/endpoints/health.py`)

## CI/CD & Deployment

**Hosting:**
- Frontend: Vercel SPA hosting (`frontend/vercel.json`)
- Backend: Render Web Service via Docker (`render.yaml`, `backend/Dockerfile`)
- Database: Render PostgreSQL / Managed Cloud Postgres
- Cache: Render Redis / Cloud Redis

**CI Pipeline:**
- Automated test suites via GitHub actions / pytest (`backend/tests/`) and Node test runner (`frontend/src/__tests__/`)

## Environment Configuration

**Required env vars:**
- `SECRET_KEY`: Secret string for cryptographic signing of JWTs
- `DATABASE_URL`: PostgreSQL connection string (e.g. `postgresql+asyncpg://user:pass@host:5432/dbname`)
- `REDIS_URL`: Redis connection URL
- `GEMINI_API_KEY`: Google Gemini API key
- `CORS_ORIGINS`: Allowed origins for cross-origin resource sharing

**Secrets location:**
- Stored in server environment variables / `.env` file (strictly excluded from Git tracking via `.gitignore`)

## Webhooks & Callbacks

**Incoming:**
- `/api/v1/verification/callback` - Gateway webhook receiver for async Aadhaar/EPFO verification responses
- `/api/v1/tasks/callback` - Celery task progress update hooks

**Outgoing:**
- External REST requests to government gateways and LLM providers via retry-wrapped `httpx.AsyncClient`

---

*Integration audit: 2026-09-12*
