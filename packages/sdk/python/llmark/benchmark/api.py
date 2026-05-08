"""API benchmark helpers for LLMark."""

from __future__ import annotations

import json
import logging
import os
import random
import time
from dataclasses import dataclass
from typing import Callable, Sequence
from urllib import error as urllib_error
from urllib import request as urllib_request

import llmark
from llmark.benchmark.presets import get_preset
from llmark.config import CHAT_COMPLETIONS_PATH, get_report_url
from llmark.core.providers import get_adapter, parse_sse_data_line
from llmark.device import get_device_id
from llmark.proxy.metrics import ProxyMetrics
from llmark.proxy.upstream import build_upstream_url
from llmark.reporter import Reporter

logger = logging.getLogger("llmark.benchmark")

BENCHMARK_VERSION = f"benchmark-{llmark.__version__}"
DEFAULT_REPORT_URL = get_report_url()
PROVIDER_KEY_ENVS = {
    "deepseek": "DEEPSEEK_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "google": "GOOGLE_API_KEY",
    "minimax": "MINIMAX_API_KEY",
    "openai": "OPENAI_API_KEY",
}


@dataclass(frozen=True)
class BenchmarkApiConfig:
    provider: str
    model: str
    base_url: str
    runs: int = 3
    preset: str = "medium"
    api_key: str | None = None
    api_key_env: str | None = None
    report_url: str = DEFAULT_REPORT_URL
    token: str | None = None
    sample_rate: float = 1.0
    timeout: int = 120
    debug: bool = False
    stream: bool = True


@dataclass(frozen=True)
class BenchmarkRunResult:
    run_index: int
    ttft_ms: int | None
    total_ms: int | None
    prompt_tokens: int | None
    completion_tokens: int | None
    tps: float | None
    uploaded: bool
    upload_reason: str | None
    status_code: int


def default_api_key_env(provider: str) -> str | None:
    return PROVIDER_KEY_ENVS.get(provider.lower())


def _resolve_api_key(config: BenchmarkApiConfig) -> str | None:
    """Resolve API key with priority: --api-key > LLMARK_API_KEY > --api-key-env > provider default."""
    if config.api_key:
        return config.api_key
    env_key = os.environ.get("LLMARK_API_KEY")
    if env_key:
        return env_key
    if config.api_key_env:
        env_key = os.environ.get(config.api_key_env)
        if env_key:
            return env_key
    provider_default = default_api_key_env(config.provider)
    if provider_default:
        return os.environ.get(provider_default)
    return None


def run_api_benchmark(
    config: BenchmarkApiConfig,
    on_run_start: Callable[[int, int], None] | None = None,
) -> list[BenchmarkRunResult]:
    if not config.stream:
        raise RuntimeError("Version 1 benchmark only supports streaming mode.")
    api_key = _resolve_api_key(config)
    if not api_key:
        provider_default = default_api_key_env(config.provider)
        if provider_default:
            raise RuntimeError(
                f"Missing API key for provider '{config.provider}'. "
                f"Provide via --api-key, set LLMARK_API_KEY, "
                f"or set the provider-specific environment variable: {provider_default}."
            )
        raise RuntimeError(
            f"Missing API key for provider '{config.provider}'. "
            "Provider has no default key name. "
            "Provide via --api-key or set LLMARK_API_KEY environment variable."
        )
    results: list[BenchmarkRunResult] = []
    total_runs = max(1, config.runs)
    for run_index in range(1, total_runs + 1):
        if on_run_start is not None:
            on_run_start(run_index, total_runs)
        result = _run_single_benchmark(config, api_key, run_index)
        results.append(result)
    return results


def print_api_benchmark_report(config: BenchmarkApiConfig, results: Sequence[BenchmarkRunResult]) -> None:
    print("LLMark API Benchmark")
    print(f"Provider: {config.provider}")
    print(f"Model: {config.model}")
    print(f"Preset: {config.preset}")
    print(f"Runs: {len(results)}")
    success_count = 0
    for item in results:
        if item.status_code == 200:
            success_count += 1
            line = (
                f"Run {item.run_index}: status={item.status_code} "
                f"ttft_ms={item.ttft_ms} total_ms={item.total_ms} "
                f"prompt_tokens={item.prompt_tokens} completion_tokens={item.completion_tokens}"
            )
            if item.ttft_ms is not None:
                line += f" tps={item.tps}"
            if item.uploaded:
                line += " uploaded=yes"
            elif item.upload_reason:
                line += f" uploaded=no ({item.upload_reason})"
            else:
                line += " uploaded=no"
        else:
            line = f"Run {item.run_index}: status={item.status_code} error={item.upload_reason}"
        print(line)
    avg_ttft = _average([item.ttft_ms for item in results if item.ttft_ms is not None])
    avg_total = _average([item.total_ms for item in results if item.total_ms is not None])
    avg_tps = _average([item.tps for item in results if item.tps is not None])
    uploaded = sum(1 for item in results if item.uploaded)
    print(f"Success/Total: {success_count}/{len(results)}")
    print(f"Average TTFT (ms): {avg_ttft}")
    print(f"Average Total (ms): {avg_total}")
    print(f"Average TPS: {avg_tps}")
    print(f"Uploaded runs: {uploaded}/{len(results)}")
    print("Tip: use llmark.init() for always-on Python SDK measurement in your own code.")


def _run_single_benchmark(config: BenchmarkApiConfig, api_key: str, run_index: int) -> BenchmarkRunResult:
    preset = get_preset(config.preset)
    adapter = get_adapter(config.provider)
    payload = {
        "model": config.model,
        "messages": [
            {"role": "system", "content": preset.system_prompt},
            {"role": "user", "content": preset.user_prompt},
        ],
        "stream": True,
        "max_tokens": preset.max_tokens,
    }
    if preset.temperature != 0.0:
        payload["temperature"] = preset.temperature
    payload = adapter.prepare_payload(payload)
    body = json.dumps(payload).encode("utf-8")
    req = urllib_request.Request(
        build_upstream_url(config.base_url, CHAT_COMPLETIONS_PATH),
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "Accept-Encoding": "identity",
            "Connection": "close",
        },
    )
    metrics = ProxyMetrics(provider=config.provider.lower(), model=config.model)
    start_time = time.perf_counter()
    first_token_time: float | None = None
    try:
        with urllib_request.urlopen(req, timeout=config.timeout) as resp:
            status_code = resp.status
            for raw_line in resp:
                # 总时间兜底：超过 timeout 强制中断
                elapsed = time.perf_counter() - start_time
                if elapsed > config.timeout:
                    raise TimeoutError(
                        f"Total request timeout after {elapsed:.1f}s"
                    )
                data = parse_sse_data_line(raw_line)
                if not data:
                    continue
                if first_token_time is None and adapter.is_first_token(data):
                    first_token_time = time.perf_counter()
                    if config.debug:
                        logger.debug("Run %d first token observed", run_index)
                usage = adapter.extract_usage(data)
                if usage:
                    metrics.prompt_tokens, metrics.completion_tokens = usage
        end_time = time.perf_counter()
        ttft_ms = int(round((first_token_time - start_time) * 1000)) if first_token_time is not None else None
        total_ms = int(round((end_time - start_time) * 1000))
        tps = (
            round(metrics.completion_tokens * 1000 / total_ms, 1)
            if metrics.completion_tokens is not None and total_ms and total_ms > 0
            else None
        )
        uploaded, upload_reason, thread = _upload_benchmark_result(config, metrics, ttft_ms, total_ms)
        if thread is not None:
            thread.join(timeout=15)
        return BenchmarkRunResult(
            run_index=run_index,
            ttft_ms=ttft_ms,
            total_ms=total_ms,
            prompt_tokens=metrics.prompt_tokens,
            completion_tokens=metrics.completion_tokens,
            tps=tps,
            uploaded=uploaded,
            upload_reason=upload_reason,
            status_code=status_code,
        )
    except urllib_error.HTTPError as exc:
        logger.warning("Run %d HTTP error %d: %s", run_index, exc.code, exc.reason)
        return BenchmarkRunResult(
            run_index=run_index,
            ttft_ms=None,
            total_ms=None,
            prompt_tokens=None,
            completion_tokens=None,
            tps=None,
            uploaded=False,
            upload_reason=f"HTTP {exc.code}",
            status_code=exc.code,
        )
    except TimeoutError:
        logger.warning("Run %d request timeout", run_index)
        return BenchmarkRunResult(
            run_index=run_index,
            ttft_ms=None,
            total_ms=None,
            prompt_tokens=None,
            completion_tokens=None,
            tps=None,
            uploaded=False,
            upload_reason="Request timeout",
            status_code=408,
        )
    except urllib_error.URLError as exc:
        logger.warning("Run %d network error: %s", run_index, exc.reason)
        return BenchmarkRunResult(
            run_index=run_index,
            ttft_ms=None,
            total_ms=None,
            prompt_tokens=None,
            completion_tokens=None,
            tps=None,
            uploaded=False,
            upload_reason=f"Network error: {exc.reason}",
            status_code=0,
        )
    except Exception as exc:
        logger.error("Run %d unexpected error: %s", run_index, exc, exc_info=True)
        return BenchmarkRunResult(
            run_index=run_index,
            ttft_ms=None,
            total_ms=None,
            prompt_tokens=None,
            completion_tokens=None,
            tps=None,
            uploaded=False,
            upload_reason=f"Unexpected error: {exc}",
            status_code=0,
        )


def _input_length_bucket(prompt_tokens: int) -> str:
    if prompt_tokens <= 4096:
        return "short"
    elif prompt_tokens <= 16384:
        return "medium"
    return "long"


def _upload_benchmark_result(
    config: BenchmarkApiConfig,
    metrics: ProxyMetrics,
    ttft_ms: int | None,
    total_ms: int | None,
) -> tuple[bool, str | None, threading.Thread | None]:
    if metrics.provider == "unknown":
        logger.info("Skipping upload: provider unknown")
        return False, "unknown provider", None
    if ttft_ms is None or total_ms is None:
        logger.info("Skipping upload: missing latency metrics")
        return False, "missing latency", None
    if metrics.completion_tokens <= 0:
        logger.info("Skipping upload: no usage data in response")
        return False, "usage not found", None
    if config.sample_rate < 1.0 and random.random() > config.sample_rate:
        logger.info("Skipping upload: sampled out (sample_rate=%.2f)", config.sample_rate)
        return False, "sampled out", None
    input_length_bucket = _input_length_bucket(metrics.prompt_tokens)
    payload = {
        "device_id": get_device_id(),
        "token": config.token,
        "provider": metrics.provider,
        "model": metrics.model,
        "prompt_tokens": int(metrics.prompt_tokens),
        "completion_tokens": int(metrics.completion_tokens),
        "ttft_ms": int(ttft_ms),
        "total_ms": int(total_ms),
        "input_length_bucket": input_length_bucket,
        "sdk_version": BENCHMARK_VERSION,
    }
    thread = Reporter().report(payload, config.report_url)
    if thread is None:
        return False, "empty report url", None
    logger.debug("Uploading benchmark result: provider=%s model=%s bucket=%s", metrics.provider, metrics.model, input_length_bucket)
    return True, None, thread


def _average(values: Sequence[int | None]) -> float | None:
    concrete = [float(item) for item in values if item is not None]
    if not concrete:
        return None
    return float(round(sum(concrete) / len(concrete), 2))
