"""SDK core: auto-collection patches for OpenAI, Anthropic, and Google SDKs."""

from llmark.core.collector import make_anthropic_wrapper, make_google_wrapper, make_openai_wrapper
from llmark.core.patcher import apply_patches
from llmark.core.providers import identify_provider

__all__ = [
    "apply_patches",
    "identify_provider",
    "make_openai_wrapper",
    "make_anthropic_wrapper",
    "make_google_wrapper",
]
