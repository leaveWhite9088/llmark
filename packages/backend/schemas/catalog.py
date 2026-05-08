from pydantic import BaseModel


class CatalogBestProvider(BaseModel):
    name: str
    display_name: str
    avg_tps: float


class CatalogItem(BaseModel):
    model: str
    provider_count: int
    avg_tps: float
    avg_ttft_ms: int
    total_samples: int
    best_provider: CatalogBestProvider | None = None


class ModelsCatalogResponse(BaseModel):
    items: list[CatalogItem]
    total: int


class ModelProviderItem(BaseModel):
    provider: str
    provider_name: str
    avg_tps: float
    avg_ttft_ms: int
    sample_count: int
    data_quality: str


class ModelProvidersCatalogResponse(BaseModel):
    model: str
    providers: list[ModelProviderItem]


class TopModelItem(BaseModel):
    name: str
    avg_tps: float
    avg_ttft_ms: int
    sample_count: int


class ProviderCatalogItem(BaseModel):
    provider: str
    name: str
    logo_url: str
    model_count: int
    avg_tps: float
    avg_ttft_ms: int
    total_samples: int
    top_models: list[TopModelItem]


class ProvidersCatalogResponse(BaseModel):
    items: list[ProviderCatalogItem]
    total: int
