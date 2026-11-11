"""OpenAI Responses API with structured outputs.

Model, service tier (default: ``default``), reasoning effort and timeout all come from
settings. If the tier is set to ``flex``, a capacity error (HTTP 429 "resource unavailable",
or 503) is retried once on ``OPENAI_FLEX_FALLBACK_TIER`` when that is set; otherwise it
surfaces as ``LLMError``.

Generation code depends on the ``StructuredLLM`` protocol, so tests swap in a fake.
"""

import logging
import time
from functools import lru_cache
from typing import Protocol, TypeVar

import openai
from fastapi import HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

FLEX_TIER = "flex"
# Statuses OpenAI uses when flex has no capacity right now.
FLEX_CAPACITY_STATUSES = frozenset({429, 503})


class LLMError(Exception):
    """The model call failed or returned nothing usable."""


class StructuredLLM(Protocol):
    async def parse(self, *, instructions: str, prompt: str, output_model: type[T]) -> T:
        """Run one call and return the output validated against ``output_model``."""
        ...


def is_flex_capacity_error(exc: Exception, tier: str) -> bool:
    return (
        tier == FLEX_TIER
        and isinstance(exc, openai.APIStatusError)
        and exc.status_code in FLEX_CAPACITY_STATUSES
        and getattr(exc, "code", None) != "insufficient_quota"
    )


class OpenAILLM:
    def __init__(self, settings: Settings, client: AsyncOpenAI | None = None) -> None:
        self._settings = settings
        self._client = client or AsyncOpenAI(
            api_key=settings.openai_api_key, timeout=settings.openai_timeout_seconds
        )

    async def parse(self, *, instructions: str, prompt: str, output_model: type[T]) -> T:
        settings = self._settings
        tier = settings.openai_service_tier
        try:
            return await self._call(tier, instructions, prompt, output_model)
        except openai.OpenAIError as exc:
            fallback = settings.openai_flex_fallback_tier
            if fallback and fallback != tier and is_flex_capacity_error(exc, tier):
                logger.warning("Flex capacity error (%s); retrying once on tier %r", exc, fallback)
                try:
                    return await self._call(fallback, instructions, prompt, output_model)
                except openai.OpenAIError as retry_exc:
                    raise LLMError(f"{type(retry_exc).__name__}: {retry_exc}") from retry_exc
            raise LLMError(f"{type(exc).__name__}: {exc}") from exc

    async def _call(self, tier: str, instructions: str, prompt: str, output_model: type[T]) -> T:
        settings = self._settings
        started = time.monotonic()
        response = await self._client.responses.parse(
            model=settings.openai_model,
            instructions=instructions,
            input=prompt,
            text_format=output_model,
            service_tier=tier,  # type: ignore[arg-type]
            reasoning={"effort": settings.openai_reasoning_effort},  # type: ignore[typeddict-item]
            store=False,  # do not keep user inputs on OpenAI's side
            timeout=settings.openai_timeout_seconds,
        )
        usage = response.usage
        logger.info(
            "llm call model=%s requested_tier=%s served_tier=%s seconds=%.1f "
            "input_tokens=%s output_tokens=%s reasoning_tokens=%s schema=%s",
            response.model,
            tier,
            response.service_tier,
            time.monotonic() - started,
            usage.input_tokens if usage else None,
            usage.output_tokens if usage else None,
            usage.output_tokens_details.reasoning_tokens if usage else None,
            output_model.__name__,
        )
        if response.status == "incomplete":
            reason = response.incomplete_details.reason if response.incomplete_details else None
            raise LLMError(f"model response incomplete: {reason}")
        if response.output_parsed is None:
            raise LLMError("model returned no structured output (refusal or empty)")
        return response.output_parsed


@lru_cache
def get_llm() -> StructuredLLM:
    """FastAPI dependency. 503 when no API key is configured, before any credit is taken."""
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="Plan generation is not configured")
    return OpenAILLM(settings)
