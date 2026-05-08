import hashlib
import json
import logging
from typing import Any

import redis.asyncio as redis

from config import settings

logger = logging.getLogger("llmark.cache")

_redis: redis.Redis | None = None


async def init_cache() -> None:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url, decode_responses=True)
        await _redis.ping()
        logger.info("Redis connected: %s", settings.redis_url)


async def close_cache() -> None:
    global _redis
    if _redis is not None:
        await _redis.close()
        _redis = None


def _make_key(prefix: str, **kwargs: Any) -> str:
    raw = json.dumps(kwargs, sort_keys=True, default=str)
    h = hashlib.md5(raw.encode()).hexdigest()[:12]
    return f"llmark:{prefix}:{h}"


async def cache_get(prefix: str, **kwargs: Any) -> Any | None:
    if _redis is None:
        return None
    key = _make_key(prefix, **kwargs)
    raw = await _redis.get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None


async def cache_set(prefix: str, value: Any, ttl: int | None = None, **kwargs: Any) -> None:
    if _redis is None:
        return
    key = _make_key(prefix, **kwargs)
    ttl = ttl or settings.cache_ttl_seconds
    await _redis.set(key, json.dumps(value, default=str), ex=ttl)


async def cache_delete_pattern(pattern: str) -> None:
    if _redis is None:
        return
    async for key in _redis.scan_iter(match=f"llmark:{pattern}:*"):
        await _redis.delete(key)


__all__ = ["cache_delete_pattern", "cache_get", "cache_set", "close_cache", "init_cache"]
