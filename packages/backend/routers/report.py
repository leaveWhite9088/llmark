import hashlib

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from db.connection import get_db
from db.queries import bind_device_to_user, check_report_anomaly, classify_input_length_bucket, insert_report
from limiter import limiter
from schemas import OkResponse, ReportRequest
from utils.anti_abuse import check_device_rate_limit
from utils.geo import get_client_ip
from utils.jwt import verify_token
from utils.model_names import normalize_model_name


router = APIRouter(tags=["report"])


def _compute_tps(completion_tokens: int, total_ms: int, ttft_ms: int) -> float:
    stream_duration_ms = max(total_ms - ttft_ms, 0)
    if stream_duration_ms <= 0:
        return 0.0
    return round(completion_tokens / (stream_duration_ms / 1000), 2)


def _hash_client_ip(client_ip: str) -> str:
    return hashlib.sha256(client_ip.encode("utf-8")).hexdigest()[:32]


@router.post("/report")
@limiter.limit("200/minute")
async def create_report(request: Request, body: ReportRequest, db=Depends(get_db)):
    if not await check_device_rate_limit(body.device_id):
        return JSONResponse({"error": "Rate limit exceeded"}, status_code=429)

    client_ip = get_client_ip(request)
    ip_hash = _hash_client_ip(client_ip)

    tps = _compute_tps(body.completion_tokens, body.total_ms, body.ttft_ms)

    if tps > 200:
        return JSONResponse({"error": "TPS exceeds maximum threshold"}, status_code=422)

    if not await check_report_anomaly(db, body.provider, body.model, tps):
        return JSONResponse({"error": "Data anomaly detected"}, status_code=429)

    user_id = None
    if body.token:
        user_id = verify_token(body.token)

    normalized_model = normalize_model_name(body.model)

    await insert_report(
        db,
        {
            "device_id": body.device_id,
            "user_id": user_id,
            "provider": body.provider,
            "model": normalized_model,
            "prompt_tokens": body.prompt_tokens,
            "completion_tokens": body.completion_tokens,
            "ttft_ms": body.ttft_ms,
            "total_ms": body.total_ms,
            "tps": tps,
            "ip_hash": ip_hash,
            "input_length_bucket": classify_input_length_bucket(body.prompt_tokens),
        },
    )

    if user_id is not None:
        await bind_device_to_user(db, body.device_id, user_id)

    return OkResponse()
