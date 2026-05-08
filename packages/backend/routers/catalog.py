from fastapi import APIRouter, Depends, Path, Request

from db.connection import get_db
from db.queries import get_model_providers_catalog, get_models_catalog, get_providers_catalog
from dependencies.queries import (
    InputLengthBucketQuery,
    RangeQuery,
    SortByQuery,
    SortOrderQuery,
    map_range_to_interval,
)
from limiter import limiter
from schemas import (
    ModelProvidersCatalogResponse,
    ModelsCatalogResponse,
    ProvidersCatalogResponse,
)


router = APIRouter(tags=["catalog"])


@router.get("/models", response_model=ModelsCatalogResponse)
@limiter.limit("60/minute")
async def models_catalog(
    request: Request,
    range: str = RangeQuery(),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    sort_by: str = SortByQuery(pattern="^(tps|ttft|sample_count|provider_count|name)$"),
    sort_order: str = SortOrderQuery(),
    db=Depends(get_db),
):
    return await get_models_catalog(
        db=db,
        interval=map_range_to_interval(range),
        input_length_bucket=input_length_bucket,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/models/{model:path}/providers", response_model=ModelProvidersCatalogResponse)
@limiter.limit("60/minute")
async def model_providers_catalog(
    request: Request,
    model: str = Path(..., max_length=128),
    range: str = RangeQuery(),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    db=Depends(get_db),
):
    return await get_model_providers_catalog(
        db=db,
        model=model,
        interval=map_range_to_interval(range),
        input_length_bucket=input_length_bucket,
    )


@router.get("/providers", response_model=ProvidersCatalogResponse)
@limiter.limit("60/minute")
async def providers_catalog(
    request: Request,
    range: str = RangeQuery(),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    sort_by: str = SortByQuery(pattern="^(tps|ttft|sample_count|model_count|name)$"),
    sort_order: str = SortOrderQuery(),
    db=Depends(get_db),
):
    from dependencies.queries import map_range_to_interval
    return await get_providers_catalog(
        db=db,
        interval=map_range_to_interval(range),
        input_length_bucket=input_length_bucket,
        sort_by=sort_by,
        sort_order=sort_order,
    )
