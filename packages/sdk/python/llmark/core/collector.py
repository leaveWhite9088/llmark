import random
import time
from functools import wraps
from typing import Any, Callable, Generator

from llmark.config import RuntimeConfig, get_config
from llmark.core.providers import identify_provider, get_adapter
from llmark.reporter import Reporter


def _report(
    provider: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    first_token_time: float,
    start_time: float,
    end_time: float,
    config: RuntimeConfig | None = None,
) -> None:
    if config is None:
        config = get_config()
    if not config or provider == "unknown":
        return
    try:
        ttft_ms = int((first_token_time - start_time) * 1000)
        total_ms = int((end_time - start_time) * 1000)
        if completion_tokens <= 0 or ttft_ms < 0 or total_ms <= 0:
            return
        payload = {
            "device_id": config.device_id,
            "token": config.token,
            "provider": provider,
            "model": model,
            "prompt_tokens": int(prompt_tokens or 0),
            "completion_tokens": int(completion_tokens or 0),
            "ttft_ms": ttft_ms,
            "total_ms": total_ms,
            "sdk_version": "0.1.0",
        }
        Reporter().report(payload, config.api_url)
    except Exception:
        pass


def _should_collect(config: RuntimeConfig | None = None) -> bool:
    if config is None:
        config = get_config()
    if not config or not config.enabled:
        return False
    return random.random() < config.sample_rate


def make_sdk_wrapper(
    original: Callable[..., Any],
    config: RuntimeConfig | None = None,
    *,
    provider_hint: str | None = None,
    model_key: str = "model",
    model_from_self: str | None = None,
) -> Callable[..., Any]:
    """通用 SDK wrapper，用于采集流式请求的性能指标。

    Args:
        original: 原始 SDK 方法
        config: 运行时配置
        provider_hint: 指定 provider 名称（如 "anthropic"），None 则从 URL 识别
        model_key: 从 kwargs 获取 model 的键名
        model_from_self: 从 self 获取 model 的属性名（如 "model_name"）
    """
    if config is None:
        config = get_config()

    @wraps(original)
    def wrapper(self: Any, *args: Any, **kwargs: Any) -> Any:
        if not kwargs.get("stream", False) or not _should_collect(config):
            return original(self, *args, **kwargs)

        # 识别 provider
        if provider_hint:
            provider = provider_hint
        else:
            try:
                base_url = str(self._client.base_url)
            except Exception:
                base_url = ""
            provider = identify_provider(base_url)

        if provider == "unknown":
            return original(self, *args, **kwargs)

        # 获取 model
        model = kwargs.get(model_key) or (getattr(self, model_from_self, "unknown") if model_from_self else "unknown")

        adapter = get_adapter(provider)
        start_time = time.time()
        first_token_time: float | None = None
        completion_tokens = 0
        prompt_tokens = 0
        stream = original(self, *args, **kwargs)

        def iterator() -> Generator[Any, None, None]:
            nonlocal first_token_time, completion_tokens, prompt_tokens
            try:
                for chunk in stream:
                    if first_token_time is None and adapter.is_first_token_from_chunk(chunk):
                        first_token_time = time.time()
                    usage = adapter.extract_usage_from_chunk(chunk)
                    if usage:
                        pt, ct = usage
                        if pt > 0:
                            prompt_tokens = pt
                        if ct > 0:
                            completion_tokens = ct
                    yield chunk
            finally:
                end_time = time.time()
                if first_token_time is not None and completion_tokens > 0:
                    _report(provider, model, prompt_tokens, completion_tokens, first_token_time, start_time, end_time, config)

        return iterator()

    return wrapper


# 向后兼容的别名
def make_openai_wrapper(original: Callable[..., Any], config: RuntimeConfig | None = None) -> Callable[..., Any]:
    return make_sdk_wrapper(original, config)


def make_anthropic_wrapper(original: Callable[..., Any], config: RuntimeConfig | None = None) -> Callable[..., Any]:
    return make_sdk_wrapper(original, config, provider_hint="anthropic")


def make_google_wrapper(original: Callable[..., Any], config: RuntimeConfig | None = None) -> Callable[..., Any]:
    return make_sdk_wrapper(original, config, provider_hint="google", model_from_self="model_name")
