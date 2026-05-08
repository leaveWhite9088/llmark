"""Privacy helpers for the local proxy.

The proxy must never log or upload API keys, prompts, messages, tool call
arguments, or model response content. This module only handles metadata
that is safe to forward or print.
"""

from __future__ import annotations

HOP_BY_HOP_HEADERS = {
    "connection",
    "content-length",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}

PROXY_INDICATOR_HEADERS = {
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-forwarded-port",
    "x-real-ip",
    "x-proxy-user",
    "via",
}

RESPONSE_SKIP_HEADERS = {
    "connection",
    "content-length",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}

SENSITIVE_HEADERS = {
    "authorization",
    "proxy-authorization",
    "x-api-key",
    "api-key",
}


def should_forward_request_header(name: str) -> bool:
    lowered = name.lower()
    return lowered not in HOP_BY_HOP_HEADERS and lowered not in PROXY_INDICATOR_HEADERS


def should_forward_response_header(name: str) -> bool:
    return name.lower() not in RESPONSE_SKIP_HEADERS


def sanitize_headers(headers: dict[str, str]) -> dict[str, str]:
    clean: dict[str, str] = {}
    for key, value in headers.items():
        if key.lower() in SENSITIVE_HEADERS:
            clean[key] = "<redacted>"
        else:
            clean[key] = value
    return clean
