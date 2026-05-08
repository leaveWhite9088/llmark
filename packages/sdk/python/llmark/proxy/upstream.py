"""Upstream URL and request-body helpers for the local proxy."""

from __future__ import annotations

import json
from urllib.parse import urlsplit, urlunsplit


def build_upstream_url(upstream_base: str, local_path: str, query: str = "") -> str:
    """Build the upstream URL for a local proxy request.

    Users configure local tools with http://127.0.0.1:8787/v1, while the
    upstream base is usually https://provider.example/v1. When both sides
    include /v1, avoid duplicating it.
    """
    base = upstream_base.rstrip("/")
    path = local_path or "/"
    if base.endswith("/v1") and path.startswith("/v1/"):
        path = path[len("/v1") :]
    elif base.endswith("/v1") and path == "/v1":
        path = ""
    if not path.startswith("/") and path:
        path = "/" + path
    url = base + path
    if query:
        return url + "?" + query
    return url


def get_request_model(body: bytes) -> str:
    try:
        data = json.loads(body.decode("utf-8"))
        model = data.get("model")
        return str(model) if model else "unknown"
    except Exception:
        return "unknown"


def is_streaming_request(body: bytes) -> bool:
    try:
        data = json.loads(body.decode("utf-8"))
        return bool(data.get("stream"))
    except Exception:
        return False


def maybe_inject_stream_usage(body: bytes, enabled: bool) -> bytes:
    if not enabled:
        return body
    try:
        data = json.loads(body.decode("utf-8"))
        if not data.get("stream"):
            return body
        options = data.get("stream_options")
        if not isinstance(options, dict):
            options = {}
        options.setdefault("include_usage", True)
        data["stream_options"] = options
        return json.dumps(data, ensure_ascii=True, separators=(",", ":")).encode("utf-8")
    except Exception:
        return body
