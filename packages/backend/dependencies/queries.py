from fastapi import HTTPException, Query

from constants import BUCKET_UNIT, EXTENDED_INTERVAL_MAP, INTERVAL_MAP


def RangeQuery(default: str = "24h") -> str:
    return Query(default, pattern="^(24h|7d|30d)$")


def InputLengthBucketQuery() -> str | None:
    return Query(default=None, pattern="^(short|medium|long)$")


def SortOrderQuery(default: str = "desc") -> str:
    return Query(default, pattern="^(asc|desc)$")


def SortByQuery(pattern: str, default: str = "tps") -> str:
    return Query(default, pattern=pattern)


def map_range_to_interval(range_value: str) -> str:
    return INTERVAL_MAP[range_value]


def map_bucket_unit(range_value: str) -> str:
    return BUCKET_UNIT[range_value]


ME_RANGE_INTERVAL_MAP = {
    **EXTENDED_INTERVAL_MAP,
    "365d": "365 days",
    "all": None,
}


def map_me_range_to_interval(range_value: str) -> str | None:
    if range_value not in ME_RANGE_INTERVAL_MAP:
        raise HTTPException(status_code=400, detail="Invalid range")
    return ME_RANGE_INTERVAL_MAP[range_value]
