from contextlib import asynccontextmanager

import pytest
from httpx import AsyncClient

import app.main as main


class FakeConnection:
    def __init__(self, error: Exception | None) -> None:
        self.error = error
        self.statements: list[str] = []

    async def execute(self, statement) -> None:
        if self.error:
            raise self.error
        self.statements.append(str(statement))


class FakeEngine:
    def __init__(self, error: Exception | None = None) -> None:
        self.connection = FakeConnection(error)

    @asynccontextmanager
    async def connect(self):
        yield self.connection


async def test_health_ok_when_database_answers(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    engine = FakeEngine()
    monkeypatch.setattr(main, "get_engine", lambda: engine)
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
    assert engine.connection.statements == ["SELECT 1"]


async def test_health_503_when_database_is_down(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(main, "get_engine", lambda: FakeEngine(ConnectionRefusedError("down")))
    response = await client.get("/health")
    assert response.status_code == 503
    assert response.json() == {"status": "degraded", "database": "unavailable"}


async def test_health_is_public(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(main, "get_engine", lambda: FakeEngine())
    assert (await client.get("/health")).status_code == 200  # no Authorization header


async def test_cors_allows_configured_origin_only(client: AsyncClient):
    allowed = await client.options(
        "/v1/whoami",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"

    denied = await client.options(
        "/v1/whoami",
        headers={"Origin": "http://evil.test", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in denied.headers
