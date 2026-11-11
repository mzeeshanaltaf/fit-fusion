"""Verify Better Auth JWTs against its JWKS.

The Next.js app issues a short-lived token at ``/api/auth/token`` (``jwt`` plugin).
We check signature, issuer, audience and expiry against the public keys published at
``JWKS_URL``. The token subject (``sub``) is the user id, the join key for all data.
"""

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated, Any

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

# Asymmetric algorithms only. Better Auth defaults to EdDSA (Ed25519); HS* is never
# accepted, which closes the "public key used as HMAC secret" confusion attack.
ALLOWED_ALGORITHMS = ["EdDSA", "ES256", "RS256"]

JwksFetcher = Callable[[], Awaitable[dict[str, Any]]]


class AuthError(Exception):
    """The presented token could not be verified."""


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email_verified: bool


class JWKSCache:
    """In-memory JWKS cache keyed by ``kid``.

    Refreshes when the TTL lapses or an unknown ``kid`` shows up (key rotation),
    but never more than once per cooldown, so a flood of garbage tokens cannot turn
    into a flood of requests to the frontend. If a refresh fails, keys already held
    keep working.
    """

    def __init__(
        self,
        fetch: JwksFetcher,
        ttl_seconds: float = 3600,
        refresh_cooldown_seconds: float = 10,
    ) -> None:
        self._fetch = fetch
        self._ttl = ttl_seconds
        self._cooldown = refresh_cooldown_seconds
        self._keys: dict[str, jwt.PyJWK] = {}
        self._fetched_at: float | None = None
        self._last_attempt: float | None = None
        self._lock = asyncio.Lock()

    def _is_stale(self, now: float) -> bool:
        return self._fetched_at is None or now - self._fetched_at >= self._ttl

    def _may_refresh(self, now: float) -> bool:
        return self._last_attempt is None or now - self._last_attempt >= self._cooldown

    async def get_key(self, kid: str) -> jwt.PyJWK:
        now = time.monotonic()
        if kid in self._keys and not self._is_stale(now):
            return self._keys[kid]

        async with self._lock:
            now = time.monotonic()
            # Another request may have refreshed while we waited for the lock.
            if kid in self._keys and not self._is_stale(now):
                return self._keys[kid]
            if self._may_refresh(now):
                await self._refresh(now)
            if kid in self._keys:
                return self._keys[kid]
        raise AuthError(f"unknown signing key: {kid}")

    async def _refresh(self, now: float) -> None:
        self._last_attempt = now
        try:
            document = await self._fetch()
            keys: dict[str, jwt.PyJWK] = {}
            for jwk in document.get("keys", []):
                kid = jwk.get("kid")
                if not kid:
                    continue
                try:
                    keys[kid] = jwt.PyJWK(jwk)
                except jwt.PyJWTError:
                    logger.warning("Skipping unusable JWK kid=%s", kid)
        except Exception:
            logger.exception("JWKS refresh failed; keeping %d cached key(s)", len(self._keys))
            return
        self._keys = keys
        self._fetched_at = now


def make_http_fetcher(url: str) -> JwksFetcher:
    async def fetch() -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()

    return fetch


@lru_cache
def get_jwks_cache() -> JWKSCache:
    settings = get_settings()
    return JWKSCache(
        make_http_fetcher(settings.jwks_url),
        ttl_seconds=settings.jwks_cache_ttl_seconds,
        refresh_cooldown_seconds=settings.jwks_refresh_cooldown_seconds,
    )


async def verify_token(token: str, cache: JWKSCache, settings: Settings) -> CurrentUser:
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise AuthError("token has no kid")
        signing_key = await cache.get_key(kid)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=ALLOWED_ALGORITHMS,
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
            leeway=settings.jwt_leeway_seconds,
            options={"require": ["exp", "iss", "aud", "sub"]},
        )
    except jwt.PyJWTError as exc:
        raise AuthError(f"{type(exc).__name__}: {exc}") from exc

    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject:
        raise AuthError("empty subject")
    return CurrentUser(id=subject, email_verified=claims.get("email_verified") is True)


_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    cache: Annotated[JWKSCache, Depends(get_jwks_cache)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> CurrentUser:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        return await verify_token(credentials.credentials, cache, settings)
    except AuthError as exc:
        # The reason is logged, never returned: callers only learn "not authorised".
        logger.info("JWT rejected: %s", exc)
        raise unauthorized from exc


async def get_current_user_id(user: Annotated[CurrentUser, Depends(get_current_user)]) -> str:
    return user.id


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
