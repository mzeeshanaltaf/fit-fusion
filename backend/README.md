# FitFusion API

FastAPI backend (Python 3.12, uv). Phase 3 state: feature-complete API: JWT auth, credits,
asynchronous plan generation (OpenAI), plans/jobs/credits, profile, swap/regenerate (5 free
edits per plan), PDF export, workout logs and progress, analytics. Plan: `../docs/plan/`.
Endpoint reference: `/docs` (Swagger) or `/openapi.json` on a running server, and the
endpoint table in `../docs/plan/HANDOFF.md`.

## Run

```bash
cd backend
cp .env.example .env          # then edit DATABASE_URL etc.
uv sync
uv run uvicorn app.main:create_app --factory --reload --port 8000
```

- `GET /health` is public and checks the database (503 when it is unreachable).
- `/v1/me/overview`, `/v1/plans` (+ `/generate`, `/{id}`), `/v1/jobs/{id}`, `/v1/credits`
  (+ `/history`) need a verified user. The first request from a verified user grants
  `SIGNUP_CREDITS`; generating a plan costs 1 credit and is refunded if it fails.
- On startup, jobs a previous process left `queued`/`running` are failed and refunded.
- `GET /v1/admin/analytics` takes the `X-API-Key` header (= `ADMIN_API_KEY`), no JWT; it
  answers 404 while `ADMIN_API_KEY` is empty.
- `GET /v1/plans/{id}/pdf` needs WeasyPrint's native libraries (Pango). The Docker image
  installs them; on Windows/macOS see WeasyPrint's install docs, or run the API in Docker.
  PDF tests need it too.
- `GET /v1/whoami` needs `Authorization: Bearer <token>`. It is a diagnostic that proves a
  Better Auth token is accepted. Get a token from the Next.js app: `GET /api/auth/token`
  with a signed-in session cookie.

## Test and lint

```bash
uv run pytest            # unit tests; DB-backed tests are skipped
uv run ruff check . && uv run ruff format --check .
```

DB-backed tests run only when `TEST_DATABASE_URL` points at a migrated, **disposable**
database (never the live one): the Phase 2 flow tests (`tests/test_flows_db.py`) commit,
TRUNCATE the app tables and replace `workout_details` with synthetic rows, so `conftest.py`
refuses any URL that is not a local database whose name contains `test`. The model is
always mocked (`tests/fakes.py`); `OPENAI_API_KEY` is forced empty under pytest.

Offline recipe (no access to the live database needed): rebuild the pre-migration schema
from `tests/sql/legacy_schema.sql`, then migrate.

```bash
docker run -d --name fitfusion-test-postgres -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=fitfusion_test -p 127.0.0.1:5436:5432 postgres:17
docker exec -i fitfusion-test-postgres psql -U postgres -d fitfusion_test -q \
  -v ON_ERROR_STOP=1 < tests/sql/legacy_schema.sql
export DATABASE_URL=postgresql://postgres:test@127.0.0.1:5436/fitfusion_test
uv run alembic upgrade head
TEST_DATABASE_URL=$DATABASE_URL uv run pytest
```

Real-library run (Phase 3): the live `workout_details` is copied, data only, into a SECOND
database of the same container (the DB tests truncate `workout_details` in
`fitfusion_test`). `legacy_schema.sql` already has the live table's `deleted_at` column.

```bash
docker exec fitfusion-test-postgres psql -U postgres -c "CREATE DATABASE fitfusion_full TEMPLATE fitfusion_test"
# read-only, data-only dump of that one table (DATABASE_URL = live DB, loaded from .env.local)
docker run --rm -e DATABASE_URL postgres:17 sh -c \
  'pg_dump --data-only --no-owner --no-privileges -t fit_fusion.workout_details "$DATABASE_URL"' \
  > workout_details_data.sql
docker exec -i fitfusion-test-postgres psql -U postgres -d fitfusion_full -v ON_ERROR_STOP=1 \
  < workout_details_data.sql
```

Alternative: throwaway Postgres with a copy of the live schema:

```bash
docker run -d --name fitfusion-test-postgres -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=fitfusion_test -p 127.0.0.1:5436:5432 postgres:17
# schema-only dump of the live fit_fusion schema (no data), loaded into the container:
docker run --rm -e DATABASE_URL postgres:17 sh -c \
  'pg_dump --schema-only --no-owner --no-privileges -n fit_fusion "$DATABASE_URL"' \
  | docker exec -i fitfusion-test-postgres psql -U postgres -d fitfusion_test -q
export DATABASE_URL=postgresql://postgres:test@127.0.0.1:5436/fitfusion_test
uv run alembic upgrade head
TEST_DATABASE_URL=$DATABASE_URL uv run pytest
```

## Migrations (Alembic, `fit_fusion` schema only)

```bash
uv run alembic upgrade head      # 0001 fitness_plans, 0002 new tables, 0003 ledger types,
                                 # 0004 free (zero-credit) edit rows in the ledger
uv run alembic downgrade base    # exact inverse (verified by schema diff)
uv run alembic current
```

Write migrations by hand. `alembic/env.py` hides the protected tables (`exercise_videos`,
`workout_details`, `_backup` copies) and Better Auth's tables from autogenerate, but
`alembic check` is noisy because the models are schema-qualified; do not use it as a gate.

## One-off data cleanup

`scripts/cleanup_dummy_data.py` deletes the dummy plans and resets the credit ledger.
Dry run by default, writes a JSON backup to `backups/` (gitignored), and needs a typed
confirmation. **Run against the live database only after the owner confirms.**

```bash
uv run python -m scripts.cleanup_dummy_data              # counts only
uv run python -m scripts.cleanup_dummy_data --execute    # backup, confirm, delete
```

## Docker

```bash
docker build -t fitfusion-api backend
docker run -p 8000:8000 --env-file backend/.env fitfusion-api
```

Migrations are not run on container start; apply them explicitly.
