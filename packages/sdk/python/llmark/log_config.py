"""LLMark SDK unified logging configuration."""

from __future__ import annotations

import logging
import os
from datetime import datetime

from platformdirs import user_log_dir

_LOGGED_SETUP = False


def setup_logging(
    *,
    level: int = logging.WARNING,
    log_to_file: bool = False,
    log_dir: str | None = None,
) -> None:
    """Configure LLMark SDK loggers.

    Non-intrusive: by default only WARNING+ goes to stderr.
    Pass ``debug=True`` to llmark.init() to enable INFO/DEBUG output.
    Pass ``log_to_file=True`` to also persist logs under the platform log dir.
    """
    global _LOGGED_SETUP

    logger = logging.getLogger("llmark")
    logger.setLevel(level)

    # Avoid duplicate handlers across multiple init() calls
    if logger.handlers:
        for h in logger.handlers:
            h.setLevel(level)
        _LOGGED_SETUP = True
        return

    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler – always present, respects level
    console = logging.StreamHandler()
    console.setLevel(level)
    console.setFormatter(fmt)
    logger.addHandler(console)

    # Optional file handler – daily rotation by filename
    if log_to_file:
        if log_dir is None:
            log_dir = user_log_dir("llmark", appauthor=False)
        os.makedirs(log_dir, exist_ok=True)

        day = datetime.now().strftime("%Y%m%d")
        log_path = os.path.join(log_dir, f"llmark-{day}.log")
        file_handler = logging.FileHandler(log_path, encoding="utf-8")
        file_handler.setLevel(level)
        file_handler.setFormatter(fmt)
        logger.addHandler(file_handler)

    # Propagate to root so users can also capture via their own logging.yaml
    logger.propagate = False

    _LOGGED_SETUP = True
