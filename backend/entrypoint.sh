#!/bin/sh
set -e

# ==============================================================================
# KaushalNexus Container Entrypoint Script
# ==============================================================================

# Wait for PostgreSQL database if HOST and PORT are defined
if [ -n "$POSTGRES_SERVER" ] && [ -n "$POSTGRES_PORT" ]; then
    echo "Waiting for PostgreSQL database at $POSTGRES_SERVER:$POSTGRES_PORT..."
    while ! nc -z "$POSTGRES_SERVER" "$POSTGRES_PORT" 2>/dev/null; do
        sleep 0.5
    done
    echo "PostgreSQL is reachable."
fi

# Wait for Redis if REDIS_URL is configured
if [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
    echo "Waiting for Redis at $REDIS_HOST:$REDIS_PORT..."
    while ! nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; do
        sleep 0.5
    done
    echo "Redis is reachable."
fi

# Command Dispatcher
case "$1" in
    api)
        echo "Starting KaushalNexus FastAPI Application..."
        if [ "$RUN_MIGRATIONS" = "true" ] || [ "$AUTO_MIGRATE" = "true" ]; then
            echo "Applying database migrations (alembic upgrade head)..."
            alembic upgrade head
        fi
        exec uvicorn src.main:app \
            --host 0.0.0.0 \
            --port "${PORT:-8000}" \
            --workers "${WORKERS:-2}" \
            --log-level "${LOG_LEVEL_LOWER:-info}" \
            --access-log
        ;;

    worker)
        echo "Starting KaushalNexus Celery Background Worker..."
        exec celery -A src.workers.celery_app.celery worker \
            --loglevel="${LOG_LEVEL:-INFO}" \
            --concurrency="${CELERY_CONCURRENCY:-4}" \
            -Q default,epfo_queue,sid_queue,reports_queue \
            -E
        ;;

    beat)
        echo "Starting KaushalNexus Celery Periodic Beat Scheduler..."
        exec celery -A src.workers.celery_app.celery beat \
            --loglevel="${LOG_LEVEL:-INFO}"
        ;;

    migrate)
        echo "Applying Alembic database migrations..."
        exec alembic upgrade head
        ;;

    seed)
        echo "Seeding KaushalNexus database with deterministic demo dataset..."
        exec python -m src.seed
        ;;

    test)
        echo "Running KaushalNexus test suite via pytest..."
        exec pytest "${@:2}"
        ;;

    *)
        exec "$@"
        ;;
esac
