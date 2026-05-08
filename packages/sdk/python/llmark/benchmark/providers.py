"""Provider presets for LLMark benchmark.

厂商配置预设：base_url、env_key、内置模型列表。
被 benchmark CLI、auto_detect 和 interactive wizard 共同依赖。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProviderPreset:
    key: str
    name: str
    base_url: str
    env_key: str
    builtin_models: list[str]


_PROVIDER_PRESETS: list[ProviderPreset] = [
    ProviderPreset(
        key="openai",
        name="OpenAI",
        base_url="https://api.openai.com/v1",
        env_key="OPENAI_API_KEY",
        builtin_models=["gpt-5.4", "gpt-4o", "gpt-4o-mini"],
    ),
    ProviderPreset(
        key="anthropic",
        name="Anthropic",
        base_url="https://api.anthropic.com/v1",
        env_key="ANTHROPIC_API_KEY",
        builtin_models=["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
    ),
    ProviderPreset(
        key="google",
        name="Google Gemini",
        base_url="https://generativelanguage.googleapis.com/v1beta",
        env_key="GOOGLE_API_KEY",
        builtin_models=["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
    ),
    ProviderPreset(
        key="deepseek",
        name="DeepSeek",
        base_url="https://api.deepseek.com/v1",
        env_key="DEEPSEEK_API_KEY",
        builtin_models=["deepseek-chat", "deepseek-reasoner"],
    ),
    ProviderPreset(
        key="aliyun",
        name="阿里云百炼",
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        env_key="DASHSCOPE_API_KEY",
        builtin_models=["qwen-turbo-latest", "qwen-plus-latest", "qwen-max"],
    ),
    ProviderPreset(
        key="baidu",
        name="百度千帆",
        base_url="https://qianfan.baidubce.com/v2",
        env_key="QIANFAN_API_KEY",
        builtin_models=["ernie-4.5-turbo-128k", "ernie-4.0-turbo-8k", "deepseek-v3"],
    ),
    ProviderPreset(
        key="tencent",
        name="腾讯混元",
        base_url="https://api.hunyuan.cloud.tencent.com/v1",
        env_key="HUNYUAN_API_KEY",
        builtin_models=["hunyuan-turbo", "hunyuan-pro", "hunyuan-lite"],
    ),
    ProviderPreset(
        key="bytedance",
        name="字节火山引擎",
        base_url="https://ark.cn-beijing.volces.com/api/v3",
        env_key="ARK_API_KEY",
        builtin_models=["doubao-pro-256k", "doubao-pro-32k", "doubao-lite-128k"],
    ),
    ProviderPreset(
        key="moonshot",
        name="Moonshot AI",
        base_url="https://api.moonshot.cn/v1",
        env_key="MOONSHOT_API_KEY",
        builtin_models=["moonshot-v1-auto", "moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    ),
    ProviderPreset(
        key="zhipuai",
        name="智谱 AI",
        base_url="https://open.bigmodel.cn/api/paas/v4",
        env_key="ZHIPU_API_KEY",
        builtin_models=["glm-4-plus", "glm-4-flash", "glm-4.5-flash"],
    ),
    ProviderPreset(
        key="siliconflow",
        name="SiliconFlow",
        base_url="https://api.siliconflow.cn/v1",
        env_key="SILICONFLOW_API_KEY",
        builtin_models=[
            "deepseek-ai/DeepSeek-V3",
            "deepseek-ai/DeepSeek-R1",
            "Qwen/Qwen3-235B-A22B",
            "Qwen/Qwen2.5-72B-Instruct",
        ],
    ),
    ProviderPreset(
        key="minimax",
        name="MiniMax",
        base_url="https://api.minimax.chat/v1",
        env_key="MINIMAX_API_KEY",
        builtin_models=["MiniMax-M2.7", "MiniMax-M2.5"],
    ),
]

_PROVIDER_MAP = {p.key: p for p in _PROVIDER_PRESETS}


def list_provider_presets() -> list[ProviderPreset]:
    return list(_PROVIDER_PRESETS)


def get_provider_preset(key: str) -> ProviderPreset | None:
    return _PROVIDER_MAP.get(key)
