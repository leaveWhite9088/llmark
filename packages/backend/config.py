from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        default="postgresql://llmark:llmark_password@127.0.0.1:5432/llmark",
        alias="DATABASE_URL",
    )
    github_client_id: str = Field(default="", alias="GITHUB_CLIENT_ID")
    github_client_secret: str = Field(default="", alias="GITHUB_CLIENT_SECRET")
    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_expire_days: int = Field(default=30, alias="JWT_EXPIRE_DAYS")
    frontend_url: str = Field(default="http://localhost:3011", alias="FRONTEND_URL")
    session_cookie_name: str = Field(default="llmark_session", alias="SESSION_COOKIE_NAME")
    session_cookie_secure: bool = Field(default=False, alias="SESSION_COOKIE_SECURE")
    session_cookie_samesite: str = Field(default="lax", alias="SESSION_COOKIE_SAMESITE")
    cors_allowed_origins: str = Field(default="", alias="CORS_ALLOWED_ORIGINS")
    env: str = Field(default="development", alias="ENV")
    redis_url: str = Field(default="redis://127.0.0.1:6380/0", alias="REDIS_URL")
    cache_ttl_seconds: int = Field(default=300, alias="CACHE_TTL_SECONDS")  # 5 分钟


settings = Settings()
