<!-- refreshed: 2026-09-12 -->
# Architecture

**Analysis Date:** 2026-09-12

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     Frontend Layer (React 19 + Vite)                    │
├────────────────────┬─────────────────────┬──────────────────────────────┤
│  Pages / Views     │  State / Context    │  API Client & Adapters       │
│  `frontend/src/`   │  `frontend/src/`    │  `frontend/src/api/`         │
└─────────┬──────────┴──────────┬──────────┴──────────────┬───────────────┘
          │                     │                         │
          ▼                     ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    API Gateway & Security (FastAPI)                     │
│  Middlewares: RateLimit, SecurityHeaders, CorrelationID, CORS           │
│  `backend/src/main.py` & `backend/src/middleware/`                      │
├─────────────────────────────────────────────────────────────────────────┤
│                        API Routing Layer (/api/v1)                      │
│  Endpoints: auth, learners, assessments, skill_gaps, matching, impact   │
│  `backend/src/api/v1/`                                                  │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 Domain Services & Machine Learning Layer                │
├─────────────────────────┬───────────────────────┬───────────────────────┤
│  Intelligence Services  │  BKT Assessment Engine│  ML Models (XGBoost/  │
│  `backend/src/services/`│  `backend/src/ml/bkt` │  `backend/src/ml/`    │
└─────────┬───────────────┴───────────┬───────────┴───────────┬───────────┘
          │                           │                       │
          ▼                           ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Data Persistence & Worker Pipelines                  │
├─────────────────────────┬───────────────────────┬───────────────────────┤
│  PostgreSQL (SQLAlchemy)│  Redis Cache & Queue  │  Celery Workers       │
│  `backend/src/models/`  │  `backend/src/core/`  │  `backend/src/workers`│
└─────────────────────────┴───────────────────────┴───────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| API Entrypoint | App initialization, middleware registration, health probes | `backend/src/main.py` |
| Router Registry | Aggregates all V1 route modules and prefixes | `backend/src/api/v1/router.py` |
| Learner Service | Coordinates candidate lifecycle, competencies, and readiness | `backend/src/services/learner_service.py` |
| BKT Engine | Bayesian Knowledge Tracing for skill mastery probability updates | `backend/src/ml/bkt.py` |
| Placement Predictor | ML classification models for placement odds and wage prediction | `backend/src/ml/placement_models.py` |
| Career Intelligence | Career pathing, intervention planning, and action suggestions | `backend/src/services/career_intelligence_service.py` |
| Impact Intelligence | Longitudinal retention tracking, EPFO reconciliation, ROI metrics | `backend/src/services/impact_measurement_service.py` |
| Gemini AI Service | Generative AI explanations, gap remediation prompts, resume parsing | `backend/src/services/gemini_service.py` |
| Database Engine | Asynchronous connection pool management and transaction sessions | `backend/src/core/database.py` |
| Frontend Router | Role-aware client-side routing and protected routes | `frontend/src/App.jsx` |
| API Client | Centralized Axios HTTP client with auth interceptors | `frontend/src/api/client.js` |

## Pattern Overview

**Overall:** Decoupled Async Micro-Monolith with Layered Clean Architecture and Async Event Processing.

**Key Characteristics:**
- **Asynchronous end-to-end**: FastAPI + `asyncpg` + `redis.asyncio` ensures non-blocking I/O throughout the web request cycle.
- **Separation of Concerns**: Strict boundary separation between HTTP transport schemas (`schemas/`), database relational models (`models/`), business domain logic (`services/`), and analytical engines (`ml/`).
- **Probabilistic Modeling**: Integration of Bayesian Knowledge Tracing (BKT) alongside deterministic rule matching for competency evaluation.

## Layers

**API & Routing Layer:**
- Purpose: HTTP request parsing, response formatting, status codes, and input validation.
- Location: `backend/src/api/v1/`
- Contains: Endpoint function definitions, path parameters, dependency injections (`deps.py`).
- Depends on: Pydantic schemas (`backend/src/schemas/`) and business services (`backend/src/services/`).
- Used by: Frontend SPA and external API consumers.

**Domain Services Layer:**
- Purpose: Core application business logic, calculations, multi-table transactions, external integrations.
- Location: `backend/src/services/`
- Contains: Service classes (`learner_service.py`, `assessment_service.py`, `impact_measurement_service.py`).
- Depends on: Relational models (`backend/src/models/`), core utilities, and ML engines.
- Used by: API routers and Celery background tasks.

**ML & Analytics Layer:**
- Purpose: Algorithmic modeling, embeddings, Bayesian knowledge tracing, and predictive inference.
- Location: `backend/src/ml/`
- Contains: `bkt.py`, `placement_models.py`, `wage_predictor.py`, `embeddings.py`, `feature_pipeline.py`.
- Depends on: `numpy`, `scikit-learn`, `xgboost`, `pandas`.
- Used by: Domain services.

**Persistence Layer:**
- Purpose: Schema definitions, relational constraints, foreign keys, database migrations.
- Location: `backend/src/models/` and `backend/alembic/`
- Contains: SQLAlchemy declarative Base models.
- Used by: Domain services and seed scripts.

## Data Flow

### Primary Request Path (Assessment Submission & Mastery Update)

1. **Client Submission:** Learner completes assessment in React frontend (`frontend/src/api/assessments.js`).
2. **API Ingress:** FastAPI route receives submission payload (`backend/src/api/v1/assessments.py`).
3. **Validation:** Pydantic schema parses and validates responses (`backend/src/schemas/assessment_dto.py`).
4. **Scoring & BKT Calculation:** `AssessmentService` calculates raw score and invokes Bayesian Knowledge Tracing (`backend/src/ml/bkt.py`).
5. **State Transition:** Prior skill mastery is updated using transition, guess, and slip parameters.
6. **DB Transaction:** Asynchronous SQLAlchemy session persists attempts and mastery states to PostgreSQL (`backend/src/models/learner.py`).
7. **Response:** Updated candidate readiness and mastery status returned to client.

### Secondary Flow: Longitudinal EPFO Employment Verification

1. **Scheduled Trigger:** Celery worker kicks off periodic sync job (`backend/src/workers/epfo_sync_task.py`).
2. **Gateway Ingestion:** `EPFOAdapter` queries EPFO mock/live gateway for recent provident fund contributions (`backend/src/services/epfo_adapter.py`).
3. **Reconciliation:** `EPFOService` matches UAN/Aadhaar credentials against placed learners.
4. **Outcome Labeling:** Longitudinal retention status (30/60/90/180-day retention) updated in `backend/src/models/placement.py`.
5. **Audit Trail:** Verification events written to audit logs (`backend/src/models/audit.py`).

**State Management:**
- Frontend uses React Context (`frontend/src/context/`) and component-level reactive hooks.
- Backend session state is stateless JWT; ephemeral operational data cached in Redis.

## Key Abstractions

**Bayesian Knowledge Tracer (BKT):**
- Purpose: Probabilistic modeling of latent skill acquisition from sequential responses.
- Examples: `backend/src/ml/bkt.py`
- Pattern: Hidden Markov Model variant with Bayesian update equations.

**External Gateway Adapters:**
- Purpose: Decouple backend domain logic from specific government gateway protocols (mock vs. live).
- Examples: `backend/src/services/aadhaar_adapter.py`, `backend/src/services/epfo_adapter.py`, `backend/src/services/sid_adapter.py`
- Pattern: Adapter / Strategy Pattern.

## Entry Points

**Backend Application:**
- Location: `backend/src/main.py`
- Triggers: Uvicorn ASGI server invocation (`uvicorn src.main:app`)
- Responsibilities: Lifespan management, middleware binding, router mounting.

**Celery Worker:**
- Location: `backend/src/workers/celery_app.py`
- Triggers: Celery worker command (`celery -A src.workers.celery_app worker`)
- Responsibilities: Asynchronous task execution and scheduled cron tasks.

**Frontend Application:**
- Location: `frontend/src/main.jsx`
- Triggers: Vite bundle initialization in browser DOM
- Responsibilities: Root DOM rendering, React Router provider, Context providers.

## Architectural Constraints

- **Asynchronous Execution:** All database queries within FastAPI routes must use `await session.execute()` with async SQLAlchemy; synchronous blocking database calls are forbidden in the async event loop.
- **No Direct Gateway Calls in Views:** Route handlers must delegate all external network communication to service adapters.
- **Strict Role Separation:** Endpoints must enforce RBAC dependencies (`backend/src/api/v1/deps.py`).

## Anti-Patterns

### Blocking Synchronous I/O in Async Route Handlers
**What happens:** Using `requests.get()` or blocking file I/O inside `async def` routes.
**Why it's wrong:** Blocks the entire Uvicorn asyncio event loop, causing severe latency spikes for all concurrent users.
**Do this instead:** Use `httpx.AsyncClient` or `aiofiles` as implemented in `backend/src/services/gemini_service.py`.

### Unsanitized Raw SQL Queries
**What happens:** Direct string formatting into raw SQL statements.
**Why it's wrong:** Vulnerable to SQL injection attacks.
**Do this instead:** Utilize SQLAlchemy parameterized queries and ORM construct selects (`backend/src/services/learner_service.py`).

## Error Handling

**Strategy:** Centralized exception handling with structured JSON error responses.

**Patterns:**
- Custom `AppException` hierarchy in `backend/src/core/exceptions.py`.
- Automatic translation of `RequestValidationError` into standard field error structures.
- Correlation IDs attached to every error payload for rapid diagnostic lookup.

## Cross-Cutting Concerns

**Logging:** Configured in `backend/src/core/logging.py`, structured logs with correlation IDs.
**Validation:** Pydantic v2 schemas across all inbound and outbound payloads.
**Authentication:** JWT Bearer tokens validated in `backend/src/api/v1/deps.py`.

---

*Architecture analysis: 2026-09-12*
