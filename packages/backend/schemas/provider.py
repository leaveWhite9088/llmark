from pydantic import BaseModel


class ProviderBestCombo(BaseModel):
    model: str
    tps: float
    ttft_ms: int


class ProviderOverviewMetrics(BaseModel):
    avg_tps: float
    avg_ttft_ms: int
    best_combo: ProviderBestCombo | None = None
    total_models: int
    total_samples: int


class ComputeAllocationItem(BaseModel):
    model: str
    sample_count: int
    percentage: float
    avg_tps: float


class ProviderInfo(BaseModel):
    display_name: str | None = None
    description: str | None = None
    policies: list[str] = []
    logo_url: str | None = None


class ProviderOverviewResponse(BaseModel):
    provider: str
    provider_name: str
    overview: ProviderOverviewMetrics
    compute_allocation: list[ComputeAllocationItem] = []
    description: str | None = None
    policies: list[str] = []


class ProviderModelItem(BaseModel):
    model: str
    input_length_bucket: str | None = None
    avg_tps: float
    avg_ttft_ms: int
    sample_count: int
    data_quality: str


class ProviderModelsAvailableFilters(BaseModel):
    models: list[str]


class ProviderModelsResponse(BaseModel):
    items: list[ProviderModelItem]
    available_filters: ProviderModelsAvailableFilters


class ProviderModelInfoItem(BaseModel):
    model: str
    display_name: str | None = None
    parameters: str | None = None
    context_window: str | None = None
    release_date: str | None = None
    description: str | None = None
    tags: list[str] = []


class ProviderModelsInfoResponse(BaseModel):
    items: list[ProviderModelInfoItem]


class ProviderStatsResponse(BaseModel):
    provider: str
    provider_name: str
    compute_allocation: list[ComputeAllocationItem]
