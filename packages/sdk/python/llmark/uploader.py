import json
import logging
import threading
from urllib import request as urllib_request

logger = logging.getLogger("llmark.uploader")


def upload_async(payload: dict, api_url: str) -> threading.Thread:
    thread = threading.Thread(
        target=_do_upload,
        args=(payload, api_url),
        daemon=False,
    )
    thread.start()
    return thread


def _do_upload(payload: dict, api_url: str) -> None:
    try:
        clean_payload = {key: value for key, value in payload.items() if value is not None}
        data = json.dumps(clean_payload).encode("utf-8")
        headers: dict[str, str] = {"Content-Type": "application/json"}

        # 自动携带 JWT token
        from llmark.auth import get_token
        token = get_token()
        if token:
            headers["Authorization"] = f"Bearer {token}"

        req = urllib_request.Request(
            api_url,
            data=data,
            headers=headers,
            method="POST",
        )
        with urllib_request.urlopen(req, timeout=5) as resp:
            logger.info("Upload successful: %s (status=%s)", api_url, resp.status)
    except urllib_request.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace") if exc.fp else ""
        logger.warning(
            "Upload failed to %s: %s (body=%s)", api_url, exc, body[:500]
        )
    except Exception as exc:
        logger.warning("Upload failed to %s: %s", api_url, exc)
