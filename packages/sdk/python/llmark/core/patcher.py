from __future__ import annotations

from typing import Any

from llmark.config import RuntimeConfig, get_config

_PATCHED_ATTR = "__llmark_patched__"


def _mark_patched(wrapper: Any) -> Any:
    setattr(wrapper, _PATCHED_ATTR, True)
    return wrapper


def _already_patched(target: Any) -> bool:
    return bool(getattr(target, _PATCHED_ATTR, False))


def apply_patches(config: RuntimeConfig | None = None) -> None:
    if config is None:
        config = get_config()
    _patch_openai(config)
    _patch_anthropic(config)
    _patch_google(config)


def _patch_openai(config: RuntimeConfig) -> None:
    try:
        import openai
        from llmark.core.collector import make_openai_wrapper

        target = openai.resources.chat.completions.Completions.create
        if _already_patched(target):
            return
        openai.resources.chat.completions.Completions.create = _mark_patched(make_openai_wrapper(target, config))
    except Exception:
        pass


def _patch_anthropic(config: RuntimeConfig) -> None:
    try:
        import anthropic
        from llmark.core.collector import make_anthropic_wrapper

        target = anthropic.resources.messages.Messages.create
        if _already_patched(target):
            return
        anthropic.resources.messages.Messages.create = _mark_patched(make_anthropic_wrapper(target, config))
    except Exception:
        pass


def _patch_google(config: RuntimeConfig) -> None:
    try:
        import google.generativeai as genai
        from llmark.core.collector import make_google_wrapper

        target = genai.GenerativeModel.generate_content
        if _already_patched(target):
            return
        genai.GenerativeModel.generate_content = _mark_patched(make_google_wrapper(target, config))
    except Exception:
        pass
