from types import SimpleNamespace

import httpx
import openai
import pytest

from app.config import Settings
from app.schemas.ai import WorkoutSelection
from app.services.llm import LLMError, OpenAILLM, is_flex_capacity_error


def settings(**overrides) -> Settings:
    return Settings(
        database_url="postgresql://x:y@localhost/z",
        openai_api_key="sk-test",
        openai_model="gpt-6-luna",
        openai_reasoning_effort="low",
        openai_timeout_seconds=123,
        **overrides,
    )


def test_standard_tier_is_the_default():
    assert Settings(database_url="postgresql://x:y@localhost/z").openai_service_tier == "default"


def api_error(status: int, cls=openai.APIStatusError, body=None) -> openai.APIStatusError:
    request = httpx.Request("POST", "https://api.openai.test/v1/responses")
    response = httpx.Response(status, request=request)
    return cls("boom", response=response, body=body)


def parsed(output=None, status="completed"):
    return SimpleNamespace(
        model="gpt-6-luna",
        service_tier="flex",
        usage=None,
        status=status,
        incomplete_details=SimpleNamespace(reason="max_output_tokens"),
        output_parsed=output,
    )


class FakeResponses:
    def __init__(self, *results) -> None:
        self.results = list(results)
        self.calls: list[dict] = []

    async def parse(self, **kwargs):
        self.calls.append(kwargs)
        result = self.results.pop(0)
        if isinstance(result, Exception):
            raise result
        return result


def llm_with(responses: FakeResponses, **overrides) -> OpenAILLM:
    client = SimpleNamespace(responses=responses)
    return OpenAILLM(settings(**overrides), client=client)  # type: ignore[arg-type]


PICK = WorkoutSelection(workout_ids=["a"])


async def run(llm: OpenAILLM):
    return await llm.parse(instructions="i", prompt="p", output_model=WorkoutSelection)


async def test_sends_the_configured_model_tier_effort_and_timeout():
    responses = FakeResponses(parsed(PICK))
    assert await run(llm_with(responses)) == PICK
    (call,) = responses.calls
    assert call["model"] == "gpt-6-luna"
    assert call["service_tier"] == "default"
    assert call["reasoning"] == {"effort": "low"}
    assert call["timeout"] == 123
    assert call["text_format"] is WorkoutSelection
    assert call["store"] is False


async def test_flex_capacity_error_retries_once_on_the_fallback_tier():
    responses = FakeResponses(api_error(429, openai.RateLimitError), parsed(PICK))
    llm = llm_with(responses, openai_service_tier="flex", openai_flex_fallback_tier="auto")
    assert await run(llm) == PICK
    assert [c["service_tier"] for c in responses.calls] == ["flex", "auto"]


async def test_no_fallback_configured_means_the_error_surfaces():
    responses = FakeResponses(api_error(429, openai.RateLimitError))
    with pytest.raises(LLMError):
        await run(llm_with(responses, openai_service_tier="flex"))
    assert len(responses.calls) == 1


async def test_fallback_is_tried_only_once():
    responses = FakeResponses(
        api_error(429, openai.RateLimitError), api_error(429, openai.RateLimitError)
    )
    with pytest.raises(LLMError):
        await run(llm_with(responses, openai_service_tier="flex", openai_flex_fallback_tier="auto"))
    assert len(responses.calls) == 2


async def test_other_errors_are_not_retried_on_the_fallback():
    responses = FakeResponses(api_error(400, openai.BadRequestError))
    with pytest.raises(LLMError):
        await run(llm_with(responses, openai_service_tier="flex", openai_flex_fallback_tier="auto"))
    assert len(responses.calls) == 1


async def test_quota_exhaustion_is_not_a_flex_capacity_error():
    error = api_error(429, openai.RateLimitError, body={"code": "insufficient_quota"})
    assert error.code == "insufficient_quota"
    assert not is_flex_capacity_error(error, "flex")
    assert is_flex_capacity_error(api_error(429, openai.RateLimitError), "flex")
    assert not is_flex_capacity_error(api_error(429, openai.RateLimitError), "auto")


async def test_empty_or_refused_output_is_an_error():
    with pytest.raises(LLMError, match="no structured output"):
        await run(llm_with(FakeResponses(parsed(None))))


async def test_incomplete_response_is_an_error():
    with pytest.raises(LLMError, match="incomplete"):
        await run(llm_with(FakeResponses(parsed(PICK, status="incomplete"))))
