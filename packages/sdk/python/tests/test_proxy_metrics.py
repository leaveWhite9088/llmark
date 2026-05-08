import json
import unittest

from llmark.proxy.metrics import ProxyMetrics, update_metrics_from_json_response, update_metrics_from_sse_line


class ProxyMetricsTests(unittest.TestCase):
    def test_update_metrics_from_sse_line(self) -> None:
        metrics = ProxyMetrics(provider="openai", model="gpt-4o-mini")
        line = b'data: {"choices":[{"delta":{"content":"hi"}}],"usage":{"prompt_tokens":12,"completion_tokens":3}}\n'
        self.assertTrue(update_metrics_from_sse_line(metrics, line))
        self.assertEqual(metrics.prompt_tokens, 12)
        self.assertEqual(metrics.completion_tokens, 3)

    def test_update_metrics_from_json_response(self) -> None:
        metrics = ProxyMetrics(provider="openai", model="gpt-4o-mini")
        body = json.dumps({
            "choices": [{"message": {"content": "hello"}}],
            "usage": {"prompt_tokens": 15, "completion_tokens": 5},
        }).encode("utf-8")
        self.assertTrue(update_metrics_from_json_response(metrics, body))
        self.assertEqual(metrics.prompt_tokens, 15)
        self.assertEqual(metrics.completion_tokens, 5)


if __name__ == "__main__":
    unittest.main()
