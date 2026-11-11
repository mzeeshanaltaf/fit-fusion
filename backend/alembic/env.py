"""Alembic environment (async, `fit_fusion` schema only).

Safety rails:
  * ``alembic_version`` lives in ``fit_fusion`` so we never touch other apps' schemas.
  * ``include_object`` hides every table this backend does not own from autogenerate:
    the protected library tables and Better Auth's tables.
"""

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context
from app.config import DB_SCHEMA, get_settings
from app.models import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata

# Never autogenerate against these. `exercise_videos`, `workout_details` and their
# `_backup` copies are protected by project decision; the rest belong to Better Auth.
FOREIGN_TABLES = {
    "exercise_videos",
    "exercise_videos_backup",
    "workout_details",
    "workout_details_backup",
    "user",
    "session",
    "account",
    "verification",
    "jwks",
}


def include_object(obj, name, type_, reflected, compare_to) -> bool:
    if type_ == "table" and name in FOREIGN_TABLES:
        return False
    return not (
        type_ in {"index", "unique_constraint", "foreign_key_constraint"}
        and getattr(getattr(obj, "table", None), "name", None) in FOREIGN_TABLES
    )


def include_name(name, type_, parent_names) -> bool:
    # The database hosts ~25 other apps' schemas; only ever look inside ours.
    # `None` is the connection's default schema, which search_path sets to ours.
    if type_ == "schema":
        return name in (None, DB_SCHEMA)
    return True


def _configure(**kwargs) -> None:
    context.configure(
        target_metadata=target_metadata,
        version_table_schema=DB_SCHEMA,
        include_schemas=True,
        include_name=include_name,
        include_object=include_object,
        compare_type=True,
        **kwargs,
    )


def run_migrations_offline() -> None:
    _configure(
        url=get_settings().database_url, literal_binds=True, dialect_opts={"paramstyle": "named"}
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    _configure(connection=connection)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(
        get_settings().database_url,
        poolclass=pool.NullPool,
        connect_args={"server_settings": {"search_path": DB_SCHEMA}},
    )
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
