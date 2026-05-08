"""
测试基础设施配置。

提供 session-scoped 的测试数据库和 TestClient，所有测试共享同一份数据，
确保聚合查询（排行榜、目录等）有足量数据支撑。
"""

import asyncio
import os
from datetime import datetime, timedelta, timezone

import asyncpg
import pytest

# 必须在导入 main 之前覆盖数据库配置
from config import settings

settings.database_url = os.environ.get(
    "DATABASE_URL",
    "postgresql://llmark:llmark_password@127.0.0.1:5432/llmark_test",
)

from fastapi.testclient import TestClient
from main import app
from utils.jwt import create_token


TEST_DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://llmark:llmark_password@127.0.0.1:5432/llmark_test",
)


async def _init_test_db():
    """初始化测试数据库：创建表结构、插入测试数据。"""
    conn = await asyncpg.connect(TEST_DB_URL)
    try:
        # 创建表结构（幂等）
        from db.bootstrap import bootstrap_postgres
        await bootstrap_postgres(conn)

        # 清空现有数据
        tables = [
            "user_badges", "user_rank_snapshots", "reports",
            "device_bindings", "users", "model_meta", "provider_info",
        ]
        for table in tables:
            try:
                await conn.execute(f"TRUNCATE TABLE {table} CASCADE")
            except asyncpg.exceptions.UndefinedTableError:
                pass

        # 插入测试用户
        user_rows = await conn.fetch(
            """
            INSERT INTO users (github_id, github_username, email)
            VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9)
            RETURNING id, github_username
            """,
            "gh_1", "alice", "alice@example.com",
            "gh_2", "bob", "bob@example.com",
            "gh_3", "charlie", "charlie@example.com",
        )
        user_ids = {row["github_username"]: row["id"] for row in user_rows}

        # 插入设备绑定
        devices = [
            ("dev_alice", user_ids["alice"]),
            ("dev_bob", user_ids["bob"]),
            ("dev_charlie", user_ids["charlie"]),
            ("dev_anon", None),
        ]
        for dev_id, uid in devices:
            await conn.execute(
                "INSERT INTO device_bindings (device_id, user_id) VALUES ($1, $2)",
                dev_id, uid,
            )

        # 插入测试报告
        base_time = datetime.now(timezone.utc)
        reports = [
            ("dev_alice", user_ids["alice"], "openai", "gpt-4", 800, 400, 120, 600, 66.67, "ip1", "short", 0),
            ("dev_alice", user_ids["alice"], "openai", "gpt-4", 900, 500, 130, 700, 71.43, "ip2", "short", 1),
            ("dev_alice", user_ids["alice"], "openai", "gpt-4o", 1000, 600, 100, 500, 120.0, "ip3", "short", 2),
            ("dev_alice", user_ids["alice"], "anthropic", "claude-3", 5000, 2000, 200, 1000, 100.0, "ip4", "medium", 3),
            ("dev_alice", user_ids["alice"], "anthropic", "claude-3", 6000, 2500, 220, 1100, 113.64, "ip5", "medium", 5),
            ("dev_alice", user_ids["alice"], "deepseek", "deepseek-chat", 20000, 8000, 300, 2000, 200.0, "ip6", "long", 6),
            ("dev_alice", user_ids["alice"], "deepseek", "deepseek-chat", 22000, 9000, 320, 2100, 214.29, "ip7", "long", 8),
            ("dev_alice", user_ids["alice"], "google", "gemini-pro", 1500, 700, 150, 800, 87.5, "ip8", "short", 10),
            ("dev_alice", user_ids["alice"], "openai", "gpt-4", 1100, 550, 110, 550, 100.0, "ip9", "short", 12),
            ("dev_alice", user_ids["alice"], "anthropic", "claude-3", 7000, 3000, 250, 1200, 125.0, "ip10", "medium", 14),
            ("dev_bob", user_ids["bob"], "openai", "gpt-4", 800, 400, 115, 620, 64.52, "ip11", "short", 2),
            ("dev_bob", user_ids["bob"], "openai", "gpt-4o", 1200, 700, 105, 520, 134.62, "ip12", "short", 4),
            ("dev_bob", user_ids["bob"], "deepseek", "deepseek-chat", 18000, 7500, 280, 1900, 197.37, "ip13", "long", 6),
            ("dev_bob", user_ids["bob"], "google", "gemini-pro", 2000, 900, 160, 850, 105.88, "ip14", "short", 8),
            ("dev_bob", user_ids["bob"], "anthropic", "claude-3", 5500, 2200, 210, 1050, 104.76, "ip15", "medium", 10),
            ("dev_bob", user_ids["bob"], "openai", "gpt-4", 950, 480, 125, 650, 73.85, "ip16", "short", 20),
            ("dev_bob", user_ids["bob"], "openai", "gpt-4", 850, 420, 118, 600, 70.0, "ip17", "short", 48),
            ("dev_charlie", user_ids["charlie"], "openai", "gpt-4o", 1300, 750, 108, 510, 147.06, "ip18", "short", 3),
            ("dev_charlie", user_ids["charlie"], "deepseek", "deepseek-chat", 25000, 10000, 350, 2200, 227.27, "ip19", "long", 7),
            ("dev_charlie", user_ids["charlie"], "anthropic", "claude-3", 4500, 1800, 190, 950, 94.74, "ip20", "medium", 15),
            ("dev_charlie", user_ids["charlie"], "google", "gemini-pro", 1800, 850, 155, 820, 103.66, "ip21", "short", 24),
            ("dev_charlie", user_ids["charlie"], "openai", "gpt-4", 1000, 500, 122, 580, 86.21, "ip22", "short", 72),
            ("dev_charlie", user_ids["charlie"], "openai", "gpt-4o", 1100, 600, 102, 480, 125.0, "ip23", "short", 168),
            ("dev_anon", None, "openai", "gpt-4", 900, 450, 120, 600, 75.0, "ip24", "short", 1),
            ("dev_anon", None, "anthropic", "claude-3", 4000, 1600, 180, 900, 88.89, "ip25", "medium", 2),
        ]

        for report in reports:
            device_id, user_id, provider, model, pt, ct, ttft, total, tps, ip_hash, bucket, age_hours = report
            created_at = base_time - timedelta(hours=age_hours)
            await conn.execute(
                """
                INSERT INTO reports (
                    device_id, user_id, provider, model, prompt_tokens,
                    completion_tokens, ttft_ms, total_ms, tps, ip_hash,
                    input_length_bucket, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                """,
                device_id, user_id, provider, model, pt, ct, ttft, total, tps, ip_hash, bucket, created_at,
            )

        return user_ids
    finally:
        await conn.close()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def client():
    """
    Session-scoped TestClient。

    1. 初始化测试数据库（PostgreSQL）
    2. 插入测试数据
    3. 启动 TestClient（触发 lifespan）
    """
    user_ids = asyncio.run(_init_test_db())

    with TestClient(app) as c:
        c._test_user_ids = user_ids
        yield c


@pytest.fixture
def auth_cookie(client):
    """生成 alice 用户的认证 Cookie。"""
    alice_id = client._test_user_ids["alice"]
    token = create_token(alice_id)
    return {settings.session_cookie_name: token}


@pytest.fixture
def bob_cookie(client):
    """生成 bob 用户的认证 Cookie。"""
    bob_id = client._test_user_ids["bob"]
    token = create_token(bob_id)
    return {settings.session_cookie_name: token}


@pytest.fixture(autouse=True)
def reset_device_rate_limiter():
    """
    每个测试函数运行前重置设备限流器内存，
    防止因 60 秒窗口内的请求累积导致测试被限流。
    """
    from utils.anti_abuse import _device_windows

    _device_windows.clear()
    yield
    _device_windows.clear()
