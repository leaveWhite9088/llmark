import unittest

from llmark.benchmark.presets import get_preset


class BenchmarkPresetTests(unittest.TestCase):
    def test_known_presets_exist(self) -> None:
        short_preset = get_preset("short")
        medium_preset = get_preset("medium")
        long_preset = get_preset("long")
        self.assertEqual(short_preset.name, "short")
        self.assertEqual(medium_preset.name, "medium")
        self.assertEqual(long_preset.name, "long")

    def test_prompt_sizes_increase(self) -> None:
        short_length = len(get_preset("short").user_prompt)
        medium_length = len(get_preset("medium").user_prompt)
        long_length = len(get_preset("long").user_prompt)
        self.assertLess(short_length, medium_length)
        self.assertLess(medium_length, long_length)


if __name__ == "__main__":
    unittest.main()
