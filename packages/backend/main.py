import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import json

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from config import settings
from db.connection import close_db, get_db, init_db
from db.queries import ensure_daily_user_rank_snapshots, refresh_all_user_badges
from limiter import limiter
import log
from routers import auth, catalog, detail, leaderboard, me, meta, model, provider, report

log.setup()
logger = log.get_logger("llmark")


async def _badge_refresh_scheduler():
    while True:
        now = datetime.now(timezone.utc)
        next_run = now.replace(hour=12, minute=0, second=0, microsecond=0)
        if now >= next_run:
            next_run += timedelta(days=1)
        wait_seconds = (next_run - now).total_seconds()
        await asyncio.sleep(wait_seconds)
        try:
            async for db in get_db():
                await refresh_all_user_badges(db)
                break
            logger.info("Scheduled badge refresh completed")
        except Exception:
            logger.exception("Scheduled badge refresh failed")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Initializing database: %s", settings.database_url)
    await init_db()
    logger.info("Database initialized")
    async for db in get_db():
        await ensure_daily_user_rank_snapshots(db)
        await refresh_all_user_badges(db)
        break
    scheduler = asyncio.create_task(_badge_refresh_scheduler())
    try:
        yield
    finally:
        scheduler.cancel()
        try:
            await scheduler
        except asyncio.CancelledError:
            pass
        await close_db()


app = FastAPI(
    title="LLMark API",
    version="0.1.0",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# 全局异常处理器
def _serialize_errors(errors: list[dict]) -> list[dict]:
    """将 Pydantic 错误列表中的不可序列化对象转为字符串。"""
    result = []
    for error in errors:
        e = dict(error)
        if "ctx" in e:
            ctx = {}
            for k, v in e["ctx"].items():
                try:
                    json.dumps(v)
                    ctx[k] = v
                except (TypeError, ValueError):
                    ctx[k] = str(v)
            e["ctx"] = ctx
        if "input" in e:
            try:
                json.dumps(e["input"])
            except (TypeError, ValueError):
                e["input"] = str(e["input"])
        result.append(e)
    return result


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """处理请求参数验证错误"""
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation error",
            "detail": _serialize_errors(exc.errors()),
        },
    )


@app.exception_handler(ValidationError)
async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    """处理 Pydantic 模型验证错误"""
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation error",
            "detail": _serialize_errors(exc.errors()),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """处理所有未捕获的异常"""
    logger.error("Unhandled exception at %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.env == "development" else "Something went wrong",
        },
    )

_default_origins = [
    settings.frontend_url,
    "http://localhost:3011",
    "http://127.0.0.1:3011",
]
_additional_origins = []
if settings.cors_allowed_origins:
    _additional_origins = [
        o.strip() for o in settings.cors_allowed_origins.split(",") if o.strip()
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _additional_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SlowAPIMiddleware)
log.setup_middleware(app)


@app.middleware("http")
async def limit_body_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 10240:
        return JSONResponse({"error": "Request too large"}, status_code=413)
    return await call_next(request)


app.include_router(report.router, prefix="/v1")
app.include_router(leaderboard.router, prefix="/v1")
app.include_router(detail.router, prefix="/v1")
app.include_router(me.router, prefix="/v1")
app.include_router(auth.router, prefix="/v1")
app.include_router(meta.router, prefix="/v1")
app.include_router(provider.router, prefix="/v1")
app.include_router(model.router, prefix="/v1")
app.include_router(catalog.router, prefix="/v1")


@app.get("/healthz")
async def healthz():
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8011)
