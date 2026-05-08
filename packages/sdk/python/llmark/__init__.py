"""LLMark Python SDK."""

import logging

from llmark.config import RuntimeConfig, set_config, resolve_options
from llmark.device import get_device_id
from llmark.core.patcher import apply_patches
from llmark.log_config import setup_logging

__version__ = "0.1.0"
__all__ = ["init"]


def init(
    token: str | None = None,
    enabled: bool | None = None,
    sample_rate: float | None = None,
    api_url: str | None = None,
    *,
    debug: bool | None = None,
    log_to_file: bool | None = None,
    log_dir: str | None = None,
) -> None:
    """Initialize LLMark and patch supported SDKs in place.

    Priority: explicit argument > environment variable > .env file > default value.

    Supported environment variables (all prefixed with LLMARK_):
        LLMARK_ENABLED      - "true" | "false"  (default: true)
        LLMARK_API_URL      - Report endpoint URL
        LLMARK_SAMPLE_RATE  - Sampling rate 0.0~1.0 (default: 0.3)
        LLMARK_DEBUG        - "true" | "false"  (default: false)
        LLMARK_LOG_FILE     - "true" | "false"  (default: false)
        LLMARK_LOG_DIR      - Custom log directory

    Args:
        token: Optional LLMark user token.
        enabled: Whether to enable reporting.
        sample_rate: Report sampling rate (0.0-1.0).
        api_url: LLMark report endpoint URL.
        debug: Enable DEBUG-level console logging.
        log_to_file: Also write logs to the platform log directory.
        log_dir: Custom directory for log files.
    """
    resolved = resolve_options(
        enabled=enabled,
        sample_rate=sample_rate,
        api_url=api_url,
        debug=debug,
        log_to_file=log_to_file,
        log_dir=log_dir,
    )

    # Configure logging first so SDK internal logs are visible
    level = logging.DEBUG if resolved.debug else logging.INFO
    setup_logging(level=level, log_to_file=resolved.log_to_file, log_dir=resolved.log_dir)

    if not resolved.enabled:
        logging.getLogger("llmark").info("LLMark is disabled (LLMARK_ENABLED=false or enabled=False)")
        return

    config = RuntimeConfig(
        token=token,
        enabled=resolved.enabled,
        sample_rate=max(0.0, min(1.0, resolved.sample_rate)),
        api_url=resolved.api_url,
        device_id=get_device_id(),
    )
    set_config(config)
    apply_patches(config)
    logging.getLogger("llmark").info(
        "LLMark initialized: api_url=%s sample_rate=%.2f",
        resolved.api_url,
        resolved.sample_rate,
    )
