from fastapi import APIRouter, Depends, Path, Query, Request

from db.connection import get_db
from db.queries import get_model_entries, get_model_insights, get_model_overview, get_model_provider_comparison
from dependencies.queries import InputLengthBucketQuery, RangeQuery, SortByQuery, SortOrderQuery, map_range_to_interval
from limiter import limiter
from schemas import (
    ModelEntriesResponse,
    ModelInsightsResponse,
    ModelOverviewResponse,
    ModelProviderComparisonResponse,
)


router = APIRouter(tags=["model"])


@router.get("/model/{model:path}/overview", response_model=ModelOverviewResponse)
@limiter.limit("60/minute")
async def model_overview(
    request: Request,
    model: str = Path(..., max_length=128),
    range: str = RangeQuery(),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    db=Depends(get_db),
):
    return await get_model_overview(
        db=db,
        model=model,
        interval=map_range_to_interval(range),
        input_length_bucket=input_length_bucket,
    )


@router.get("/model/{model:path}/entries", response_model=ModelEntriesResponse)
@limiter.limit("60/minute")
async def model_entries(
    request: Request,
    model: str = Path(..., max_length=128),
    range: str = RangeQuery(),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    provider: str | None = Query(default=None, max_length=64),
    sort_by: str = SortByQuery(pattern="^(tps|ttft|sample_count|provider)$"),
    sort_order: str = SortOrderQuery(),
    db=Depends(get_db),
):
    return await get_model_entries(
        db=db,
        model=model,
        interval=map_range_to_interval(range),
        input_length_bucket=input_length_bucket,
        provider=provider,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/model/{model:path}/insights", response_model=ModelInsightsResponse)
@limiter.limit("60/minute")
async def model_insights(
    request: Request,
    model: str = Path(..., max_length=128),
    provider: str | None = Query(default=None, max_length=64),
    range: str = RangeQuery(),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    db=Depends(get_db),
):
    return await get_model_insights(
        db=db,
        model=model,
        provider=provider,
        interval=map_range_to_interval(range),
        input_length_bucket=input_length_bucket,
    )


@router.get("/model/{model:path}/provider-comparison", response_model=ModelProviderComparisonResponse)
@router.get("/model/{model:path}/comparison", response_model=ModelProviderComparisonResponse)
@limiter.limit("60/minute")
async def model_provider_comparison(
    request: Request,
    model: str = Path(..., max_length=128),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    db=Depends(get_db),
):
    return await get_model_provider_comparison(
        db=db,
        model=model,
        input_length_bucket=input_length_bucket,
    )
