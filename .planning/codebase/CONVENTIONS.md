# Coding Conventions

**Analysis Date:** 2026-09-12

## Naming Patterns

**Files:**
- Backend Python: `snake_case.py` (e.g. `career_intelligence_service.py`, `placement_dto.py`).
- Frontend Components: `PascalCase.jsx` (e.g. `LearnerPortal.jsx`, `MetricCard.jsx`).
- Frontend Hooks/APIs/Utils: `camelCase.js` (e.g. `useAuth.js`, `careerIntelligence.js`).

**Functions & Methods:**
- Python: `snake_case` (e.g. `calculate_mastery_probability()`, `get_learner_profile()`).
- JavaScript: `camelCase` (e.g. `fetchSkillGaps()`, `handleAssessmentSubmit()`).

**Variables:**
- Python & JavaScript: `snake_case` in Python, `camelCase` in JS.
- Constants / Env vars: `UPPER_SNAKE_CASE` (e.g. `API_V1_STR`, `BKT_DEFAULT_P_L0`, `DEFAULT_PAGE_SIZE`).

**Types & Classes:**
- Python: `PascalCase` for Pydantic schemas, SQLAlchemy models, and Service classes (e.g. `LearnerProfile`, `AssessmentService`, `BaseModel`).
- React: `PascalCase` for UI component functions.

## Code Style

**Formatting:**
- Python: Follows PEP 8 with 4-space indentation and explicit type annotations on public functions.
- Frontend: ESLint 10 (`frontend/eslint.config.js`) with React hooks and React Refresh plugin rules.

**Linting:**
- Config: `frontend/eslint.config.js`
- Enforces modern ES module syntax, strict hooks usage (`eslint-plugin-react-hooks`), and prevents unused variables.

## Import Organization

**Python Backend:**
1. Standard library imports (e.g. `os`, `sys`, `datetime`, `typing`).
2. Third-party packages (e.g. `fastapi`, `pydantic`, `sqlalchemy`, `celery`).
3. Local application imports grouped by layer:
   - `src.core.*`
   - `src.models.*`
   - `src.schemas.*`
   - `src.services.*`

**JavaScript Frontend:**
1. React core and router (`react`, `react-router-dom`).
2. Third-party UI / icons / chart libraries (`lucide-react`, `recharts`, `axios`).
3. Local components and layouts (`../components/`, `../layouts/`).
4. Context, hooks, and API client utilities (`../context/`, `../hooks/`, `../api/`).

**Path Aliases:**
- Backend uses explicit `src.<module>` imports with `PYTHONPATH=backend` configured in pytest and Docker.

## Error Handling

**Patterns:**
- Custom application exceptions inherit from `AppException` in `backend/src/core/exceptions.py`.
- Service methods raise typed domain exceptions (e.g. `NotFoundError`, `ConflictError`, `ValidationError`).
- FastAPI exception handlers translate domain exceptions into uniform JSON envelopes:
  ```json
  {
    "success": false,
    "error": {
      "code": "ENTITY_NOT_FOUND",
      "message": "Learner with ID 104 not found",
      "details": {}
    },
    "correlation_id": "c7a840e1-64d8-4f2b"
  }
  ```
- In frontend API clients, Axios response interceptors catch 401/403 errors and trigger token refreshes or redirect to login.

## Logging

**Framework:**
- Python standard `logging` configured via `backend/src/core/logging.py`.
- Formatted with timestamp, log level, correlation ID, and module name.

**Patterns:**
- `logger.info()` for lifecycle events, worker task completion, and gateway requests.
- `logger.warning()` for rate limits, recoverable network retries, or degraded service states.
- `logger.error(..., exc_info=True)` for unexpected exceptions in background tasks and route handlers.

## Comments

**When to Comment:**
- Complex mathematical formulas (such as Bayesian updating formulas in `backend/src/ml/bkt.py`).
- Security decisions, CORS domain matching logic, and regulatory requirements (NSQF/UIDAI).
- Docstrings on all major service classes and API endpoint definitions.

## Function Design

**Size:**
- Single-responsibility functions under 50 lines where practical.
- Long database aggregation queries encapsulated within dedicated service helper methods.

**Parameters:**
- Use Pydantic models for structured payloads rather than large parameter lists.
- FastAPI dependency injection (`Depends(get_current_user)`, `Depends(get_db)`) for contextual request dependencies.

## Module Design

**Exports:**
- Explicit module exports in `__init__.py` for `models`, `schemas`, and `services`.
- Frontend uses standard ES6 default and named exports.

---

*Convention analysis: 2026-09-12*
