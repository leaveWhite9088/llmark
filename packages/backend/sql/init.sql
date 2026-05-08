CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    github_id VARCHAR(64) UNIQUE NOT NULL,
    github_username VARCHAR(128),
    email VARCHAR(256),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_bindings (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    bound_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(device_id)
);

CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    provider VARCHAR(64) NOT NULL,
    model VARCHAR(128) NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    ttft_ms INTEGER NOT NULL,
    total_ms INTEGER NOT NULL,
    tps NUMERIC(10, 2) NOT NULL,
    ip_hash VARCHAR(64),
    input_length_bucket VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_provider_model ON reports(provider, model);
CREATE INDEX IF NOT EXISTS idx_reports_device_id ON reports(device_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_input_length_bucket ON reports(input_length_bucket);


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
);

CREATE INDEX IF NOT EXISTS idx_user_rank_snapshots_date ON user_rank_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_rank_snapshots_user_id ON user_rank_snapshots(user_id);

CREATE TABLE IF NOT EXISTS user_badges (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    badge_id VARCHAR(32) NOT NULL,
    earned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
