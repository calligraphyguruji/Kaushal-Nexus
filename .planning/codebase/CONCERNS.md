# Codebase Concerns

**Analysis Date:** 2026-09-12

## Tech Debt

**External Government Gateway Mocking:**
- Issue: Integrations with UIDAI (Aadhaar), EPFO, and Skill India Digital (SID) currently default to mock adapters (`EXTERNAL_INTEGRATION_MODE=mock`).
- Files: `backend/src/services/aadhaar_adapter.py`, `backend/src/services/epfo_adapter.py`, `backend/src/services/sid_adapter.py`
- Impact: While enabling rapid local development, live production deployment requires formal API signing keys, digital certificates, and IP whitelisting with government data exchanges.
- Fix approach: Finalize mutual TLS (mTLS) client certificates and production webhook secret verification once production gateway access is provisioned.

**Database Seed Scripts vs Dynamic Migrations:**
- Issue: Large seed scripts (`backend/src/seed.py`, `backend/src/seed_bkt_data.py`) insert hardcoded sample datasets for testing and demos.
- Files: `backend/src/seed.py`, `backend/src/seed_bkt_data.py`
- Impact: If schemas change in `backend/src/models/`, seed scripts may fall out of sync or require manual updates.
- Fix approach: Create model factories using `factory-boy` or dynamic database seed generators that adapt to SQLAlchemy model schemas automatically.

## Known Bugs & Edge Cases

**PostgreSQL URL Dialect Compatibility:**
- Symptoms: Cloud databases (e.g. Render, Supabase, Neon) provide `postgres://` or `postgresql://` connection strings, which cause SQLAlchemy async crashes if not converted to `postgresql+asyncpg://`.
- Files: `backend/src/core/config.py`
- Trigger: Deploying to cloud PaaS with raw `DATABASE_URL`.
- Workaround: An automated field validator in `backend/src/core/config.py` normalizes prefixes before passing to `create_async_engine`, but external Celery configurations must adhere to the same cleaned string.

## Security Considerations

**Default Secret Keys in Settings:**
- Risk: `SECRET_KEY` in `backend/src/core/config.py` has a development default fallback value.
- Files: `backend/src/core/config.py`
- Current mitigation: Application raises warnings or requires environment overrides in non-development environments.
- Recommendations: Enforce strict startup validation in `lifespan` that crashes on boot in `production` mode if `SECRET_KEY` matches the default value.

**CORS Wildcards on Deployment:**
- Risk: Permissive CORS could expose sensitive API endpoints to unauthorized cross-origin requests.
- Files: `backend/src/main.py`
- Current mitigation: Explicit origin array and regex pattern restricting allowed origins to local development ports and onrender.com domains.
- Recommendations: Restrict CORS origins strictly to registered production domains in production settings.

## Performance Bottlenecks

**Longitudinal Cohort Aggregations:**
- Problem: Real-time calculation of multi-year retention rates, wage progression ratios, and attrition curves across tens of thousands of records can introduce DB latency.
- Files: `backend/src/services/impact_measurement_service.py`, `backend/src/api/v1/impact.py`
- Cause: Complex SQL joins across `Learner`, `Placement`, and `RetentionCheckpoint` tables.
- Improvement path: Implement materialized views in PostgreSQL refreshed on a schedule, or cache aggregated district/cohort statistics in Redis with a 15-minute TTL.

## Fragile Areas

**Celery Task Broker Availability:**
- Files: `backend/src/workers/celery_app.py`, `backend/src/core/redis.py`
- Why fragile: If the Redis broker restarts or exhausts connection limits, queued background synchronization jobs (like EPFO batch audits) can be dropped if persistent brokers or dead-letter queues are not fully configured.
- Safe modification: Ensure task idempotency with Redis task locks and configure Celery task retries with exponential backoff (`autoretry_for=(Exception,)`, `max_retries=3`).
- Test coverage: Verified with unit mocks in `backend/tests/test_celery_redis.py`.

## Scaling Limits

**Asynchronous Database Connection Pool:**
- Current capacity: `DB_POOL_SIZE = 10`, `DB_MAX_OVERFLOW = 20` (max 30 concurrent active database checkouts per worker instance).
- Limit: Can saturate on sudden concurrent spikes (>500 requests/sec) on a single backend instance.
- Scaling path: Configure external connection pooler (e.g. PgBouncer) in front of PostgreSQL, and scale Uvicorn worker containers horizontally.

## Dependencies at Risk

**`passlib[bcrypt]` Python 3.13 Compatibility:**
- Risk: `passlib` has had stagnant maintenance, emitting deprecation warnings regarding modern `bcrypt` releases.
- Impact: Potential compatibility breaks in future Python 3.13/3.14 upgrades.
- Migration plan: Migrate to direct `bcrypt` or modern `argon2-cffi` for password hashing in `backend/src/core/security.py`.

## Test Coverage Gaps

**Frontend End-to-End (E2E) Browser Testing:**
- What's not tested: Full browser flows (login → learner onboarding → assessment attempt → dashboard visualization).
- Files: `frontend/src/pages/`
- Risk: Regressions in complex multi-step UI forms or chart rendering when updating React dependencies.
- Priority: Medium.

---

*Concerns audit: 2026-09-12*
