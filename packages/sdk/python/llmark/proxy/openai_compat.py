"""OpenAI-compatible proxy constants."""

from llmark.config import CHAT_COMPLETIONS_PATH


def is_chat_completions_path(path: str) -> bool:
    return path == CHAT_COMPLETIONS_PATH or path.endswith("/chat/completions")
