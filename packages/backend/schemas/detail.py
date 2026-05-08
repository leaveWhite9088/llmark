from pydantic import BaseModel


class TrendItem(BaseModel):
    time: str
    avg_tps: float
    avg_ttft_ms: int
    p99_ttft_ms: int


class TrendResponse(BaseModel):
    trend: list[TrendItem]
    sample_count: int = 0


class DetailMetrics(BaseModel):
    avg_tps: float
    avg_ttft_ms: int
    sample_count: int


class DetailTrendItem(BaseModel):
    time: str
    avg_tps: float
    avg_ttft_ms: int
    p99_ttft_ms: int


class DetailProviderItem(BaseModel):
    provider: str
    provider_name: str
    metrics: DetailMetrics
    trend: list[DetailTrendItem]


class DetailByModelResponse(BaseModel):
    providers: list[DetailProviderItem]
