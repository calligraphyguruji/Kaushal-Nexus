# Technology Stack

**Analysis Date:** 2026-09-12

## Languages

**Primary:**
- Python 3.12+ - Backend API, asynchronous pipelines, ORM models, background task queues, and ML/AI analytics (`backend/src/`)
- JavaScript (ES Modules, JSX) - Single-page frontend application (`frontend/src/`)

**Secondary:**
- SQL / PostgreSQL dialect - Relational schema migrations and analytical queries (`backend/alembic/versions/`)
- Bash / Shell - Startup scripts and container initialization (`backend/entrypoint.sh`, `scripts/`)
- CSS3 / Tailwind CSS v4 - Styling system with CSS custom properties (`frontend/src/index.css`)

## Runtime

**Environment:**
- Node.js (v20+) for frontend development and bundling
- Python 3.12 (CPython) asynchronous runtime for backend ASGI server and worker processes

**Package Manager:**
- `npm` for frontend: `frontend/package.json`, Lockfile present (`frontend/package-lock.json`)
- `pip` / `venv` for backend: `backend/requirements.txt`

## Frameworks

**Core:**
- **FastAPI** (`>=0.115.0,<1.0.0`) - High-performance async ASGI web framework (`backend/src/main.py`)
- **Uvicorn** (`[standard]>=0.32.0,<1.0.0`) - Production ASGI server running asynchronous workers
- **React 19** (`^19.2.8`) - Modern UI component library (`frontend/src/App.jsx`)
- **React Router v7** (`^7.18.2`) - Client-side SPA routing (`frontend/src/App.jsx`)
- **SQLAlchemy 2.x** (`>=2.0.35,<3.0.0`) - Async relational ORM with AsyncEngine (`backend/src/core/database.py`)
- **Pydantic v2** (`>=2.9.0,<3.0.0`) & **pydantic-settings** (`>=2.6.0`) - Data validation and configuration (`backend/src/schemas/`, `backend/src/core/config.py`)

**Testing:**
- **pytest** (`>=8.3.3,<9.0.0`) with **pytest-asyncio** (`>=0.24.0,<1.0.0`) - Backend async unit and integration tests (`backend/tests/`)
- **Node.js native test runner** (`node --test`) - Frontend component, permission, and pipeline unit tests (`frontend/src/__tests__/`)

**Build/Dev:**
- **Vite 8** (`^8.2.2`) - Fast frontend bundler and development server (`frontend/vite.config.js`)
- **Tailwind CSS v4** (`^4.3.3`) via `@tailwindcss/vite` - Zero-runtime CSS engine
- **Alembic** (`>=1.13.3,<2.0.0`) - Asynchronous schema migration runner (`backend/alembic.ini`)
- **ESLint 10** (`^10.9.0`) - JavaScript and React hooks linting (`frontend/eslint.config.js`)

## Key Dependencies

**Critical:**
- `asyncpg` (`>=0.30.0,<1.0.0`) - Native async driver for PostgreSQL connection pooling
- `redis` (`>=5.2.0,<6.0.0`) - Async Redis client for caching and Celery broker communication (`backend/src/core/redis.py`)
- `celery` (`>=5.4.0,<6.0.0`) - Distributed task queue for asynchronous batch processing (`backend/src/workers/celery_app.py`)
- `scikit-learn` (`>=1.5.0,<2.0.0`), `numpy` (`>=1.26.0`), `pandas` (`>=2.2.0`), `xgboost` (`>=2.1.0`) - ML algorithms for placement prediction, wage forecasting, and attrition classification (`backend/src/ml/`)
- `npmai` (`>=0.1.9`) & Google Gemini API (`@ai-sdk/google`, `httpx`) - LLM reasoning for skill gap analysis and candidate career progression
- `recharts` (`^3.10.1`) - Data visualization for retention, placement, and regional intelligence charts
- `lucide-react` (`^1.34.0`) - Icon system across frontend dashboards
- `jspdf` (`^4.2.1`) & `reportlab` (`>=4.0.0`) - Client-side and server-side PDF generation for candidate dossiers and audit reports

**Infrastructure:**
- `python-jose[cryptography]` (`>=3.3.0`) & `passlib[bcrypt]` (`>=1.7.4`) - JWT encoding/decoding and bcrypt password hashing (`backend/src/core/security.py`)
- `python-multipart` (`>=0.0.12`) - Multipart form data parsing for document uploads (`backend/src/api/v1/endpoints/`)
- `httpx` (`>=0.27.2`) - Async HTTP client for external gateway communications (UIDAI, EPFO, SID)

## Configuration

**Environment:**
- Backend reads `.env` via `pydantic-settings.BaseSettings` in `backend/src/core/config.py`
- Frontend reads `VITE_*` environment variables in `frontend/src/api/client.js`
- Template environment files: `.env.example` in repo root, `backend/.env.example`, `frontend/.env.example`

**Build:**
- Frontend: `frontend/vite.config.js`
- Backend Docker: `backend/Dockerfile`, `backend/docker-compose.yml`, `render.yaml`
- Database: `backend/alembic.ini`

## Platform Requirements

**Development:**
- Python 3.12+
- Node.js 20+ and npm 10+
- PostgreSQL 16+ instance
- Redis 7+ instance

**Production:**
- Frontend deployed on Vercel (`frontend/vercel.json`) or static web host
- Backend ASGI deployed via Docker container on Render / Kubernetes / Cloud VM (`render.yaml`)
- Managed PostgreSQL (e.g. Neon, AWS RDS, Render Postgres) and Redis (e.g. Upstash, AWS ElastiCache)

---

*Stack analysis: 2026-09-12*
