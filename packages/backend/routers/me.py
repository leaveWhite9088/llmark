from fastapi import APIRouter, Depends, Query, Request

from db.connection import get_db
from db.queries import get_me_contribution_heatmap, get_me_overview, get_me_profile, get_user_stats
from dependencies.auth import get_current_user_id
from dependencies.queries import InputLengthBucketQuery, map_me_range_to_interval
from limiter import limiter
from schemas import MeHeatmapResponse, MeOverviewResponse, MeProfileResponse, UserStatsResponse


router = APIRouter(tags=["me"])


@router.get("/me/stats", response_model=UserStatsResponse)
@limiter.limit("30/minute")
async def me_stats(
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db),
):
    return await get_user_stats(db, user_id)


@router.get("/me/overview", response_model=MeOverviewResponse)
@limiter.limit("30/minute")
async def me_overview(
    request: Request,
    range: str = Query(default="30d"),
    provider: str | None = Query(default=None, max_length=64),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db),
):
    interval = map_me_range_to_interval(range)
    return await get_me_overview(
        db,
        user_id,
        interval=interval,
        range_label=range,
        provider=provider,
        input_length_bucket=input_length_bucket,
    )


@router.get("/me/contribution-heatmap", response_model=MeHeatmapResponse)
@limiter.limit("30/minute")
async def me_contribution_heatmap(
    request: Request,
    range: str = Query(default="all"),
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db),
):
    interval = map_me_range_to_interval(range)
    return await get_me_contribution_heatmap(db, user_id, interval=interval, range_label=range)


@router.get("/me/profile", response_model=MeProfileResponse)
@limiter.limit("30/minute")
async def me_profile(
    request: Request,
    range: str = Query(default="30d"),
    provider: str | None = Query(default=None, max_length=64),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db),
):
    interval = map_me_range_to_interval(range)
    return await get_me_profile(
        db,
        user_id,
        interval=interval,
        range_label=range,
        provider=provider,
        input_length_bucket=input_length_bucket,
    )
