# Codebase Structure

**Analysis Date:** 2026-09-12

## Directory Layout

```
KaushalNexus/
├── .planning/                  # GSD planning directory (codebase maps, plans, milestones)
│   └── codebase/               # High-level architecture, stack, and convention maps
├── backend/                    # Python FastAPI async backend service
│   ├── alembic/                # Database migration scripts and environment
│   │   └── versions/           # Versioned migration files
│   ├── scripts/                # Database reset, seed, and maintenance scripts
│   ├── src/                    # Backend application source code
│   │   ├── api/                # API routers and versioned endpoints
│   │   │   └── v1/             # V1 endpoint routes and dependency injections
│   │   ├── core/               # App configuration, database engine, logging, security
│   │   ├── middleware/         # Security, CORS, rate limiting, and tracing middlewares
│   │   ├── ml/                 # Machine learning models, BKT, and feature pipelines
│   │   ├── models/             # SQLAlchemy ORM database models
│   │   ├── schemas/            # Pydantic data validation schemas (DTOs)
│   │   ├── services/           # Business domain and integration services
│   │   └── workers/            # Celery async background worker tasks
│   └── tests/                  # Pytest unit and integration test suite
├── docs/                       # Architectural and intelligence phase documentation
├── frontend/                   # React 19 + Vite single-page frontend application
│   ├── public/                 # Static assets, icons, manifest
│   └── src/                    # Frontend source code
│       ├── __tests__/          # Unit and pipeline tests (Node test runner)
│       ├── api/                # HTTP API client modules and endpoint wrappers
│       ├── assets/             # Images, SVG graphics, icons
│       ├── auth/               # Auth state, login components, route guards
│       ├── components/         # Reusable UI widgets, cards, charts, navigation
│       ├── context/            # React Context providers (Auth, Theme, Notifications)
│       ├── data/               # Static mock datasets and fallback fixtures
│       ├── hooks/              # Custom React hooks (useAuth, useFetch, etc.)
│       ├── layouts/            # Dashboard and portal layout wrappers
│       ├── pages/              # Top-level view pages (Admin, Learner, Officer, etc.)
│       ├── styles/             # Global CSS and Tailwind theme configurations
│       └── utils/              # Helper functions, formatting, date math
├── stitch_assets/              # Design mockups, UI screen captures, and exports
└── Ui-Screenshots/             # UI validation screenshots
```

## Directory Purposes

**`backend/src/api/v1/`:**
- Purpose: HTTP endpoint routing and controller logic for API version 1.
- Contains: Route handlers (`learners.py`, `assessments.py`, `placements.py`, `impact.py`, `matching.py`).
- Key files: `backend/src/api/v1/router.py`, `backend/src/api/v1/deps.py`.

**`backend/src/core/`:**
- Purpose: Infrastructure foundation and cross-cutting application configuration.
- Contains: Settings management, database engine initialization, Redis client pool, JWT security helpers.
- Key files: `backend/src/core/config.py`, `backend/src/core/database.py`, `backend/src/core/security.py`, `backend/src/core/redis.py`.

**`backend/src/ml/`:**
- Purpose: Algorithmic modeling, probability tracking, and predictive inference.
- Contains: Bayesian Knowledge Tracing (`bkt.py`), wage predictor (`wage_predictor.py`), placement models (`placement_models.py`), dataset generator.
- Key files: `backend/src/ml/bkt.py`, `backend/src/ml/feature_pipeline.py`.

**`backend/src/services/`:**
- Purpose: Domain business logic decoupling API routes from database access and external APIs.
- Contains: High-level operations, complex transactions, and external integration adapters.
- Key files: `backend/src/services/learner_service.py`, `backend/src/services/assessment_service.py`, `backend/src/services/gemini_service.py`.

**`frontend/src/pages/`:**
- Purpose: Top-level views corresponding to distinct routes.
- Contains: Full dashboard views for Learners, Officers, Training Partners, Employers, and Admins.
- Key files: `frontend/src/pages/DashboardPage.jsx`, `frontend/src/pages/LearnersPage.jsx`, `frontend/src/pages/RegionalIntelligencePage.jsx`.

**`frontend/src/components/`:**
- Purpose: Modular, reusable visual building blocks and charts.
- Contains: Form inputs, data tables, metric cards, Recharts visualizations.
- Key files: `frontend/src/components/Sidebar.jsx`, `frontend/src/components/Navbar.jsx`.

## Key File Locations

**Entry Points:**
- `backend/src/main.py`: ASGI application entry point and lifespan hooks.
- `frontend/src/main.jsx`: React DOM root mounting and initialization.
- `backend/entrypoint.sh`: Container entry script for database migrations and Uvicorn launch.

**Configuration:**
- `backend/src/core/config.py`: Centralized Pydantic settings.
- `frontend/vite.config.js`: Vite bundling configuration.
- `render.yaml`: Cloud deployment infrastructure specification.

**Core Logic:**
- `backend/src/services/`: Core application services.
- `backend/src/ml/bkt.py`: Knowledge tracing implementation.
- `frontend/src/api/`: Centralized frontend data fetching layer.

**Testing:**
- `backend/tests/`: Pytest suite covering all API endpoints and ML services.
- `frontend/src/__tests__/`: Frontend logic and component tests.

## Naming Conventions

**Files:**
- Backend: Snake_case for all Python modules (e.g., `learner_service.py`, `assessment_dto.py`).
- Frontend Components/Pages: PascalCase for JSX files (e.g., `DashboardPage.jsx`, `LearnerCard.jsx`).
- Frontend Utilities/APIs: CamelCase for JavaScript modules (e.g., `careerIntelligence.js`, `formatUtils.js`).

**Directories:**
- Snake_case throughout (`src/api/v1/`, `stitch_assets/`, `generated_reports/`).

## Where to Add New Code

**New Feature / Endpoint:**
- Router: Add route handler in `backend/src/api/v1/<feature>.py`.
- Mount: Register route in `backend/src/api/v1/router.py`.
- Schema: Define request/response DTOs in `backend/src/schemas/<feature>_dto.py`.
- Service: Implement business logic in `backend/src/services/<feature>_service.py`.
- Frontend API: Add endpoints to `frontend/src/api/<feature>.js`.
- Frontend UI: Create page/components in `frontend/src/pages/` or `frontend/src/components/`.
- Tests: Add unit/integration tests in `backend/tests/test_<feature>.py`.

**New Database Model:**
- Model definition: Add SQLAlchemy model in `backend/src/models/<model>.py`.
- Model export: Export in `backend/src/models/__init__.py`.
- Migration: Generate migration via `alembic revision --autogenerate -m "add <model>"`.

## Special Directories

**`backend/generated_reports/`:**
- Purpose: Temporary storage for generated PDF candidate dossiers and audit reports.
- Generated: Yes.
- Committed: No (managed via `.gitignore`).

**`backend/uploads/`:**
- Purpose: Uploaded candidate resumes, certifications, and verification payloads.
- Generated: Yes.
- Committed: No (managed via `.gitignore`).

---

*Structure analysis: 2026-09-12*
