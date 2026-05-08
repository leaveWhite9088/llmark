from pydantic import BaseModel, Field, field_validator

from schemas.base import SAFE_TEXT_PATTERN, UUID_PATTERN


class ReportRequest(BaseModel):
    device_id: str = Field(..., min_length=36, max_length=36)
    token: str | None = None
    provider: str = Field(..., min_length=1, max_length=64)
    model: str = Field(..., min_length=1, max_length=128)
    prompt_tokens: int = Field(..., ge=0, le=1_000_000)
    completion_tokens: int = Field(..., ge=1, le=1_000_000)
    ttft_ms: int = Field(..., ge=0, le=300_000)
    total_ms: int = Field(..., ge=1, le=300_000)
    sdk_version: str = Field(..., min_length=1, max_length=32)

    @field_validator("device_id")
    @classmethod
    def validate_device_id(cls, value: str) -> str:
        if not UUID_PATTERN.match(value):
            raise ValueError("device_id must be a valid UUID")
        return value

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, value: str) -> str:
        lower_value = value.lower()
        if not SAFE_TEXT_PATTERN.match(lower_value):
            raise ValueError("Invalid provider")
        return lower_value

    @field_validator("model")
    @classmethod
    def validate_model(cls, value: str) -> str:
        if not SAFE_TEXT_PATTERN.match(value):
            raise ValueError("Invalid model")
        return value
