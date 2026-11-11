import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings
from app.db import dispose_engine, get_engine
from app.routers import whoami

logger = logging.getLogger(__name__)

HEALTH_DB_TIMEOUT_SECONDS = 3.0


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    await dispose_engine()


async def health(_: Request) -> JSONResponse:
    """Liveness + DB connectivity. 503 when the database cannot be reached."""
    try:
        async with asyncio.timeout(HEALTH_DB_TIMEOUT_SECONDS):
            async with get_engine().connect() as connection:
                await connection.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Health check: database unreachable")
        return JSONResponse({"status": "degraded", "database": "unavailable"}, status_code=503)
    return JSONResponse({"status": "ok", "database": "ok"})


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse({"detail": "Internal server error"}, status_code=500)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="FitFusion API", version="0.1.0", lifespan=lifespan)

    # Bearer-token API (no cookies), so credentials stay off.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        allow_credentials=False,
        max_age=600,
    )
    app.add_exception_handler(Exception, unhandled_exception_handler)

    app.add_api_route("/health", health, methods=["GET"], tags=["health"])
    app.include_router(whoami.router, prefix="/v1")
    return app
