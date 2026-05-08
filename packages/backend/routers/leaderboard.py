from fastapi import APIRouter, Depends, Query, Request

from db.connection import get_db
from db.queries import get_leaderboard, get_user_badges, get_users_leaderboard
from dependencies.queries import InputLengthBucketQuery, RangeQuery
from limiter import limiter
from schemas import LeaderboardItem, UserBadgesResponse, UserLeaderboardResponse
from dependencies.auth import get_current_user_id, get_optional_user_id


router = APIRouter(tags=["leaderboard"])


@router.get("/leaderboard", response_model=list[LeaderboardItem])
@limiter.limit("60/minute")
async def leaderboard(
    request: Request,
    sort_by: str = Query("tps", pattern="^(tps|ttft)$"),
    range: str = RangeQuery(),
    provider: str | None = Query(default=None, max_length=64),
    model: str | None = Query(default=None, max_length=128),
    input_length_bucket: str | None = InputLengthBucketQuery(),
    db=Depends(get_db),
):
    return await get_leaderboard(
        db=db,
        sort_by=sort_by,
        range=range,
        provider=provider,
        model=model,
        input_length_bucket=input_length_bucket,
    )


@router.get("/users/leaderboard", response_model=UserLeaderboardResponse, tags=["users"])
@limiter.limit("60/minute")
async def users_leaderboard(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="contributions", pattern="^(contributions|models|tps|ttft|rank)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db=Depends(get_db),
    user_id: int | None = Depends(get_optional_user_id),
):
    return await get_users_leaderboard(
        db,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
        current_user_id=user_id,
    )


@router.get("/users/badges", response_model=UserBadgesResponse, tags=["users"])
@limiter.limit("30/minute")
async def users_badges(
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db=Depends(get_db),
):
    return await get_user_badges(db, user_id)
