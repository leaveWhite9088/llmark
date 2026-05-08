"""LLMark 通用工具函数。"""

from __future__ import annotations

import json
from pathlib import Path


def read_json_field(file_path: Path, field: str, default=None):
    """从 JSON 文件中读取指定字段。

    文件不存在、解析失败、字段不存在时返回 default。
    """
    try:
        if file_path.exists():
            data = json.loads(file_path.read_text(encoding="utf-8"))
            value = data.get(field)
            if isinstance(value, str) and value:
                return value
    except Exception:
        pass
    return default
