import os

# Must run before `app` is imported: Settings is built from the environment on first use.
os.environ["DATABASE_URL"] = "postgresql://test:test@127.0.0.1:1/test"
os.environ["JWKS_URL"] = "http://jwks.test/api/auth/jwks"
os.environ["JWT_ISSUER"] = "http://issuer.test"
os.environ["JWT_AUDIENCE"] = "http://audience.test"
os.environ["CORS_ORIGINS"] = "http://localhost:3000"

import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from jwt.algorithms import OKPAlgorithm

from app.auth import JWKSCache, get_jwks_cache
from app.main import create_app

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
def app(jwks: FakeJwks):
    application = create_app()
    cache = JWKSCache(jwks, ttl_seconds=3600, refresh_cooldown_seconds=0)
    application.dependency_overrides[get_jwks_cache] = lambda: cache
    return application


@pytest.fixture
async def client(app) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as http_client:
        yield http_client
