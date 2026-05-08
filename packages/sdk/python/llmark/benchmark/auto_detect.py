"""Auto-detect available LLM providers by probing their /v1/models endpoints."""

from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass


@dataclass(frozen=True)
class DetectedProvider:
    key: str
    name: str
    base_url: str
    env_key: str
    models: list[str]


def _try_preset(preset) -> DetectedProvider | None:
    """Probe a single provider preset. Returns DetectedProvider if reachable."""
    # 延迟导入避免循环依赖（interactive/__init__.py 会触发 main → wizard → auto_detect）
    from llmark.benchmark.models import fetch_models

    api_key = os.environ.get(preset.env_key) or os.environ.get("LLMARK_API_KEY")
    if not api_key:
        return None
    models = fetch_models(preset.base_url, api_key)
    if models:
        return DetectedProvider(
            key=preset.key,
            name=preset.name,
            base_url=preset.base_url,
            env_key=preset.env_key,
            models=models,
        )
    return None


def detect_providers(max_workers: int = 4) -> list[DetectedProvider]:
    """Detect all available providers by probing /v1/models in parallel.

    Returns a list of DetectedProvider ordered by discovery time.
    """
    # 延迟导入避免循环依赖
    from llmark.benchmark.providers import list_provider_presets

    presets = list_provider_presets()
    available: list[DetectedProvider] = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_try_preset, p): p for p in presets}
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                available.append(result)
    return available


def detect_provider_by_key(api_key: str, max_workers: int = 4) -> DetectedProvider | None:
    """用给定的 API Key 遍历所有预设厂商，自动识别可用厂商。

    并发尝试用 *api_key* 访问每个内置厂商的 ``/v1/models`` 接口，
    第一个成功返回模型列表的厂商即为识别结果。

    参数:
        api_key: 用户输入的 API Key。
        max_workers: 并发探测的最大线程数。

    返回:
        识别到的厂商信息；如果所有厂商都探测失败则返回 ``None``。
    """
    # 延迟导入避免循环依赖
    from llmark.benchmark.models import fetch_models
    from llmark.benchmark.providers import list_provider_presets

    presets = list_provider_presets()
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(fetch_models, p.base_url, api_key): p for p in presets}
        for future in as_completed(futures):
            models = future.result()
            if models:
                p = futures[future]
                return DetectedProvider(
                    key=p.key,
                    name=p.name,
                    base_url=p.base_url,
                    env_key=p.env_key,
                    models=models,
                )
    return None
