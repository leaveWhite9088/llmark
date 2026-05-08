from pydantic import BaseModel


class ModelBestCombo(BaseModel):
    provider: str
    provider_name: str
    tps: float
    ttft_ms: int


class ModelOverviewMetrics(BaseModel):
    avg_tps: float
    avg_ttft_ms: int
    best_combo: ModelBestCombo | None = None
    total_providers: int
    total_samples: int


class ModelOverviewResponse(BaseModel):
    model: str
    overview: ModelOverviewMetrics


class ModelEntryItem(BaseModel):
    provider: str
    provider_name: str
    input_length_bucket: str | None = None
    avg_tps: float
    avg_ttft_ms: int
    sample_count: int
    data_quality: str


class ModelEntriesAvailableFilters(BaseModel):
    providers: list[str]


class ModelMeta(BaseModel):
    display_name: str | None = None
    tags: list[str] = []
    context_window: int | None = None
    release_date: str | None = None
    description: str | None = None


class ModelEntriesResponse(BaseModel):
    items: list[ModelEntryItem]
    available_filters: ModelEntriesAvailableFilters
    meta: ModelMeta | None = None


class ProviderComparisonItem(BaseModel):
    provider: str
    name: str
    avg_tps: float
    avg_ttft_ms: int


class ModelProviderComparisonResponse(BaseModel):
    model: str
    data: dict[str, list[ProviderComparisonItem]]


class ModelInsightItem(BaseModel):
    icon: str
    title: str
    description: str


class ModelInsightsResponse(BaseModel):
    insights: list[ModelInsightItem]
