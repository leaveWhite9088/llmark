"""LLMark SDK 配置管理模块。

集中管理 LLMark Python SDK 的所有配置逻辑，包括：

    - 加载 ``.env`` 和 ``.env.local`` 文件（纯标准库实现，零外部依赖）
    - 从环境变量中解析布尔值、浮点数、字符串等类型
    - 通过分层优先级系统解析最终配置
    - 存储和读取运行时配置状态

配置优先级（从高到低）：
    1. 用户显式传入 ``llmark.init()`` 的参数
    2. 操作系统环境变量（``os.environ``）
    3. 项目目录树中的 ``.env.local`` / ``.env`` 文件
    4. SDK 内置默认值

所有 LLMark 专属环境变量均使用 ``LLMARK_`` 前缀。
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from platformdirs import user_config_dir

# =============================================================================
# 常量
# =============================================================================

DEFAULT_API_URL: str = "http://192.168.5.224:8011/v1/report"
"""默认的 LLMark 数据上报接口地址。"""

DEFAULT_AUTH_BASE_URL: str = "http://192.168.5.224:8011"
"""默认的 LLMark 认证服务基础地址。"""

DEFAULT_PROXY_HOST: str = "127.0.0.1"
"""本地代理默认绑定地址。"""

DEFAULT_PROXY_PORT: int = 8787
"""本地代理默认端口。"""

CHAT_COMPLETIONS_PATH: str = "/v1/chat/completions"
"""OpenAI 兼容接口的 chat completions 路径。"""

_SDK_ENV_PREFIX: str = "LLMARK_"
"""LLMark 专属环境变量的前缀，用于过滤和命名空间隔离。"""

_DEFAULT_MAX_SEARCH_DEPTH: int = 8
"""向上搜索 ``.env`` 文件时的最大目录层级，防止在文件系统根目录附近无限循环。"""

_GLOBAL_CONFIG_DIR: Path = Path(user_config_dir("llmark", appauthor=False))
"""全局配置目录，pip 安装后跨目录可用。"""

_GLOBAL_ENV_FILE: Path = _GLOBAL_CONFIG_DIR / "config.env"
"""全局环境变量配置文件路径。"""


# =============================================================================
# .env 文件加载
# =============================================================================

def _find_env_files(start_dir: str | None = None, max_depth: int = _DEFAULT_MAX_SEARCH_DEPTH) -> list[Path]:
    """从起始目录向上搜索 ``.env`` 和 ``.env.local`` 文件。

    从 *start_dir*（默认当前工作目录）开始，逐层遍历父目录，
    在每个目录中查找 ``.env.local`` 和 ``.env``。

    同一目录内 ``.env.local`` 排在 ``.env`` 前面，符合常见约定：
    ``.env.local`` 是用户级配置（通常被 gitignore），优先级高于共享的 ``.env``。

    参数:
        start_dir: 搜索起始目录，默认 ``os.getcwd()``。
        max_depth: 最大向上遍历层数，到达文件系统根目录时会自动停止。

    返回:
        按搜索顺序排列的文件路径列表。
    """
    root = Path(start_dir or os.getcwd()).resolve()
    paths: list[Path] = []

    current = root
    for _ in range(max_depth):
        for filename in (".env.local", ".env"):
            candidate = current / filename
            if candidate.is_file():
                paths.append(candidate)
        parent = current.parent
        if parent == current:
            break
        current = parent

    return paths


def _parse_env_line(line: str) -> tuple[str, str] | None:
    """解析 ``.env`` 文件中的单行文本，提取键值对。

    空行、注释行（以 ``#`` 开头）、不含 ``=`` 的行都会被忽略。
    值两侧成对的引号（``"..."`` 或 ``'...'``）会被自动去除。

    参数:
        line: 从 ``.env`` 文件中读取的原始文本行。

    返回:
        解析后的 ``(key, value)`` 元组；如果该行应被跳过，则返回 ``None``。
    """
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        return None
    if "=" not in stripped:
        return None

    key, raw_value = stripped.split("=", 1)
    key = key.strip()
    value = raw_value.strip()

    # 去除值两侧成对的引号
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
        value = value[1:-1]

    return key, value


def load_dotenv(
    *,
    prefix: str | None = _SDK_ENV_PREFIX,
    start_dir: str | None = None,
) -> None:
    """将 ``.env`` 文件中的变量加载到 ``os.environ``。

    加载顺序（优先级从高到低）：
        1. 项目目录树中的 ``.env.local`` / ``.env``
        2. 全局配置文件 ``~/.config/llmark/config.env``（pip 安装后跨目录可用）

    使用 ``os.environ.setdefault`` 写入，即**不会覆盖**已存在的环境变量。

    当传入 *prefix*（默认 ``"LLMARK_"``）时，仅加载名称以该前缀开头的变量。
    传入 ``prefix=None`` 可加载全部变量（CLI 工具需要加载厂商 API Key 时使用）。

    参数:
        prefix: 变量名前缀过滤器；``None`` 表示加载所有变量。
        start_dir: 搜索起始目录，默认当前工作目录。
    """
    # 1. 加载项目级 .env 文件
    for filepath in _find_env_files(start_dir):
        try:
            with open(filepath, "r", encoding="utf-8") as fh:
                for line in fh:
                    parsed = _parse_env_line(line)
                    if parsed is None:
                        continue
                    key, value = parsed
                    if prefix is None or key.startswith(prefix):
                        os.environ.setdefault(key, value)
        except Exception:
            pass

    # 2. 加载全局配置文件（pip 安装后跨目录可用）
    if _GLOBAL_ENV_FILE.is_file():
        try:
            with open(_GLOBAL_ENV_FILE, "r", encoding="utf-8") as fh:
                for line in fh:
                    parsed = _parse_env_line(line)
                    if parsed is None:
                        continue
                    key, value = parsed
                    if prefix is None or key.startswith(prefix):
                        os.environ.setdefault(key, value)
        except Exception:
            pass


# =============================================================================
# 类型化的环境变量解析器
# =============================================================================

def _parse_bool(raw: str, default: bool) -> bool:
    """将字符串解析为布尔值。

    真值: ``"true"``, ``"1"``, ``"yes"``, ``"on"``
    假值: ``"false"``, ``"0"``, ``"no"``, ``"off"``
    其他值回退到 *default*。
    """
    lowered = raw.strip().lower()
    if lowered in ("true", "1", "yes", "on"):
        return True
    if lowered in ("false", "0", "no", "off"):
        return False
    return default


def _parse_float(raw: str, default: float, min_val: float, max_val: float) -> float:
    """将字符串解析为浮点数，并钳制到 ``[min_val, max_val]`` 区间。

    解析失败时返回 *default*。
    """
    try:
        value = float(raw.strip())
    except (ValueError, TypeError):
        return default
    return max(min_val, min(value, max_val))


def _env_str(name: str, default: str = "") -> str:
    """读取字符串类型的环境变量。

    变量未设置或去除首尾空白后为空时，返回 *default*。
    """
    return os.environ.get(name, default).strip()


def _env_bool(name: str, default: bool = False) -> bool:
    """读取布尔类型的环境变量。"""
    return _parse_bool(os.environ.get(name, ""), default)


def _env_float(
    name: str, default: float, min_val: float = 0.0, max_val: float = 1.0
) -> float:
    """读取浮点数类型的环境变量，结果钳制在 ``[min_val, max_val]`` 区间。"""
    return _parse_float(os.environ.get(name, ""), default, min_val, max_val)


# =============================================================================
# 配置数据类
# =============================================================================

@dataclass(frozen=True)
class InitOptions:
    """``llmark.init()`` 的解析后选项。

    这些值是显式参数、环境变量、``.env`` 文件和 SDK 默认值合并后的最终结果。
    """

    enabled: bool
    """是否启用数据上报。"""

    sample_rate: float
    """请求采样率，范围 ``[0.0, 1.0]``。"""

    api_url: str
    """LLMark 上报接口的完整 URL。"""

    debug: bool
    """为 ``True`` 时向控制台输出 DEBUG 级别日志。"""

    log_to_file: bool
    """为 ``True`` 时将日志持久化到平台标准日志目录。"""

    log_dir: str | None
    """自定义日志目录，``None`` 表示使用平台默认值。"""


@dataclass
class RuntimeConfig:
    """``llmark.init()`` 成功后存储的内部运行时配置。

    包含 SDK 的 monkey-patch 和上报模块在运行期间所需的全部信息，
    例如用户 token 和设备标识符。
    """

    token: str | None
    """可选的 LLMark 用户 token，用于认证上报。"""

    enabled: bool
    """与 ``InitOptions.enabled`` 一致，便于运行时快速访问。"""

    sample_rate: float
    """与 ``InitOptions.sample_rate`` 一致。"""

    api_url: str
    """与 ``InitOptions.api_url`` 一致。"""

    device_id: str
    """当前机器/安装实例的唯一标识符。"""


# =============================================================================
# 配置解析
# =============================================================================

def resolve_options(
    enabled: bool | None = None,
    sample_rate: float | None = None,
    api_url: str | None = None,
    debug: bool | None = None,
    log_to_file: bool | None = None,
    log_dir: str | None = None,
) -> InitOptions:
    """按照分层优先级系统解析出最终的 ``InitOptions``。

    在读取任何环境变量之前，本函数会先调用 :func:`load_dotenv`，
    确保 ``.env`` / ``.env.local`` 中的值已经注入到 ``os.environ``。

    每个字段的解析顺序为：
        1. 显式参数（非 ``None``）
        2. 对应的 ``LLMARK_*`` 环境变量
        3. SDK 内置默认值

    参数:
        enabled: 覆盖默认的启用状态。
        sample_rate: 覆盖默认采样率。
        api_url: 覆盖默认上报地址。
        debug: 覆盖默认的 DEBUG 日志开关。
        log_to_file: 覆盖默认的文件日志开关。
        log_dir: 覆盖默认的日志目录。

    返回:
        冻结的 :class:`InitOptions` 实例，可直接使用。
    """
    load_dotenv()  # 确保 .env 文件已加载到 os.environ 后再读取

    return InitOptions(
        enabled=enabled if enabled is not None else _env_bool("LLMARK_ENABLED", True),
        sample_rate=sample_rate
        if sample_rate is not None
        else _env_float("LLMARK_SAMPLE_RATE", 0.3, 0.0, 1.0),
        api_url=api_url if api_url is not None else _env_str("LLMARK_API_URL", DEFAULT_API_URL),
        debug=debug if debug is not None else _env_bool("LLMARK_DEBUG", False),
        log_to_file=log_to_file
        if log_to_file is not None
        else _env_bool("LLMARK_LOG_FILE", False),
        log_dir=log_dir if log_dir is not None else (_env_str("LLMARK_LOG_DIR") or None),
    )


# =============================================================================
# 全局运行时状态
# =============================================================================

_runtime_config: RuntimeConfig | None = None
"""模块级单例，保存当前激活的 :class:`RuntimeConfig` 实例。"""


def set_config(config: RuntimeConfig) -> None:
    """将 *config* 设为当前激活的运行时配置。"""
    global _runtime_config
    _runtime_config = config


def get_config() -> RuntimeConfig | None:
    """获取当前激活的运行时配置；若尚未初始化则返回 ``None``。"""
    return _runtime_config


# =============================================================================
# 便捷辅助函数
# =============================================================================

def get_report_url() -> str:
    """返回上报接口地址。

    优先读取环境变量 ``LLMARK_API_URL``，不存在时回退到 :data:`DEFAULT_API_URL`。
    """
    return _env_str("LLMARK_API_URL", DEFAULT_API_URL)


def get_auth_base_url() -> str:
    """返回认证服务基础地址。

    优先读取环境变量 ``LLMARK_AUTH_BASE_URL``，不存在时回退到 :data:`DEFAULT_AUTH_BASE_URL`。
    """
    return _env_str("LLMARK_AUTH_BASE_URL", DEFAULT_AUTH_BASE_URL)


def save_env_var(key: str, value: str) -> Path | None:
    """将键值对写入全局配置文件 ``~/.config/llmark/config.env``。

    pip 安装后，全局配置文件在任何目录下都可用，解决了换目录后
    找不到 ``.env.local`` 的问题。

    如果环境变量已存在、或全局配置文件中已存在同名变量，则不覆盖。
    文件不存在时会自动创建。

    参数:
        key: 环境变量名。
        value: 环境变量值。

    返回:
        写入的文件路径；如果变量已存在则返回 ``None``。
    """
    # 如果环境变量已存在，不覆盖
    if os.environ.get(key):
        return None

    _GLOBAL_CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    # 检查全局配置文件中是否已有该变量
    if _GLOBAL_ENV_FILE.is_file():
        try:
            with open(_GLOBAL_ENV_FILE, "r", encoding="utf-8") as fh:
                for line in fh:
                    parsed = _parse_env_line(line)
                    if parsed and parsed[0] == key:
                        return None
        except Exception:
            pass

    # 追加写入全局配置文件
    try:
        with open(_GLOBAL_ENV_FILE, "a", encoding="utf-8") as fh:
            if fh.tell() > 0:
                fh.write("\n")
            fh.write(f"{key}={value}\n")
        os.environ.setdefault(key, value)
        return _GLOBAL_ENV_FILE
    except Exception:
        return None
