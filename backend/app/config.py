"""All runtime configuration, read from the environment (or ``backend/.env``)."""

from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

DB_SCHEMA = "fit_fusion"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Database ────────────────────────────────────────────────────────────
    # Accepts postgres:// or postgresql:// (as used by the Next.js app); the
    # asyncpg driver is selected automatically. Tables live in `fit_fusion`.
    database_url: str

    # ── Auth (Better Auth `jwt` plugin) ─────────────────────────────────────
    # JWKS_URL: Better Auth's /api/auth/jwks. JWT_ISSUER / JWT_AUDIENCE must equal
    # BETTER_AUTH_URL of the Next.js app (the plugin's issuer/audience, see auth.ts).
    jwks_url: str = "http://localhost:3000/api/auth/jwks"
    jwt_issuer: str = "http://localhost:3000"
    jwt_audience: str = "http://localhost:3000"
    jwt_leeway_seconds: int = 10
    jwks_cache_ttl_seconds: int = 3600
    # Minimum gap between JWKS refetches triggered by an unknown `kid`.
    jwks_refresh_cooldown_seconds: int = 10

    # ── App ─────────────────────────────────────────────────────────────────
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:3000",
        "https://fitfusion.zeeshanai.cloud",
    ]
    # Protects /v1/admin/*. An empty value disables those routes.
    admin_api_key: str = ""
    signup_credits: int = 10

    # ── AI (OpenAI Responses API) ───────────────────────────────────────────
    openai_api_key: str = ""
    openai_model: str = "gpt-6-luna"
    openai_service_tier: str = "flex"
    openai_reasoning_effort: str = "low"
    openai_timeout_seconds: int = 900
    # Tier to retry on when flex has no capacity (e.g. "auto"). Empty = no retry.
    openai_flex_fallback_tier: str = ""

    @field_validator("database_url")
    @classmethod
    def _use_asyncpg_driver(cls, value: str) -> str:
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                value = "postgresql+asyncpg://" + value[len(prefix) :]
                break
        # asyncpg has no `sslmode`; it calls the same libpq option `ssl`.
        return value.replace("sslmode=", "ssl=")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # values come from the environment
