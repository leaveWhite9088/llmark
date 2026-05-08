import json
import os
import tempfile
import unittest
from unittest import mock

from llmark.benchmark.interactive.config_store import (
    _load_raw,
    _save_raw,
    get_last_used,
    get_profile,
    list_profiles,
    save_profile,
)
from llmark.benchmark.models import fetch_models, get_model_choices
from llmark.benchmark.providers import (
    get_provider_preset,
    list_provider_presets,
)
from llmark.benchmark.interactive.wizard import WizardConfig


class ProviderPresetTests(unittest.TestCase):
    def test_list_presets_not_empty(self) -> None:
        presets = list_provider_presets()
        self.assertGreater(len(presets), 0)
        keys = [p.key for p in presets]
        self.assertIn("openai", keys)
        self.assertIn("deepseek", keys)

    def test_get_provider_preset_exists(self) -> None:
        p = get_provider_preset("openai")
        self.assertIsNotNone(p)
        assert p is not None
        self.assertEqual(p.base_url, "https://api.openai.com/v1")
        self.assertEqual(p.env_key, "OPENAI_API_KEY")
        self.assertIn("gpt-4o-mini", p.builtin_models)

    def test_get_provider_preset_missing(self) -> None:
        self.assertIsNone(get_provider_preset("nonexistent"))


class ModelFetchTests(unittest.TestCase):
    def test_fetch_models_returns_none_on_failure(self) -> None:
        result = fetch_models("http://127.0.0.1:1", "fake-key")
        self.assertIsNone(result)

    def test_get_model_choices_fallback_to_builtin(self) -> None:
        models = get_model_choices("openai", "http://127.0.0.1:1", "fake-key")
        self.assertIn("gpt-4o-mini", models)


class ConfigStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory()
        from pathlib import Path
        self.patch_dir = mock.patch(
            "llmark.benchmark.interactive.config_store._CONFIG_DIR",
            Path(os.path.join(self.tmpdir.name, "llmark")),
        )
        self.patch_file = mock.patch(
            "llmark.benchmark.interactive.config_store._PROFILES_FILE",
            Path(os.path.join(self.tmpdir.name, "llmark", "profiles.json")),
        )
        self.patch_dir.start()
        self.patch_file.start()

    def tearDown(self) -> None:
        self.patch_file.stop()
        self.patch_dir.stop()
        self.tmpdir.cleanup()

    def test_save_and_load_profile(self) -> None:
        save_profile("test-profile", {
            "provider": "openai",
            "base_url": "https://api.openai.com/v1",
            "env_key": "OPENAI_API_KEY",
            "models": ["gpt-4o-mini"],
            "preset": "medium",
            "runs": 3,
            "sample_rate": 1.0,
            "timeout": 120,
        })
        profiles = list_profiles()
        self.assertEqual(len(profiles), 1)
        self.assertEqual(profiles[0]["name"], "test-profile")
        self.assertEqual(profiles[0]["provider"], "openai")

    def test_get_profile(self) -> None:
        save_profile("test-profile", {"provider": "openai", "base_url": "", "env_key": "", "models": []})
        p = get_profile("test-profile")
        self.assertIsNotNone(p)
        assert p is not None
        self.assertEqual(p["provider"], "openai")

    def test_get_last_used(self) -> None:
        save_profile("last-one", {"provider": "deepseek", "base_url": "", "env_key": "", "models": []})
        last = get_last_used()
        self.assertIsNotNone(last)
        assert last is not None
        self.assertEqual(last["name"], "last-one")

    def test_api_key_not_stored(self) -> None:
        save_profile("secret", {
            "provider": "openai",
            "base_url": "",
            "env_key": "",
            "models": [],
            "api_key": "sk-secret",
        })
        raw = _load_raw()
        profile = raw["profiles"][0]
        self.assertNotIn("api_key", profile)


class WizardTests(unittest.TestCase):
    def test_wizard_config_dataclass(self) -> None:
        cfg = WizardConfig(
            provider="openai",
            base_url="https://api.openai.com/v1",
            api_key="sk-test",
            models=["gpt-4o-mini"],
            preset="medium",
            runs=3,
            sample_rate=1.0,
            timeout=120,
            report_url="http://test.example.com",
            token=None,
            env_key="OPENAI_API_KEY",
        )
        self.assertEqual(cfg.provider, "openai")
        self.assertEqual(cfg.models, ["gpt-4o-mini"])


if __name__ == "__main__":
    unittest.main()
