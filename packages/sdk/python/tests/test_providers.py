import unittest

from llmark.core.providers import identify_provider


class ProviderTests(unittest.TestCase):
    def test_identify_provider(self) -> None:
        self.assertEqual(identify_provider("https://api.deepseek.com"), "deepseek")
        self.assertEqual(identify_provider("https://api.siliconflow.cn/v1"), "siliconflow")
        self.assertEqual(identify_provider(""), "openai")
        self.assertEqual(identify_provider("https://example.com"), "unknown")


if __name__ == "__main__":
    unittest.main()
