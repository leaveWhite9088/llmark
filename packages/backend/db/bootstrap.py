async def bootstrap_postgres(conn) -> None:
    # 核心表（幂等创建）
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            github_id TEXT UNIQUE NOT NULL,
            github_username TEXT,
            github_avatar_url TEXT,
            email TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS device_bindings (
            id SERIAL PRIMARY KEY,
            device_id TEXT NOT NULL UNIQUE,
            user_id INTEGER REFERENCES users(id),
            bound_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    await conn.execute(
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
        """
    )
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_reports_provider_model ON reports(provider, model)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_reports_device_id ON reports(device_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)")

    # 迁移
    await conn.execute(
        """
        ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS input_length_bucket VARCHAR(16)
        """
    )
    await conn.execute(
        """
        UPDATE reports
        SET input_length_bucket = CASE
            WHEN prompt_tokens <= 4096 THEN 'short'
            WHEN prompt_tokens <= 16384 THEN 'medium'
            ELSE 'long'
        END
        WHERE input_length_bucket IS NULL
           OR input_length_bucket = ''
           OR input_length_bucket NOT IN ('short', 'medium', 'long')
        """
    )
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_reports_input_length_bucket ON reports(input_length_bucket)")
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_rank_snapshots (
            id BIGSERIAL PRIMARY KEY,
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
        """
    )
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_user_rank_snapshots_date ON user_rank_snapshots(snapshot_date DESC)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_user_rank_snapshots_user_id ON user_rank_snapshots(user_id)")

    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_badges (
            id BIGSERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            badge_id VARCHAR(32) NOT NULL,
            earned_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(user_id, badge_id)
        )
        """
    )
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id)")

    await conn.execute(
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
        """
    )

    await conn.execute(
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
        """
    )

    # 迁移：users 表添加 github_avatar_url 字段
    await conn.execute(
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS github_avatar_url TEXT
        """
    )
