from fastapi import APIRouter, Depends, Query, Request

from db.connection import get_db
from db.queries import get_detail_by_model, get_detail_trend
from dependencies.queries import InputLengthBucketQuery, RangeQuery, map_bucket_unit, map_range_to_interval
from limiter import limiter
from schemas import DetailByModelResponse, TrendResponse


router = APIRouter(tags=["detail"])


@router.get("/detail", response_model=TrendResponse)
@limiter.limit("60/minute")
async def detail(
    request: Request,
    provider: str = Query(..., max_length=64),
    model: str = Query(..., max_length=128),
    range: str = RangeQuery(),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    db=Depends(get_db),
):
    return await get_detail_trend(
        db=db,
        provider=provider,
        model=model,
        interval=map_range_to_interval(range),
        bucket_unit=map_bucket_unit(range),
        input_length_bucket=input_length_bucket,
    )


@router.get("/detail-by-model", response_model=DetailByModelResponse)
@limiter.limit("60/minute")
async def detail_by_model(
    request: Request,
    model: str = Query(..., max_length=128),
    range: str = RangeQuery(),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    db=Depends(get_db),
):
    return await get_detail_by_model(
        db=db,
        model=model,
        interval=map_range_to_interval(range),
        bucket_unit=map_bucket_unit(range),
        input_length_bucket=input_length_bucket,
    )
