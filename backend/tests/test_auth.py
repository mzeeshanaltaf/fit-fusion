import jwt
import pytest
from httpx import AsyncClient

from app.auth import AuthError, JWKSCache, verify_token
from app.config import get_settings
from tests.conftest import AUDIENCE, ISSUER, FakeJwks, SigningKey

PROTECTED = "/v1/whoami"


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_valid_token_is_accepted(client: AsyncClient, signing_key: SigningKey):
    token = signing_key.token(sub="user-abc", extra={"email_verified": True})
    response = await client.get(PROTECTED, headers=bearer(token))
    assert response.status_code == 200
    assert response.json() == {"user_id": "user-abc", "email_verified": True}


async def test_email_verified_defaults_to_false(client: AsyncClient, signing_key: SigningKey):
    response = await client.get(PROTECTED, headers=bearer(signing_key.token()))
    assert response.status_code == 200
    assert response.json()["email_verified"] is False


async def test_missing_token_is_rejected(client: AsyncClient):
    response = await client.get(PROTECTED)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


async def test_garbage_token_is_rejected(client: AsyncClient):
    response = await client.get(PROTECTED, headers=bearer("not-a-jwt"))
    assert response.status_code == 401


async def test_expired_token_is_rejected(client: AsyncClient, signing_key: SigningKey):
    # Past the 10s leeway as well.
    response = await client.get(PROTECTED, headers=bearer(signing_key.token(exp_in=-60)))
    assert response.status_code == 401


async def test_wrong_issuer_is_rejected(client: AsyncClient, signing_key: SigningKey):
    token = signing_key.token(iss="http://evil.test")
    assert (await client.get(PROTECTED, headers=bearer(token))).status_code == 401


async def test_wrong_audience_is_rejected(client: AsyncClient, signing_key: SigningKey):
    token = signing_key.token(aud="http://someone-else.test")
    assert (await client.get(PROTECTED, headers=bearer(token))).status_code == 401


async def test_bad_signature_is_rejected(client: AsyncClient, signing_key: SigningKey):
    # Signed by a different key, but claiming the known kid.
    forger = SigningKey.generate(signing_key.kid)
    response = await client.get(PROTECTED, headers=bearer(forger.token()))
    assert response.status_code == 401


async def test_unknown_kid_is_rejected(
    client: AsyncClient, signing_key: SigningKey, jwks: FakeJwks
):
    stranger = SigningKey.generate("not-published")
    response = await client.get(PROTECTED, headers=bearer(stranger.token()))
    assert response.status_code == 401
    assert jwks.fetches >= 1  # it did look for the key before giving up


async def test_token_without_kid_is_rejected(client: AsyncClient, signing_key: SigningKey):
    token = jwt.encode(
        {"sub": "u", "iss": ISSUER, "aud": AUDIENCE, "exp": 4102444800},
        signing_key.private_key,
        algorithm="EdDSA",
    )
    assert (await client.get(PROTECTED, headers=bearer(token))).status_code == 401


async def test_token_without_subject_is_rejected(client: AsyncClient, signing_key: SigningKey):
    assert (
        await client.get(PROTECTED, headers=bearer(signing_key.token(sub=None)))
    ).status_code == 401


async def test_unsigned_token_is_rejected(client: AsyncClient, signing_key: SigningKey):
    token = jwt.encode(
        {"sub": "u", "iss": ISSUER, "aud": AUDIENCE, "exp": 4102444800},
        key=None,
        algorithm="none",
        headers={"kid": signing_key.kid},
    )
    assert (await client.get(PROTECTED, headers=bearer(token))).status_code == 401


async def test_hmac_token_signed_with_public_key_is_rejected(
    client: AsyncClient, signing_key: SigningKey
):
    # Classic algorithm-confusion attempt: HS256 using public key material as the secret.
    token = jwt.encode(
        {"sub": "u", "iss": ISSUER, "aud": AUDIENCE, "exp": 4102444800},
        key=signing_key.jwk["x"],
        algorithm="HS256",
        headers={"kid": signing_key.kid},
    )
    assert (await client.get(PROTECTED, headers=bearer(token))).status_code == 401


async def test_rejection_does_not_leak_the_reason(client: AsyncClient, signing_key: SigningKey):
    response = await client.get(PROTECTED, headers=bearer(signing_key.token(exp_in=-60)))
    assert response.json() == {"detail": "Invalid or missing credentials"}


# ── JWKS cache behaviour ────────────────────────────────────────────────────────


async def test_cache_fetches_once_for_repeated_known_kid(signing_key: SigningKey):
    jwks = FakeJwks(signing_key)
    cache = JWKSCache(jwks, ttl_seconds=3600, refresh_cooldown_seconds=0)
    for _ in range(3):
        await cache.get_key(signing_key.kid)
    assert jwks.fetches == 1


async def test_cache_refreshes_on_unknown_kid_to_pick_up_rotation(signing_key: SigningKey):
    jwks = FakeJwks(signing_key)
    cache = JWKSCache(jwks, ttl_seconds=3600, refresh_cooldown_seconds=0)
    await cache.get_key(signing_key.kid)

    rotated = SigningKey.generate("key-2")
    jwks.keys.append(rotated)
    assert await cache.get_key("key-2") is not None
    assert jwks.fetches == 2


async def test_cache_cooldown_stops_unknown_kid_flood(signing_key: SigningKey):
    jwks = FakeJwks(signing_key)
    cache = JWKSCache(jwks, ttl_seconds=3600, refresh_cooldown_seconds=60)
    for _ in range(5):
        with pytest.raises(AuthError):
            await cache.get_key("garbage")
    assert jwks.fetches == 1


async def test_cache_keeps_serving_known_keys_when_refresh_fails(signing_key: SigningKey):
    jwks = FakeJwks(signing_key)
    cache = JWKSCache(jwks, ttl_seconds=0, refresh_cooldown_seconds=0)  # always stale
    await cache.get_key(signing_key.kid)
    jwks.fail = True
    assert await cache.get_key(signing_key.kid) is not None


async def test_cache_fails_closed_when_jwks_is_unreachable_from_the_start(
    signing_key: SigningKey,
):
    jwks = FakeJwks(signing_key)
    jwks.fail = True
    cache = JWKSCache(jwks, ttl_seconds=3600, refresh_cooldown_seconds=0)
    with pytest.raises(AuthError):
        await cache.get_key(signing_key.kid)


async def test_verify_token_returns_user(signing_key: SigningKey):
    cache = JWKSCache(FakeJwks(signing_key), refresh_cooldown_seconds=0)
    user = await verify_token(
        signing_key.token(sub="u-1", extra={"email_verified": True}), cache, get_settings()
    )
    assert (user.id, user.email_verified) == ("u-1", True)
