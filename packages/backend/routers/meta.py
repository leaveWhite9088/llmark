from fastapi import APIRouter, Depends, Request

from db.connection import get_db
from db.queries import get_filter_options
from limiter import limiter
from schemas import FilterOptionsResponse


router = APIRouter(tags=["meta"])


@router.get("/meta/filters", response_model=FilterOptionsResponse)
@limiter.limit("60/minute")
async def filters(request: Request, db=Depends(get_db)):
    return await get_filter_options(db)
