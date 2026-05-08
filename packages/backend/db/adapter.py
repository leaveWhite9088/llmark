from typing import Any


class DatabaseAdapter:
    """封装 PostgreSQL 数据库操作。"""

    def __init__(self, db: Any):
        self._db = db

    @property
    def raw(self) -> Any:
        """返回原始数据库连接。"""
        return self._db

    async def fetch(self, sql: str, *params) -> list[dict]:
        """执行查询，返回字典列表。"""
        rows = await self._db.fetch(sql, *params)
        return [dict(row) for row in rows]

    async def fetchrow(self, sql: str, *params) -> dict | None:
        """执行查询，返回单条字典或 None。"""
        row = await self._db.fetchrow(sql, *params)
        return dict(row) if row else None

    async def fetchval(self, sql: str, *params) -> Any:
        """执行查询，返回单个值。"""
        return await self._db.fetchval(sql, *params)

    async def execute(self, sql: str, *params) -> None:
        """执行修改语句，不返回结果。"""
        await self._db.execute(sql, *params)

    async def insert(self, sql: str, *params) -> int:
        """执行插入语句，返回自增 ID。"""
        return await self._db.fetchval(sql, *params)
