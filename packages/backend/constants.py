"""
共享常量定义

集中管理在整个后端中使用的常量，避免重复定义。
"""

# 时间范围映射（用于路由查询参数到 SQL 间隔）
INTERVAL_MAP = {
    "24h": "24 hours",
    "7d": "7 days",
    "30d": "30 days",
}

# 扩展时间范围映射（用于个人中心等需要更长时间范围的接口）
EXTENDED_INTERVAL_MAP = {
    "24h": "24 hours",
    "7d": "7 days",
    "30d": "30 days",
    "90d": "90 days",
    "180d": "180 days",
}

# 输入长度分桶配置
INPUT_LENGTH_BUCKET_META = [
    {
        "key": "short",
        "label": "短文本",
        "min_tokens": 0,
        "max_tokens": 4096,
        "description": "<= 4k tokens",
    },
    {
        "key": "medium",
        "label": "中文本",
        "min_tokens": 4097,
        "max_tokens": 16384,
        "description": "4k ~ 16k tokens",
    },
    {
        "key": "long",
        "label": "长文本",
        "min_tokens": 16385,
        "max_tokens": None,
        "description": "> 16k tokens",
    },
]

# 输入长度分桶值
INPUT_LENGTH_BUCKET_VALUES = ("short", "medium", "long")

# 提供商显示名称映射
PROVIDER_DISPLAY_NAMES = {
    "aliyun": "Alibaba Cloud",
    "anthropic": "Anthropic",
    "azure": "Azure",
    "baidu": "Baidu",
    "bytedance": "ByteDance",
    "cohere": "Cohere",
    "deepseek": "DeepSeek",
    "google": "Google",
    "minimax": "MiniMax",
    "mistral": "Mistral",
    "moonshot": "Moonshot",
    "openai": "OpenAI",
    "siliconflow": "SiliconFlow",
    "tencent": "Tencent",
    "zhipuai": "Zhipu AI",
}

# 日期时间解析格式
DATETIME_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M:%S.%f",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%dT%H:%M:%S.%f",
)

# 趋势图时间分桶单位
BUCKET_UNIT = {
    "24h": "hour",
    "7d": "hour",
    "30d": "day",
}

# GitHub OAuth URL
GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"

# 数据质量阈值
DATA_QUALITY_THRESHOLD = 10
