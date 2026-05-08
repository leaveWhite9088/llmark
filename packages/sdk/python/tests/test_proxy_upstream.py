import json
import unittest

from llmark.proxy.upstream import build_upstream_url, get_request_model, is_streaming_request, maybe_inject_stream_usage


class ProxyUpstreamTests(unittest.TestCase):
    def test_build_upstream_url_avoids_duplicate_v1(self) -> None:
        url = build_upstream_url("https://api.example.com/v1", "/v1/chat/completions", "a=1")
        self.assertEqual(url, "https://api.example.com/v1/chat/completions?a=1")

    def test_build_upstream_url_for_non_v1_base(self) -> None:
        url = build_upstream_url("https://proxy.example.com", "/v1/models")
        self.assertEqual(url, "https://proxy.example.com/v1/models")

    def test_get_request_model(self) -> None:
        body = json.dumps({"model": "gpt-4o-mini", "stream": True}).encode("utf-8")
        self.assertEqual(get_request_model(body), "gpt-4o-mini")
        self.assertTrue(is_streaming_request(body))

    def test_maybe_inject_stream_usage(self) -> None:
        body = json.dumps({"model": "gpt-4o-mini", "stream": True}).encode("utf-8")
        new_body = maybe_inject_stream_usage(body, enabled=True)
        parsed = json.loads(new_body.decode("utf-8"))
        self.assertTrue(parsed["stream_options"]["include_usage"])


if __name__ == "__main__":
    unittest.main()
