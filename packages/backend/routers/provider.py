from fastapi import APIRouter, Depends, Path, Query, Request

from db.connection import get_db
from db.queries import get_provider_models, get_provider_models_info, get_provider_overview, get_provider_stats
from dependencies.queries import InputLengthBucketQuery, RangeQuery, map_range_to_interval
from limiter import limiter
from schemas import (
    ProviderModelsInfoResponse,
    ProviderModelsResponse,
    ProviderOverviewResponse,
    ProviderStatsResponse,
)


router = APIRouter(tags=["provider"])


@router.get("/provider/{provider}/overview", response_model=ProviderOverviewResponse)
@limiter.limit("60/minute")
async def provider_overview(
    request: Request,
    provider: str = Path(..., max_length=64),
    range: str = RangeQuery(),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    db=Depends(get_db),
):
    return await get_provider_overview(
        db=db,
        provider=provider,
        interval=map_range_to_interval(range),
        input_length_bucket=input_length_bucket,
    )


@router.get("/provider/{provider}/models", response_model=ProviderModelsResponse)
@limiter.limit("60/minute")
async def provider_models(
    request: Request,
    provider: str = Path(..., max_length=64),
    range: str = RangeQuery(),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    model: str | None = Query(default=None, max_length=128),
    db=Depends(get_db),
):
    return await get_provider_models(
        db=db,
        provider=provider,
        interval=map_range_to_interval(range),
        input_length_bucket=input_length_bucket,
        model=model,
    )


@router.get("/provider/{provider}/stats", response_model=ProviderStatsResponse)
@limiter.limit("60/minute")
async def provider_stats(
    request: Request,
    provider: str = Path(..., max_length=64),
    range: str = RangeQuery(),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    db=Depends(get_db),
):
    return await get_provider_stats(
        db=db,
        provider=provider,
        interval=map_range_to_interval(range),
        input_length_bucket=input_length_bucket,
    )


@router.get("/provider/{provider}/models/info", response_model=ProviderModelsInfoResponse)
@limiter.limit("60/minute")
async def provider_models_info(
    request: Request,
    provider: str = Path(..., max_length=64),
    model: str | None = Query(default=None, max_length=128),
    db=Depends(get_db),
):
    return await get_provider_models_info(
        db=db,
        provider=provider,
        model=model,
    )
