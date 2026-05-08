"""Local config persistence for interactive benchmark profiles."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path

from platformdirs import user_config_dir

logger = logging.getLogger("llmark.benchmark.interactive")

_CONFIG_DIR = Path(user_config_dir("llmark", "llmark"))
_PROFILES_FILE = _CONFIG_DIR / "profiles.json"


def _load_raw() -> dict:
    if not _PROFILES_FILE.exists():
        return {"version": "1", "profiles": [], "last_used": None}
    try:
        with open(_PROFILES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        logger.debug("Failed to load profiles: %s", exc)
        return {"version": "1", "profiles": [], "last_used": None}


def _save_raw(data: dict) -> None:
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(_PROFILES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def save_profile(name: str, config: dict) -> None:
    """Save a profile. API key is NOT stored."""
    data = _load_raw()
    profiles = data.get("profiles", [])
    # Remove existing profile with same name
    profiles = [p for p in profiles if p.get("name") != name]
    profile = {
        "name": name,
        "provider": config.get("provider"),
        "base_url": config.get("base_url"),
        "env_key": config.get("env_key"),
        "models": config.get("models", []),
        "preset": config.get("preset", "medium"),
        "runs": config.get("runs", 3),
        "sample_rate": config.get("sample_rate", 1.0),
        "timeout": config.get("timeout", 120),
    }
    profiles.append(profile)
    data["profiles"] = profiles
    data["last_used"] = name
    _save_raw(data)


def list_profiles() -> list[dict]:
    return _load_raw().get("profiles", [])


def get_profile(name: str) -> dict | None:
    for p in list_profiles():
        if p.get("name") == name:
            return p
    return None


def get_last_used() -> dict | None:
    data = _load_raw()
    name = data.get("last_used")
    if name:
        return get_profile(name)
    return None
