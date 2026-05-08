"""模型名标准化与展示名格式化。

标准化规则：
- 去掉已知的组织前缀（如 Qwen/、deepseek-ai/）
- 全部转小写
- 保留平台服务前缀（如 Pro/、Lite/）

展示名规则：
- 品牌名按规则映射（deepseek → DeepSeek，gpt → GPT）
- 版本号保持原样
- 参数规模大写 B（14b → 14B）
"""

import re

# 已知组织前缀（HuggingFace 风格的组织名）
ORG_PREFIXES = {
    "deepseek-ai",
    "deepseek",
    "qwen",
    "meta-llama",
    "meta",
    "microsoft",
    "google",
    "anthropic",
    "baichuan",
    "zhipu",
    "01-ai",
    "yi",
    "alibaba",
    "tencent",
    "baidu",
    "mistralai",
    "mistral",
    "cohere",
    "nousresearch",
    "internlm",
    "chatglm",
    "bytedance-seed",
    "minimaxai",
    "paddlepaddle",
}

# 品牌名展示规则
BRAND_RULES = {
    "deepseek": "DeepSeek",
    "gpt": "GPT",
    "qwen": "Qwen",
    "llama": "LLaMA",
    "gemma": "Gemma",
    "phi": "Phi",
    "claude": "Claude",
    "mistral": "Mistral",
    "mixtral": "Mixtral",
    "minimax": "MiniMax",
    "baichuan": "Baichuan",
    "chatglm": "ChatGLM",
    "glm": "GLM",
    "yi": "Yi",
    "internlm": "InternLM",
    "codestral": "Codestral",
    "command": "Command",
    "jamba": "Jamba",
    "dbrx": "DBRX",
    "codeqwen": "CodeQwen",
}


def normalize_model_name(model: str) -> str:
    """标准化模型名：去掉组织前缀，转小写，保留平台服务前缀。"""
    model_lower = model.lower()
    parts = model_lower.split("/")

    result = []
    for part in parts:
        if part in ORG_PREFIXES:
            continue  # 去掉已知组织前缀
        result.append(part)

    return "/".join(result) if result else parts[-1]


def display_model_name(model: str) -> str:
    """将标准化后的模型名格式化为展示名。"""
    # 按 / 分割处理平台前缀和模型名
    parts = model.split("/")
    result_parts = []
    for part in parts:
        result_parts.append(_display_segment(part))
    return "/".join(result_parts)


def _display_segment(segment: str) -> str:
    """处理单个 segment（不含 /）的展示名格式化。"""
    sub_parts = segment.split("-")
    result = []
    for part in sub_parts:
        display = _format_part(part)
        result.append(display)
    return "-".join(result)


def _format_part(part: str) -> str:
    """格式化单个词段。"""
    # 尝试完整匹配品牌名
    brand_display = BRAND_RULES.get(part.lower())
    if brand_display:
        return brand_display

    # 尝试分离文本和数字（如 qwen2.5 → Qwen2.5，14b → 14B）
    match = re.match(r'^([a-zA-Z]+)([\d\.]+[a-zA-Z]*)$', part)
    if match:
        text_part, num_part = match.groups()
        brand_display = BRAND_RULES.get(text_part.lower())
        if brand_display:
            # 数字部分：如果是 b 结尾（如 14b, 8b），大写 B
            if num_part.lower().endswith('b') and len(num_part) > 1:
                num_display = num_part[:-1] + 'B'
            else:
                num_display = num_part
            return brand_display + num_display

    # 处理数字+字母（如 14b → 14B, 8b → 8B）
    match_num_suffix = re.match(r'^([\d\.]+)([a-zA-Z]+)$', part)
    if match_num_suffix:
        num_part, suffix = match_num_suffix.groups()
        # 参数规模后缀大写（b=billion, m=million）
        if suffix.lower() in {'b', 'm'}:
            return num_part + suffix.upper()
        # 其他后缀保持原样（如 4o 的 o）
        return num_part + suffix

    # 纯数字或版本号保持原样
    if re.match(r'^[\d\.]+$', part):
        return part

    # 兜底：首字母大写
    return part.capitalize()
