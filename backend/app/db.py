"""Async engine and session dependency.

Every connection gets ``search_path=fit_fusion`` so unqualified table names resolve
to the app's schema (same trick the Next.js side uses for Better Auth).

Session pattern (relied on by later phases):
  * ``get_session`` yields one ``AsyncSession`` per request and closes it afterwards.
  * Nothing is committed automatically. Services call ``await session.commit()``
    (or ``rollback()``) themselves.
  * The session autobegins on its first statement, so use ``commit()`` rather than
    ``async with session.begin()`` once any query (e.g. an ownership check) has run.
  * Background tasks must not reuse the request's session; open their own with
    ``get_sessionmaker()()``.
"""

from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import DB_SCHEMA, get_settings


@lru_cache
def get_engine() -> AsyncEngine:
    return create_async_engine(
        get_settings().database_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        connect_args={"server_settings": {"search_path": DB_SCHEMA}},
    )


@lru_cache
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with get_sessionmaker()() as session:
        yield session


async def dispose_engine() -> None:
    if get_engine.cache_info().currsize:
        await get_engine().dispose()
        get_engine.cache_clear()
        get_sessionmaker.cache_clear()
