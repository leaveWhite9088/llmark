"""Provider identification and adapter for LLMark."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

# --- SSE 解析（通用协议能力，非 proxy 专属） ---

def parse_sse_data_line(line: bytes) -> dict[str, Any] | None:
    """Parse a single SSE data line into a dict. Returns None for non-data lines or [DONE]."""
    text = line.decode("utf-8", errors="ignore").strip()
    if not text.startswith("data:"):
        return None
    payload = text[len("data:") :].strip()
    if not payload or payload == "[DONE]":
        return None
    try:
        data = json.loads(payload)
    except Exception:
        return None
    return data if isinstance(data, dict) else None


# --- URL 识别 ---

PROVIDER_MAP = [
    ("openai.com", "openai"),
    ("anthropic.com", "anthropic"),
    ("generativelanguage", "google"),
    ("deepseek.com", "deepseek"),
    ("siliconflow.cn", "siliconflow"),
    ("aliyuncs.com", "aliyun"),
    ("volces.com", "bytedance"),
    ("baidu.com", "baidu"),
    ("tencent.com", "tencent"),
    ("moonshot.cn", "moonshot"),
    ("minimax.chat", "minimax"),
    ("zhipuai.cn", "zhipuai"),
]


def identify_provider(base_url: str) -> str:
    if not base_url:
        return "openai"
    url_lower = base_url.lower()
    for keyword, provider in PROVIDER_MAP:
        if keyword in url_lower:
            return provider
    return "unknown"


# --- Provider Adapter ---

@dataclass(frozen=True)
class ProviderAdapter:
    """厂商适配器。大部分 OpenAI-compatible 厂商使用默认实现即可。"""

    name: str
    needs_stream_options: bool = True

    def prepare_payload(self, payload: dict) -> dict:
        """改造请求 payload，如注入 stream_options。"""
        if self.needs_stream_options and payload.get("stream"):
            options = payload.get("stream_options")
            if not isinstance(options, dict):
                options = {}
            options.setdefault("include_usage", True)
            payload["stream_options"] = options
        return payload

    def extract_usage(self, data: dict) -> tuple[int, int] | None:
        """从 SSE/JSON 响应数据中提取 usage。返回 (prompt_tokens, completion_tokens)。"""
        usage = data.get("usage")
        if isinstance(usage, dict):
            pt = int(usage.get("prompt_tokens", 0))
            ct = int(usage.get("completion_tokens", 0))
            if ct > 0:
                return pt, ct
        return None

    def is_first_token(self, data: dict) -> bool:
        """判断 SSE/JSON 响应数据是否包含首个可见 token。"""
        choices = data.get("choices")
        if not isinstance(choices, list):
            return False
        for choice in choices:
            if not isinstance(choice, dict):
                continue
            delta = choice.get("delta")
            if isinstance(delta, dict):
                if delta.get("content"):
                    return True
                if delta.get("reasoning_content"):
                    return True
                if delta.get("tool_calls"):
                    return True
            message = choice.get("message")
            if isinstance(message, dict):
                if message.get("content"):
                    return True
                if message.get("reasoning_content"):
                    return True
        return False

    # --- 自动采集（SDK chunk）适配 ---

    def extract_usage_from_chunk(self, chunk: Any) -> tuple[int, int] | None:
        """从 OpenAI SDK chunk 中提取 usage。子类可覆盖。"""
        usage = getattr(chunk, "usage", None)
        if usage:
            pt = getattr(usage, "prompt_tokens", 0) or 0
            ct = getattr(usage, "completion_tokens", 0) or 0
            if ct > 0:
                return int(pt), int(ct)
        return None

    def is_first_token_from_chunk(self, chunk: Any) -> bool:
        """从 OpenAI SDK chunk 中判断首 token。子类可覆盖。"""
        choices = getattr(chunk, "choices", None)
        if not choices:
            return False
        for choice in choices:
            delta = getattr(choice, "delta", None)
            if delta:
                content = getattr(delta, "content", None)
                reasoning = getattr(delta, "reasoning_content", None)
                tool_calls = getattr(delta, "tool_calls", None)
                if content or reasoning or tool_calls:
                    return True
        return False


class _AnthropicAdapter(ProviderAdapter):
    """Anthropic 适配器。Anthropic SDK 的流式事件格式与 OpenAI 不同。"""

    def __init__(self) -> None:
        super().__init__(name="anthropic", needs_stream_options=False)

    def extract_usage_from_chunk(self, chunk: Any) -> tuple[int, int] | None:
        event_type = getattr(chunk, "type", "")
        if event_type == "message_delta" and hasattr(chunk, "usage"):
            ct = getattr(chunk.usage, "output_tokens", 0) or 0
            return 0, int(ct)
        if event_type == "message_start" and hasattr(chunk, "message"):
            usage = getattr(getattr(chunk, "message", None), "usage", None)
            if usage:
                pt = getattr(usage, "input_tokens", 0) or 0
                return int(pt), 0
        return None

    def is_first_token_from_chunk(self, chunk: Any) -> bool:
        return getattr(chunk, "type", "") == "content_block_delta"


class _GoogleAdapter(ProviderAdapter):
    """Google 适配器。Google GenerativeAI SDK 的 chunk 格式与 OpenAI 不同。"""

    def __init__(self) -> None:
        super().__init__(name="google", needs_stream_options=False)

    def extract_usage_from_chunk(self, chunk: Any) -> tuple[int, int] | None:
        usage = getattr(chunk, "usage_metadata", None)
        if usage:
            ct = getattr(usage, "candidates_token_count", 0) or 0
            pt = getattr(usage, "prompt_token_count", 0) or 0
            if ct > 0:
                return int(pt), int(ct)
        return None

    def is_first_token_from_chunk(self, chunk: Any) -> bool:
        return bool(getattr(chunk, "text", None))


# --- 注册表 ---

_ADAPTERS: dict[str, ProviderAdapter] = {
    "openai": ProviderAdapter("openai"),
    "deepseek": ProviderAdapter("deepseek"),
    "siliconflow": ProviderAdapter("siliconflow"),
    "minimax": ProviderAdapter("minimax"),
    "moonshot": ProviderAdapter("moonshot"),
    "anthropic": _AnthropicAdapter(),
    "google": _GoogleAdapter(),
    "aliyun": ProviderAdapter("aliyun"),
    "bytedance": ProviderAdapter("bytedance"),
    "baidu": ProviderAdapter("baidu"),
    "tencent": ProviderAdapter("tencent"),
    "zhipuai": ProviderAdapter("zhipuai"),
}


def get_adapter(provider: str) -> ProviderAdapter:
    """获取厂商适配器。未知厂商返回默认 OpenAI 适配器。"""
    adapter = _ADAPTERS.get(provider.lower())
    if adapter:
        return adapter
    return ProviderAdapter(name=provider.lower())
