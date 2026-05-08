"""集中管理 LLMark 文件路径。"""

from pathlib import Path

LLMARK_DIR = Path.home() / ".llmark"
CONFIG_FILE = LLMARK_DIR / "config.json"
AUTH_FILE = LLMARK_DIR / "auth.json"
