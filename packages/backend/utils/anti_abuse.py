import asyncio
import logging
import time
from collections import defaultdict

logger = logging.getLogger("llmark.anti_abuse")


DEVICE_LIMIT = 60
WINDOW_SECONDS = 60
_cleanup_counter = 0
_cleanup_threshold = 100  # 每检查100次执行一次清理，防止低流量场景下过期数据滞留
_device_lock = asyncio.Lock()
_device_windows: dict[str, list[float]] = defaultdict(list)


def _do_cleanup_expired_windows(now: float) -> None:
    """清理所有过期的设备窗口数据，防止内存泄漏。

    调用方必须持有 _device_lock。
    """
    expired_keys = []
    for device_id, timestamps in _device_windows.items():
        valid_ts = [ts for ts in timestamps if now - ts < WINDOW_SECONDS]
        if valid_ts:
            _device_windows[device_id] = valid_ts
        else:
            expired_keys.append(device_id)
    for key in expired_keys:
        del _device_windows[key]


async def check_device_rate_limit(device_id: str) -> bool:
    global _cleanup_counter

    now = time.time()

    async with _device_lock:
        window = [ts for ts in _device_windows[device_id] if now - ts < WINDOW_SECONDS]

        if len(window) >= DEVICE_LIMIT:
            _device_windows[device_id] = window
            logger.warning("Device rate limit exceeded: %s", device_id)
            return False

        window.append(now)
        _device_windows[device_id] = window

        _cleanup_counter += 1
        should_cleanup = _cleanup_counter >= _cleanup_threshold
        if should_cleanup:
            _cleanup_counter = 0

    if should_cleanup:
        async with _device_lock:
            _do_cleanup_expired_windows(now)

    return True


def get_device_limiter_stats() -> dict[str, int]:
    """返回当前设备限流器的内存统计，用于监控。"""
    return {
        "tracked_devices": len(_device_windows),
        "total_timestamps": sum(len(ts) for ts in _device_windows.values()),
    }
