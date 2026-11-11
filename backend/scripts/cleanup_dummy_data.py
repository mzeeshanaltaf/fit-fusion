"""ONE-OFF: delete the dummy fitness plans and reset the credit ledger.

What it does (all inside one transaction, after a JSON backup):
  * DELETE every row of the plans table (`fitness_plans`, or `user_profile` if the
    Alembic rename has not been applied yet). Cascades to workout_logs.
  * DELETE every row of `user_credit_transactions` and `user_credit_accounts`.

What it never touches: Better Auth tables (`user`, `session`, `account`,
`verification`, `jwks`), `exercise_videos`, `workout_details` and their `_backup` copies.
The existing user accounts are kept. They get a fresh SIGNUP_CREDITS from the API the
first time a verified user makes a request (credit account row missing = never granted).

Usage (from backend/, DATABASE_URL pointing at the target database):
    uv run python -m scripts.cleanup_dummy_data              # dry run: counts only
    uv run python -m scripts.cleanup_dummy_data --execute    # backup, confirm, delete

Run against the live database ONLY after the owner has confirmed.
"""

import argparse
import asyncio
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine

from app.config import DB_SCHEMA, get_settings

BACKUP_DIR = Path(__file__).resolve().parent.parent / "backups"
CREDIT_TABLES = (
    "user_credit_transactions",
    "user_credit_accounts",
)  # delete order (FK child first)


async def table_exists(connection: AsyncConnection, name: str) -> bool:
    result = await connection.scalar(
        text("SELECT to_regclass(:qualified) IS NOT NULL"), {"qualified": f"{DB_SCHEMA}.{name}"}
    )
    return bool(result)


async def count(connection: AsyncConnection, table: str) -> int:
    return int(await connection.scalar(text(f'SELECT count(*) FROM {DB_SCHEMA}."{table}"')) or 0)


async def dump_table(connection: AsyncConnection, table: str) -> list[dict[str, Any]]:
    result = await connection.execute(text(f'SELECT * FROM {DB_SCHEMA}."{table}"'))
    return [dict(row) for row in result.mappings()]


async def main(execute: bool, assume_yes: bool) -> int:
    url = make_url(get_settings().database_url)
    target = f"{url.host}:{url.port or 5432}/{url.database}"
    engine = create_async_engine(
        get_settings().database_url, connect_args={"server_settings": {"search_path": DB_SCHEMA}}
    )
    try:
        async with engine.connect() as connection:
            plans_table = (
                "fitness_plans"
                if await table_exists(connection, "fitness_plans")
                else "user_profile"
            )
            tables = [plans_table, *CREDIT_TABLES]
            if await table_exists(connection, "workout_logs"):
                tables.insert(1, "workout_logs")  # cascades from plans; backed up for completeness

            print(f"Target database : {target}  (schema {DB_SCHEMA})")
            for table in tables:
                print(f"  {table:<28} {await count(connection, table):>6} rows")
            print(f"  {'user (kept)':<28} {await count(connection, 'user'):>6} rows")

            if not execute:
                print("\nDry run only. Re-run with --execute to back up and delete.")
                return 0

            BACKUP_DIR.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
            backup_path = BACKUP_DIR / f"cleanup_{stamp}_{url.database}.json"
            backup = {table: await dump_table(connection, table) for table in tables}
            backup_path.write_text(json.dumps(backup, indent=2, default=str), encoding="utf-8")
            print(f"\nBackup written: {backup_path}")

            if not assume_yes:
                answer = await asyncio.to_thread(
                    input, f"Type the database name '{url.database}' to delete the rows above: "
                )
                if answer.strip() != url.database:
                    print("Aborted, nothing deleted.")
                    return 1

            await connection.rollback()  # end the autobegun read transaction
            async with connection.begin():
                await connection.execute(text(f'DELETE FROM {DB_SCHEMA}."{plans_table}"'))
                for table in CREDIT_TABLES:
                    await connection.execute(text(f'DELETE FROM {DB_SCHEMA}."{table}"'))

            print("\nDone. Rows now:")
            for table in tables:
                print(f"  {table:<28} {await count(connection, table):>6} rows")
            print(f"  {'user (kept)':<28} {await count(connection, 'user'):>6} rows")
            return 0
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "--execute", action="store_true", help="back up, then delete (default: dry run)"
    )
    parser.add_argument("--yes", action="store_true", help="skip the typed confirmation")
    args = parser.parse_args()
    sys.exit(asyncio.run(main(args.execute, args.yes)))
