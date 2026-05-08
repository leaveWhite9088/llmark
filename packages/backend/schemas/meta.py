from pydantic import BaseModel


class InputLengthBucketMeta(BaseModel):
    key: str
    label: str
    min_tokens: int
    max_tokens: int | None = None
    description: str


class FilterOptionsResponse(BaseModel):
    providers: list[str]
    input_length_buckets: list[str]
    input_length_bucket_meta: list[InputLengthBucketMeta]
    models: list[str]
