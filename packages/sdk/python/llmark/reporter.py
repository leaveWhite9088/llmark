"""Unified reporting interface for LLMark.

Benchmark, proxy, and SDK collector all dispatch metrics through Reporter,
so the transport layer can be swapped without touching multiple modules.
"""

from __future__ import annotations

import logging
import threading

from llmark.uploader import upload_async

logger = logging.getLogger("llmark.reporter")


class Reporter:
    """Asynchronous metric reporter.

    Each module is responsible for its own filtering logic (e.g. sample rate,
    unknown provider, missing usage).  Reporter only handles the actual dispatch.
    """

    def report(self, payload: dict, api_url: str) -> threading.Thread | None:
        """Dispatch *payload* to *api_url* asynchronously.

        Returns the background thread so the caller can manage its lifecycle,
        or None when *api_url* is empty.
        """
        if not api_url:
            logger.debug("Skipping report: empty api_url")
            return None
        thread = upload_async(payload, api_url)
        logger.debug(
            "Report dispatched: provider=%s model=%s",
            payload.get("provider"),
            payload.get("model"),
        )
        return thread
