"""Model list fetching for LLMark benchmark.

从厂商 API 拉取可用模型列表，被 benchmark CLI 和 interactive wizard 共同依赖。
"""

from __future__ import annotations

import json
import logging
from urllib import request as urllib_request

from llmark.benchmark.providers import get_provider_preset

logger = logging.getLogger("llmark.benchmark")


def _fetch_openai_models(base_url: str, api_key: str) -> list[str] | None:
    """标准 OpenAI 兼容格式探测：Bearer 鉴权 + /v1/models 端点。"""
    url = base_url.rstrip("/") + "/models"
    req = urllib_request.Request(
        url,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        },
    )
    try:
        with urllib_request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = data.get("data", [])
            ids = [m.get("id") for m in models if m.get("id")]
            return sorted(set(ids))
    except Exception as exc:
        logger.debug("OpenAI-compatible model list failed: %s", exc)
        return None


def _fetch_google_models(api_key: str) -> list[str] | None:
    """Google Gemini 降级探测：?key= 参数鉴权 + /v1beta/models 端点。"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    req = urllib_request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib_request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = data.get("models", [])
            ids = []
            for m in models:
                name = m.get("name", "")
                # name 格式为 "models/gemini-xxx"，去掉前缀
                if name.startswith("models/"):
                    ids.append(name[7:])
                elif name:
                    ids.append(name)
            return sorted(set(ids))
    except Exception as exc:
        logger.debug("Google model list failed: %s", exc)
        return None


def _fetch_anthropic_models(base_url: str, api_key: str) -> list[str] | None:
    """Anthropic 降级探测：x-api-key 鉴权 + /v1/models 端点。"""
    url = base_url.rstrip("/") + "/models"
    req = urllib_request.Request(
        url,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Accept": "application/json",
        },
    )
    try:
        with urllib_request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = data.get("data", [])
            ids = [m.get("id") for m in models if m.get("id")]
            return sorted(set(ids))
    except Exception as exc:
        logger.debug("Anthropic model list failed: %s", exc)
        return None


def fetch_models(base_url: str, api_key: str) -> list[str] | None:
    """Fetch model list with vendor-specific fallbacks.

    探测优先级：
        1. 标准 OpenAI 兼容格式（Bearer 鉴权）
        2. Google Gemini（?key= 参数鉴权）
        3. Anthropic（x-api-key 鉴权）
    """
    # 1. 标准 OpenAI 兼容探测
    result = _fetch_openai_models(base_url, api_key)
    if result:
        return result

    # 2. Google Gemini 降级探测
    if "generativelanguage.googleapis.com" in base_url:
        result = _fetch_google_models(api_key)
        if result:
            return result

    # 3. Anthropic 降级探测
    if "anthropic.com" in base_url:
        result = _fetch_anthropic_models(base_url, api_key)
        if result:
            return result

    return None


def get_model_choices(provider_key: str, base_url: str, api_key: str) -> list[str]:
    """Get model list for a provider.

    Priority:
    1. Try fetching from remote API
    2. Fall back to builtin model list from preset
    """
    remote = fetch_models(base_url, api_key)
    if remote:
        return remote
    preset = get_provider_preset(provider_key)
    if preset:
        return list(preset.builtin_models)
    return []
