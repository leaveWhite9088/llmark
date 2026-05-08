from constants import INPUT_LENGTH_BUCKET_META
from db.adapter import DatabaseAdapter
from db.cache import cache_get, cache_set


def get_provider_display_name(provider: str) -> str:
    from constants import PROVIDER_DISPLAY_NAMES
    return PROVIDER_DISPLAY_NAMES.get(provider.lower(), provider.replace("-", " ").title())


async def get_filter_options(db) -> dict:
    cached = await cache_get("filter_options")
    if cached is not None:
        return cached

    from constants import INPUT_LENGTH_BUCKET_VALUES

    bucket_order = {"short": 0, "medium": 1, "long": 2}
    adapter = DatabaseAdapter(db)

    provider_rows = await adapter.fetch(
        """
        SELECT DISTINCT provider
        FROM reports
        WHERE provider IS NOT NULL AND provider != ''
        ORDER BY provider ASC
        """
    )
    bucket_rows = await adapter.fetch(
        """
        SELECT DISTINCT input_length_bucket
        FROM reports
        WHERE input_length_bucket IS NOT NULL AND input_length_bucket != ''
        """
    )
    model_rows = await adapter.fetch(
        """
        SELECT DISTINCT model
        FROM reports
        WHERE model IS NOT NULL AND model != ''
        ORDER BY model ASC
        """
    )
    providers = [str(row["provider"]) for row in provider_rows]
    input_length_buckets = sorted(
        [str(row["input_length_bucket"]) for row in bucket_rows],
        key=lambda value: bucket_order.get(value, 99),
    )
    models = [str(row["model"]) for row in model_rows]
    result = {
        "providers": providers,
        "input_length_buckets": input_length_buckets,
        "input_length_bucket_meta": [item for item in INPUT_LENGTH_BUCKET_META if item["key"] in input_length_buckets],
        "models": models,
    }
    await cache_set("filter_options", result, ttl=600)  # 10 分钟
    return result


__all__ = [
    "get_filter_options",
    "get_provider_display_name",
]
