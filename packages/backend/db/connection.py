from collections.abc import AsyncGenerator

import asyncpg

from config import settings
from db.bootstrap import bootstrap_postgres
from db.cache import close_cache, init_cache


pool: asyncpg.Pool | None = None


async def init_db() -> None:
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=1,
            max_size=10,
        )
        async with pool.acquire() as conn:
            await bootstrap_postgres(conn)
    await init_cache()


async def close_db() -> None:
    global pool
    if pool is not None:
        await pool.close()
        pool = None
    await close_cache()


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    if pool is None:
        raise RuntimeError("Database pool is not initialized")

    async with pool.acquire() as conn:
        yield conn
