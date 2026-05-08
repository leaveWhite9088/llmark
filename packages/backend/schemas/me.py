from typing import Any

from pydantic import BaseModel


class MeUser(BaseModel):
    id: int
    github_id: str | None = None
    github_username: str | None = None
    email: str | None = None
    created_at: str | None = None
    github_avatar_url: str | None = None


class MeSummary(BaseModel):
    total_contributions: int
    rank: int
    total_ranked_users: int
    tested_models_count: int
    tested_providers_count: int
    contributions_last_7d: int
    streak_days: int
    users_behind_percentage: float
    distance_to_next_rank: int
    contribution_level: str


class MeOverviewResponse(BaseModel):
    user: MeUser
    summary: MeSummary


class HeatmapItem(BaseModel):
    date: str
    count: int


class BestDay(BaseModel):
    date: str
    count: int


class HeatmapSummary(BaseModel):
    streak_days: int
    best_day: BestDay | None = None
    total_active_days: int


class MeHeatmapResponse(BaseModel):
    range: str
    range_start: str | None = None
    range_end: str
    items: list[HeatmapItem]
    summary: HeatmapSummary


class ProfileModelEntry(BaseModel):
    provider: str
    provider_name: str
    model: str
    input_length_bucket: str | None = None
    my_sample_count: int
    my_avg_tps: float
    my_avg_ttft_ms: int
    global_avg_tps: float
    global_avg_ttft_ms: int
    delta_tps: float
    delta_ttft_ms: int
    last_contributed_at: str


class ProfileProviderDistribution(BaseModel):
    key: str
    provider: str
    provider_name: str
    sample_count: int
    percentage: float


class ProfileInputLengthDistribution(BaseModel):
    key: str
    input_length_bucket: str
    sample_count: int
    percentage: float


class ProfileHighlightEntry(BaseModel):
    provider: str
    provider_name: str
    model: str
    input_length_bucket: str | None = None
    sample_count: int
    avg_tps: float
    avg_ttft_ms: int


class ProfileHighlights(BaseModel):
    most_contributed_entry: ProfileHighlightEntry | None = None
    fastest_entry: ProfileHighlightEntry | None = None
    lowest_ttft_entry: ProfileHighlightEntry | None = None


class ProfileComparison(BaseModel):
    my_avg_tps: float
    global_avg_tps: float
    my_avg_ttft_ms: int
    global_avg_ttft_ms: int
    my_models_count: int
    global_avg_models_count: float


class MeProfileResponse(BaseModel):
    filters: dict[str, Any]
    model_entries: list[ProfileModelEntry]
    provider_distribution: list[ProfileProviderDistribution]
    input_length_distribution: list[ProfileInputLengthDistribution]
    highlights: ProfileHighlights
    comparison: ProfileComparison


class UserStatsModelEntry(BaseModel):
    provider: str
    model: str
    my_avg_tps: float
    my_avg_ttft_ms: float
    global_avg_tps: float
    global_avg_ttft_ms: float


class UserStatsResponse(BaseModel):
    total_contributions: int
    rank: int
    models: list[UserStatsModelEntry]
