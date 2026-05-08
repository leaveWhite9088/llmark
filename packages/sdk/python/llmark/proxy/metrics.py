"""Metric extraction for OpenAI-compatible proxy responses."""

from __future__ import annotations

import json
import random
from dataclasses import dataclass

from llmark.core.providers import get_adapter, parse_sse_data_line
from llmark.device import get_device_id
from llmark.reporter import Reporter

PROXY_VERSION = "proxy-0.1.0"


@dataclass
class ProxyMetrics:
    provider: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    first_token_seen: bool = False


def update_metrics_from_sse_line(metrics: ProxyMetrics, line: bytes) -> bool:
    data = parse_sse_data_line(line)
    if not data:
        return False
    adapter = get_adapter(metrics.provider)
    first_content = adapter.is_first_token(data)
    usage = adapter.extract_usage(data)
    if usage:
        metrics.prompt_tokens, metrics.completion_tokens = usage
    return first_content


def update_metrics_from_json_response(metrics: ProxyMetrics, body: bytes) -> bool:
    try:
        data = json.loads(body.decode("utf-8"))
    except Exception:
        return False
    if not isinstance(data, dict):
        return False
    adapter = get_adapter(metrics.provider)
    usage = adapter.extract_usage(data)
    if usage:
        metrics.prompt_tokens, metrics.completion_tokens = usage
    return adapter.is_first_token(data)


def report_proxy_metrics(
    metrics: ProxyMetrics,
    start_time: float,
    first_token_time: float | None,
    end_time: float,
    report_url: str,
    token: str | None,
    sample_rate: float,
    debug: bool = False,
) -> None:
    if metrics.provider == "unknown":
        _debug(debug, "skip report: provider unknown")
        return
    if random.random() > sample_rate:
        _debug(debug, "skip report: sample rate")
        return
    if first_token_time is None:
        _debug(debug, "skip report: first token not observed")
        return
    if metrics.completion_tokens <= 0:
        _debug(debug, "skip report: usage not found")
        return

    ttft_ms = int((first_token_time - start_time) * 1000)
    total_ms = int((end_time - start_time) * 1000)
    if ttft_ms < 0 or total_ms <= 0:
        _debug(debug, "skip report: invalid timing")
        return

    payload = {
        "device_id": get_device_id(),
        "token": token,
        "provider": metrics.provider,
        "model": metrics.model,
        "prompt_tokens": int(metrics.prompt_tokens or 0),
        "completion_tokens": int(metrics.completion_tokens),
        "ttft_ms": ttft_ms,
        "total_ms": total_ms,
        "sdk_version": PROXY_VERSION,
    }
    _debug(debug, f"upload report provider={metrics.provider} model={metrics.model} ttft_ms={ttft_ms} total_ms={total_ms}")
    Reporter().report(payload, report_url)


def _debug(enabled: bool, message: str) -> None:
    if enabled:
        print(f"[llmark proxy] {message}")
