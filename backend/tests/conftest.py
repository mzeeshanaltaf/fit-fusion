import os

# Must run before `app` is imported: Settings is built from the environment on first use.
os.environ["DATABASE_URL"] = "postgresql://test:test@127.0.0.1:1/test"
os.environ["JWKS_URL"] = "http://jwks.test/api/auth/jwks"
os.environ["JWT_ISSUER"] = "http://issuer.test"
os.environ["JWT_AUDIENCE"] = "http://audience.test"
os.environ["CORS_ORIGINS"] = "http://localhost:3000"
# Never let a test reach the real model, whatever a developer's backend/.env contains.
os.environ["OPENAI_API_KEY"] = ""
# Admin routes are off unless a test turns them on; never use a key from backend/.env.
os.environ["ADMIN_API_KEY"] = ""
os.environ["SIGNUP_CREDITS"] = "10"

import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from jwt.algorithms import OKPAlgorithm
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.auth import JWKSCache, get_jwks_cache
from app.config import DB_SCHEMA, Settings, get_settings
from app.db import dispose_engine, get_engine, get_sessionmaker
from app.main import create_app
from app.services.llm import get_llm
from tests.fakes import FakeLLM
from tests.library_seed import LIBRARY

ISSUER = os.environ["JWT_ISSUER"]
AUDIENCE = os.environ["JWT_AUDIENCE"]


@dataclass
class SigningKey:
    """A locally generated Ed25519 key pair, the same algorithm Better Auth defaults to."""

    kid: str
    private_key: Ed25519PrivateKey

    @classmethod
    def generate(cls, kid: str) -> "SigningKey":
        return cls(kid=kid, private_key=Ed25519PrivateKey.generate())

    @property
    def jwk(self) -> dict[str, Any]:
        public = OKPAlgorithm().to_jwk(self.private_key.public_key(), as_dict=True)
        return {**public, "kid": self.kid}

    def token(
        self,
        *,
        sub: str | None = "user-123",
        iss: str = ISSUER,
        aud: str = AUDIENCE,
        exp_in: int = 900,
        extra: dict[str, Any] | None = None,
        kid: str | None = None,
    ) -> str:
        now = int(time.time())
        claims: dict[str, Any] = {"iat": now, "exp": now + exp_in, "iss": iss, "aud": aud}
        if sub is not None:
            claims["sub"] = sub
        claims.update(extra or {})
        return jwt.encode(
            claims, self.private_key, algorithm="EdDSA", headers={"kid": kid or self.kid}
        )


class FakeJwks:
    """Stands in for Better Auth's /api/auth/jwks and counts fetches."""

    def __init__(self, *keys: SigningKey) -> None:
        self.keys = list(keys)
        self.fetches = 0
        self.fail = False

    async def __call__(self) -> dict[str, Any]:
        self.fetches += 1
        if self.fail:
            raise httpx.ConnectError("jwks unreachable")
        return {"keys": [key.jwk for key in self.keys]}


@pytest.fixture
def signing_key() -> SigningKey:
    return SigningKey.generate("key-1")


@pytest.fixture
def jwks(signing_key: SigningKey) -> FakeJwks:
    return FakeJwks(signing_key)


@pytest.fixture
def llm() -> FakeLLM:
    return FakeLLM()


@pytest.fixture
def app(jwks: FakeJwks, llm: FakeLLM):
    application = create_app()
    cache = JWKSCache(jwks, ttl_seconds=3600, refresh_cooldown_seconds=0)
    application.dependency_overrides[get_jwks_cache] = lambda: cache
    application.dependency_overrides[get_llm] = lambda: llm
    return application


@pytest.fixture
def auth(signing_key: SigningKey):
    """``auth("user-a")`` -> Authorization headers for a verified user."""

    def make(user_id: str = "user-a", *, verified: bool = True) -> dict[str, str]:
        token = signing_key.token(sub=user_id, extra={"email_verified": verified})
        return {"Authorization": f"Bearer {token}"}

    return make


@pytest.fixture
async def client(app) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as http_client:
        yield http_client


# ── Real-Postgres tests ─────────────────────────────────────────────────────
# These COMMIT (concurrency and refunds cannot be tested inside a rolled-back
# transaction), TRUNCATE the app tables and replace the workout library with synthetic
# rows. They therefore run only against a disposable local database.

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
requires_db = pytest.mark.skipif(not TEST_DATABASE_URL, reason="TEST_DATABASE_URL not set")


def _assert_disposable(url: str) -> None:
    parsed = urlparse(url)
    if parsed.hostname not in {"localhost", "127.0.0.1", "::1"} or "test" not in (
        parsed.path or ""
    ):
        raise RuntimeError(
            "Refusing to run destructive tests: TEST_DATABASE_URL must point at a local "
            f"database whose name contains 'test' (got host={parsed.hostname!r}, "
            f"path={parsed.path!r})."
        )


class Db:
    """Raw SQL access to the test database, independent of the app's own engine."""

    def __init__(self, engine: AsyncEngine) -> None:
        self.engine = engine

    async def execute(self, sql: str, **params: Any) -> None:
        async with self.engine.begin() as connection:
            await connection.execute(text(sql), params)

    async def rows(self, sql: str, **params: Any) -> list[dict[str, Any]]:
        async with self.engine.connect() as connection:
            result = await connection.execute(text(sql), params)
            return [dict(row._mapping) for row in result]

    async def scalar(self, sql: str, **params: Any) -> Any:
        async with self.engine.connect() as connection:
            return (await connection.execute(text(sql), params)).scalar()


@pytest.fixture
async def db(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[Db]:
    assert TEST_DATABASE_URL
    _assert_disposable(TEST_DATABASE_URL)
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL)
    for cached in (get_settings, get_engine, get_sessionmaker):
        cached.cache_clear()

    url = Settings(database_url=TEST_DATABASE_URL).database_url
    engine = create_async_engine(url, connect_args={"server_settings": {"search_path": DB_SCHEMA}})
    helper = Db(engine)
    await helper.execute(
        "TRUNCATE generation_jobs, workout_logs, fitness_plans, user_profiles, "
        'user_credit_transactions, user_credit_accounts, workout_details, "user" CASCADE'
    )
    for user_id in ("user-a", "user-b"):
        await helper.execute(
            'INSERT INTO "user" (id, name, email, "emailVerified") VALUES (:id, :id, :email, true)',
            id=user_id,
            email=f"{user_id}@example.test",
        )
    for row in LIBRARY:
        await helper.execute(
            "INSERT INTO workout_details (workout_id, workout_name, workout_category, "
            "fitness_goal, training_level, workout_detail) VALUES (:workout_id, :workout_name, "
            "CAST(:workout_category AS workout_category_enum), "
            "CAST(:fitness_goal AS fitness_goal_enum), "
            "CAST(:training_level AS training_level_enum), CAST(:workout_detail AS jsonb))",
            **row,
        )
    yield helper
    await engine.dispose()
    await dispose_engine()
    get_settings.cache_clear()
