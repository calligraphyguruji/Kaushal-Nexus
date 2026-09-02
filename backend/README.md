# KaushalNexus Backend API

> Integration-ready prototype for National Skill-to-Employment Intelligence Platform backend built with **Python 3.12**, **FastAPI**, **SQLAlchemy 2.x (Async)**, **PostgreSQL (PostGIS)**, **Pydantic v2**, **Redis**, and **Celery**.

---

## 🏗️ Architecture Overview

- **Web Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **Async Database ORM**: [SQLAlchemy 2.0 Async](https://docs.sqlalchemy.org/) with `asyncpg`
- **Database Engine**: [PostgreSQL 16](https://www.postgresql.org/) with PostGIS extensions
- **Database Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
- **Distributed Cache & Task Broker**: [Redis 7.4](https://redis.io/)
- **Background Worker Processing**: [Celery](https://docs.celeryq.dev/)
- **Machine Learning Layer**: [scikit-learn](https://scikit-learn.org/) & [NumPy](https://numpy.org/) (TF-IDF & Ridge Regression)
- **Security & RBAC**: JWT Access & Refresh token rotation, bcrypt hashing, correlation IDs, security headers, sliding-window rate limiting, and immutable audit logs.
- **Testing**: [pytest](https://docs.pytest.org/) + `pytest-asyncio` + `httpx` (148 automated tests)

---

## 📁 Directory Structure

```text
backend/
├── src/
│   ├── main.py                   # FastAPI application factory, middlewares & lifespan
│   ├── api/
│   │   ├── deps.py               # Dependency injection & RBAC role guards
│   │   ├── router.py             # Top-level API router
│   │   └── v1/                   # Version 1 API domain routers
│   │       ├── audit.py          # Compliance & audit log querying
│   │       ├── dashboard.py      # KPI metrics, funnel & sector matrix
│   │       ├── learners.py       # Candidate 360 dossiers & competency management
│   │       ├── matching.py       # Multi-signal job matching & batch dispatch
│   │       ├── ml.py             # Skill embeddings & wage prediction endpoints
│   │       ├── placements.py     # Placements & 3M/6M/12M retention checkpoints
│   │       ├── regional.py       # District divergence & priority clusters
│   │       ├── skill_gaps.py     # Competency deficit analytics & interventions
│   │       ├── tasks.py          # Background worker triggers & status tracking
│   │       ├── verification.py   # External verification sandbox adapters (Aadhaar, EPFO, SID)
│   │       └── endpoints/
│   │           ├── auth.py       # Authentication, registration & refresh tokens
│   │           └── health.py     # Health checks & telemetry
│   ├── core/
│   │   ├── config.py             # Pydantic v2 Settings from .env
│   │   ├── database.py           # SQLAlchemy 2.0 Async Engine & Session pool
│   │   ├── exceptions.py         # Structured global exception handlers
│   │   ├── logging.py            # Structured logging, correlation IDs & PII redaction
│   │   ├── redis.py              # Redis async connection pool & diagnostics
│   │   └── security.py           # JWT tokens, password hashing & PII masking
│   ├── middleware/
│   │   └── security_middleware.py # Correlation IDs, security headers & rate limiting
│   ├── ml/
│   │   ├── embeddings.py         # Skill embedding service (TF-IDF & Soft-Jaccard)
│   │   └── wage_predictor.py     # Longitudinal wage growth prediction service
│   ├── models/                   # SQLAlchemy ORM entity models
│   ├── schemas/                  # Pydantic validation schemas & DTOs
│   ├── services/                 # Business logic service layer & external adapters
│   └── workers/                  # Celery tasks (EPFO mock sync, SID sandbox pipeline, reports, follow-ups)
├── alembic/                      # Database migration versions
├── tests/                        # Pytest test suite (106 unit & integration tests)
├── .env.example                  # Environment configuration template
├── entrypoint.sh                 # Docker container entrypoint script
├── requirements.txt              # Production Python dependencies
├── Dockerfile                    # Production multi-stage Docker build specification
├── docker-compose.yml            # Production container stack (API, Postgres, Redis, Worker)
└── README.md
```

---

## 1. 💻 Local Development Setup

### Prerequisites
- Python 3.12+
- PostgreSQL 16+
- Redis 7.x+

### Step 1: Create Virtual Environment
```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
```

### Step 2: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables
```bash
cp .env.example .env
```
*Edit `.env` to configure database credentials, Redis host, and secret keys.*

---

## 2. 🗄️ Running Database Migrations

### Apply Latest Migrations
```bash
# Using CLI in virtual environment
alembic upgrade head

# Using Docker Compose standalone migration runner
docker compose run --rm migration
```

### Generate a New Migration Revision
```bash
alembic revision --autogenerate -m "describe_schema_change"
```

### View Migration History
```bash
alembic current
alembic history --verbose
```

---

## 3. 🌱 Seeding Deterministic Demo Data

KaushalNexus includes a comprehensive deterministic generator that populates realistic demonstration data across institutional RBAC roles, 31 Indian districts, training centers, competencies, 140 candidate dossiers, corporate mandates, placements, and longitudinal retention checkpoints for SIH evaluation.

```bash
# Seed local database via CLI
python -m src.seed

# Or seed containerized database via Docker Compose runner
docker compose run --rm seed
```

---

## 4. 🚀 Starting Services

### Option A: Local Development Server (Hot-Reload)
```bash
# Start FastAPI application
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# In a separate terminal, start Celery background worker
celery -A src.workers.celery_app.celery worker --loglevel=info -Q default,epfo_queue,sid_queue,reports_queue
```

### Option B: Docker Compose Multi-Container Stack
Start all four core services (`api`, `postgres`, `redis`, `celery_worker`) simultaneously:
```bash
# Build and start all containers in detached mode
docker compose up -d --build

# View real-time logs across all services
docker compose logs -f

# View status of running containers and health checks
docker compose ps
```

### Accessing APIs & Documentation
- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **System Health Check**: `curl http://localhost:8000/health`
- **Database Diagnostic**: `curl http://localhost:8000/api/v1/health/db`
- **Redis Diagnostic**: `curl http://localhost:8000/api/v1/health/redis`

---

## 5. 🧪 Running Automated Tests

The backend includes a comprehensive 148-test pytest suite covering unit logic, RBAC policies, API integration, longitudinal follow-ups, consents, and asynchronous workers.

```bash
# Run complete test suite
pytest

# Run tests with verbose output and execution timings
pytest -v --durations=10

# Run specific test modules
pytest tests/test_auth.py tests/test_rbac.py
pytest tests/test_learners.py tests/test_competencies.py
pytest tests/test_placements.py tests/test_matching.py
pytest tests/test_celery_redis.py tests/test_external_integrations.py
pytest tests/test_hardening_security.py
```

---

## 6. 🚢 Production Deployment Guidelines

### Container Deployment Checklist
1. **Secrets Management**:
   - Generate a cryptographically secure `SECRET_KEY`:
     ```bash
     openssl rand -hex 32
     ```
   - Store secrets in cloud secret managers (AWS Secrets Manager, GCP Secret Manager, Vault) or inject via secure environment variables.
   - Never commit plaintext `.env` files to git repositories.

2. **Database Sizing & Pooling**:
   - Configure `DB_POOL_SIZE` (default: 10) and `DB_MAX_OVERFLOW` (default: 20) in `.env` according to expected concurrency.

3. **Uvicorn Worker Tuning**:
   - Set `WORKERS` to `(2 * CPU_CORES) + 1` for optimal throughput.

4. **Production Build & Launch**:
   ```bash
   # Build production image
   docker build -t kaushalnexus-backend:latest .

   # Launch container stack
   docker compose -f docker-compose.yml up -d
   ```

5. **Container Security Enforcement**:
   - The production Docker image runs as an unprivileged non-root user (`appuser`, UID 10001).
   - Rate limiting, security headers (HSTS, CSP, X-Frame-Options), and PII masking are enabled by default.
