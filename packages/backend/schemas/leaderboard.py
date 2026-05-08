from pydantic import BaseModel


class LeaderboardItem(BaseModel):
    provider: str
    model: str
    avg_tps: float
    avg_ttft_ms: int
    sample_count: int
    input_length_bucket: str | None = None
    data_quality: str
    trend_tps_change: float | None = None
    trend_ttft_change: int | None = None
    trend_samples_change: int | None = None
    rank_change: int | None = None
    tags: list[str] | None = None
    last_reported_at: str | None = None


class UserLeaderboardUser(BaseModel):
    rank: int
    user_id: int
    username: str
    avatar_url: str | None = None
    total_contributions: int
    models_tested: int
    avg_tps: float
    avg_ttft_ms: int
    contribution_level: str
    rank_change: int
    badges: list[str]
    streak_days: int
    last_active_at: str | None = None


class UserLeaderboardPagination(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class UserLeaderboardStats(BaseModel):
    total_contributors: int
    total_contributions: int
    models_covered: int
    contributions_today: int
    contributors_trend: int | None = None
    contributions_trend: int | None = None
    models_trend: int | None = None
    today_trend: int | None = None


class WeeklyStar(BaseModel):
    user_id: int
    username: str
    contributions_7d: int


class FastestRiser(BaseModel):
    user_id: int
    username: str
    rank_change: int


class TopTps(BaseModel):
    user_id: int
    username: str
    avg_tps: float


class UserLeaderboardHighlights(BaseModel):
    weekly_star: WeeklyStar | None = None
    fastest_riser: FastestRiser | None = None
    top_tps: TopTps | None = None


class LevelDistributionItem(BaseModel):
    level: str
    count: int
    percentage: float


class UserLeaderboardResponse(BaseModel):
    pagination: UserLeaderboardPagination
    stats: UserLeaderboardStats
    highlights: UserLeaderboardHighlights
    level_distribution: list[LevelDistributionItem]
    users: list[UserLeaderboardUser]
    current_user_rank: int | None = None
