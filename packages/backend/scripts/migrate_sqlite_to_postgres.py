"""迁移 SQLite 数据到 PostgreSQL（使用 pg8000）。"""

import sqlite3

import pg8000

SQLITE_PATH = "data/llmark-dev.db"


def _ensure_tables(conn):
    """创建 PostgreSQL 表结构（如果不存在）。"""
    ddl_statements = [
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            github_id TEXT UNIQUE NOT NULL,
            github_username TEXT,
            github_avatar_url TEXT,
            email TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS device_bindings (
            id SERIAL PRIMARY KEY,
            device_id TEXT NOT NULL UNIQUE,
            user_id INTEGER REFERENCES users(id),
            bound_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS reports (
            id SERIAL PRIMARY KEY,
            device_id TEXT NOT NULL,
            user_id INTEGER REFERENCES users(id),
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt_tokens INTEGER NOT NULL,
            completion_tokens INTEGER NOT NULL,
            ttft_ms INTEGER NOT NULL,
            total_ms INTEGER NOT NULL,
            tps REAL NOT NULL,
            ip_hash TEXT,
            input_length_bucket TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS user_rank_snapshots (
            id SERIAL PRIMARY KEY,
            snapshot_date DATE NOT NULL,
            user_id INTEGER NOT NULL REFERENCES users(id),
            rank INTEGER NOT NULL,
            total_contributions INTEGER NOT NULL,
            models_tested INTEGER NOT NULL,
            avg_tps NUMERIC(10, 2) NOT NULL,
            avg_ttft_ms INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(snapshot_date, user_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS user_badges (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            badge_id VARCHAR(32) NOT NULL,
            earned_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(user_id, badge_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS model_meta (
            model VARCHAR(64) PRIMARY KEY,
            display_name VARCHAR(128),
            tags JSONB,
            context_window INTEGER,
            release_date VARCHAR(16),
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS provider_info (
            provider VARCHAR(64) PRIMARY KEY,
            display_name VARCHAR(128),
            description TEXT,
            policies JSONB,
            logo_url VARCHAR(512),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
    ]
    for sql in ddl_statements:
        conn.cursor().execute(sql)

    # 创建索引
    index_statements = [
        "CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_reports_provider_model ON reports(provider, model)",
        "CREATE INDEX IF NOT EXISTS idx_reports_device_id ON reports(device_id)",
        "CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_reports_input_length_bucket ON reports(input_length_bucket)",
        "CREATE INDEX IF NOT EXISTS idx_user_rank_snapshots_date ON user_rank_snapshots(snapshot_date DESC)",
        "CREATE INDEX IF NOT EXISTS idx_user_rank_snapshots_user_id ON user_rank_snapshots(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id)",
    ]
    for sql in index_statements:
        conn.cursor().execute(sql)

    conn.commit()


def _copy_table(sqlite_conn, pg_conn, table_name, columns, id_column="id"):
    """复制数据并保留原始 ID。"""
    cursor = sqlite_conn.cursor()
    cursor.execute(f"SELECT {', '.join(columns)} FROM {table_name}")
    rows = cursor.fetchall()

    if not rows:
        print(f"  {table_name}: 0 rows")
        return

    placeholders = ", ".join(["%s"] * len(columns))
    sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"

    pg_cursor = pg_conn.cursor()
    count = 0
    for row in rows:
        try:
            pg_cursor.execute(sql, row)
            count += 1
        except Exception as exc:
            print(f"  跳过 {table_name} 行: {exc}")

    pg_conn.commit()
    print(f"  {table_name}: {count}/{len(rows)} rows migrated")


def migrate():
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row

    pg_conn = pg8000.connect(
        host="127.0.0.1",
        port=5432,
        database="llmark",
        user="llmark",
        password="llmark_password",
    )

    try:
        print("创建 PostgreSQL 表结构...")
        _ensure_tables(pg_conn)

        print("\n迁移数据...")

        # users
        _copy_table(
            sqlite_conn, pg_conn, "users",
            ["id", "github_id", "github_username", "github_avatar_url", "email", "created_at"],
        )

        # device_bindings
        _copy_table(
            sqlite_conn, pg_conn, "device_bindings",
            ["id", "device_id", "user_id", "bound_at"],
        )

        # reports
        _copy_table(
            sqlite_conn, pg_conn, "reports",
            ["id", "device_id", "user_id", "provider", "model", "prompt_tokens",
             "completion_tokens", "ttft_ms", "total_ms", "tps", "ip_hash",
             "input_length_bucket", "created_at"],
        )

        # user_rank_snapshots
        _copy_table(
            sqlite_conn, pg_conn, "user_rank_snapshots",
            ["id", "snapshot_date", "user_id", "rank", "total_contributions",
             "models_tested", "avg_tps", "avg_ttft_ms", "created_at"],
        )

        # user_badges
        _copy_table(
            sqlite_conn, pg_conn, "user_badges",
            ["id", "user_id", "badge_id", "earned_at", "created_at", "updated_at"],
        )

        # model_meta
        _copy_table(
            sqlite_conn, pg_conn, "model_meta",
            ["model", "display_name", "tags", "context_window", "release_date",
             "description", "created_at", "updated_at"],
        )

        # provider_info
        _copy_table(
            sqlite_conn, pg_conn, "provider_info",
            ["provider", "display_name", "description", "policies", "logo_url",
             "created_at", "updated_at"],
        )

        # 重置序列
        pg_cursor = pg_conn.cursor()
        for table in ["users", "device_bindings", "reports", "user_rank_snapshots", "user_badges"]:
            pg_cursor.execute(f"SELECT COALESCE(MAX(id), 0) FROM {table}")
            max_id = pg_cursor.fetchone()[0]
            pg_cursor.execute(f"SELECT setval('{table}_id_seq', %s, true)", (max_id,))
            print(f"  重置 {table}_id_seq = {max_id}")
        pg_conn.commit()

        print("\n迁移完成！")

    finally:
        sqlite_conn.close()
        pg_conn.close()


if __name__ == "__main__":
    migrate()
