# Testing Patterns

**Analysis Date:** 2026-09-12

## Test Framework

**Runner:**
- **Backend:** `pytest` (v8.3.3+) with `pytest-asyncio` (`0.24.0+`)
- Config: `backend/pytest.ini`
- **Frontend:** Node.js native test runner (`node --test`)
- Config: `frontend/package.json` test script

**Assertion Library:**
- Python standard assertions with pytest output inspection
- Node.js `node:assert/strict` for frontend tests

**Run Commands:**
```bash
# Backend test execution
pytest backend/tests/                          # Run all backend tests
pytest backend/tests/test_learners.py          # Run single test file
pytest -k "test_bkt"                           # Run tests matching expression
pytest --cov=src --cov-report=term-missing     # Run with coverage

# Frontend test execution
npm --prefix frontend test                     # Run all frontend tests
node --test frontend/src/__tests__/learner_pipeline.test.js # Run single frontend test
```

## Test File Organization

**Location:**
- Backend: Concentrated in `backend/tests/`
- Frontend: Concentrated in `frontend/src/__tests__/`

**Naming:**
- Backend: `test_<feature>.py` (e.g. `test_bkt.py`, `test_learners.py`, `test_auth.py`)
- Frontend: `<feature>.test.js` (e.g. `learner_pipeline.test.js`, `permissions.test.js`)

**Structure:**
```
backend/tests/
├── conftest.py                       # Global fixtures: client, db session, RBAC headers
├── test_auth.py                      # Authentication & token verification tests
├── test_bkt.py                       # Bayesian Knowledge Tracing unit tests
├── test_learners.py                  # Learner CRUD & 360 profile tests
├── test_ml_layer.py                  # Placement predictor & feature pipeline tests
└── test_phase7_impact.py             # Longitudinal retention & outcome analytics tests

frontend/src/__tests__/
├── permissions.test.js               # RBAC permission matrix checks
├── learner_pipeline.test.js          # Learner data transformation tests
└── mcq_assessment.test.js            # Assessment question grading tests
```

## Test Structure

**Backend Async Test Pattern:**
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_learner_profile(client: AsyncClient, officer_headers: dict):
    # Execute request using pre-authenticated fixture
    response = await client.get("/api/v1/learners/1", headers=officer_headers)
    
    # Assert HTTP status and schema validity
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "id" in data["data"]
    assert "readiness_score" in data["data"]
```

**BKT Mathematical Verification Pattern:**
```python
from src.ml.bkt import BayesianKnowledgeTracer

def test_bkt_mastery_increase_on_correct_response():
    tracer = BayesianKnowledgeTracer(p_l0=0.3, p_trans=0.1, p_guess=0.2, p_slip=0.1)
    
    # Prior mastery
    p_prior = 0.3
    # Update after correct response
    p_post = tracer.update_mastery(p_prior, is_correct=True)
    
    # Assert probability increases
    assert p_post > p_prior
    assert 0.0 <= p_post <= 1.0
```

## Mocking

**Framework:**
- Python standard library `unittest.mock` (`patch`, `MagicMock`, `AsyncMock`).

**Patterns:**
```python
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_gemini_service_fallback(client: AsyncClient, admin_headers: dict):
    # Mock external Google Gemini API call
    with patch("src.services.gemini_service.GeminiService.generate_response", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = {"summary": "Generated Skill Remediation Plan"}
        
        response = await client.post("/api/v1/ai/remediation", json={"skill_id": 42}, headers=admin_headers)
        assert response.status_code == 200
```

**What to Mock:**
- Third-party HTTP gateway requests (UIDAI Aadhaar, EPFO, Google Gemini).
- Long-running external message broker delivery.

**What NOT to Mock:**
- Local Pydantic serialization/deserialization.
- In-memory Bayesian mathematical computations (`src/ml/bkt.py`).

## Fixtures and Factories

**Test Data & Clients:**
- Defined in `backend/tests/conftest.py`.
- `client`: Async HTTP test client with ASGI transport bound to `app`.
- `db`: Async database session with transaction rollback.
- Role headers: `admin_headers`, `officer_headers`, `tp_headers`, `employer_headers`, `learner_headers`.

## Coverage

**Requirements:**
- High test coverage across business-critical modules: BKT inference engine, authentication/RBAC guards, learner intelligence services, and retention checkpoints.

**View Coverage:**
```bash
pytest --cov=src --cov-report=html
open htmlcov/index.html
```

## Test Types

**Unit Tests:**
- Math & ML algorithms (`test_bkt.py`, `test_ml_layer.py`).
- Frontend utility functions and state validation (`frontend/src/__tests__/`).

**Integration Tests:**
- API router endpoints verifying middleware, DB persistence, and schema responses (`test_learners.py`, `test_assessments.py`).
- RBAC authorization matrix tests (`test_authorization_hardening.py`, `test_rbac.py`).

**E2E Tests:**
- End-to-end learner assessment, scoring, and placement pipeline verification (`test_phase2_pipeline.py`, `test_phase3_adaptive_loop.py`).

## Common Patterns

**Async Testing:**
- Use `@pytest.mark.asyncio` decorator on async test functions.
- Always `await` client HTTP calls and async database queries.

**Error Testing:**
```python
@pytest.mark.asyncio
async def test_unauthorized_access_rejected(client: AsyncClient):
    response = await client.get("/api/v1/learners")
    # Expect 401 Unauthorized when missing token
    assert response.status_code == 401
```

---

*Testing analysis: 2026-09-12*
