import unittest

from llmark.proxy.privacy import should_forward_request_header, should_forward_response_header, sanitize_headers


class PrivacyTests(unittest.TestCase):
    def test_hop_by_hop_headers_blocked(self) -> None:
        for name in ("connection", "Content-Length", "Host", "Transfer-Encoding"):
            self.assertFalse(should_forward_request_header(name), f"{name} should be blocked")

    def test_proxy_indicator_headers_blocked(self) -> None:
        for name in (
            "x-forwarded-for",
            "X-Forwarded-Host",
            "x-forwarded-proto",
            "x-forwarded-port",
            "x-real-ip",
            "x-proxy-user",
            "via",
        ):
            self.assertFalse(should_forward_request_header(name), f"{name} should be blocked")

    def test_normal_headers_allowed(self) -> None:
        for name in ("authorization", "content-type", "accept", "user-agent"):
            self.assertTrue(should_forward_request_header(name), f"{name} should be allowed")

    def test_response_skip_headers_blocked(self) -> None:
        for name in ("connection", "content-length", "transfer-encoding"):
            self.assertFalse(should_forward_response_header(name), f"{name} should be blocked")

    def test_response_normal_headers_allowed(self) -> None:
        for name in ("content-type", "x-request-id"):
            self.assertTrue(should_forward_response_header(name), f"{name} should be allowed")

    def test_sanitize_headers_redacts_sensitive(self) -> None:
        raw = {
            "authorization": "Bearer sk-test",
            "x-api-key": "secret",
            "content-type": "application/json",
        }
        clean = sanitize_headers(raw)
        self.assertEqual(clean["authorization"], "<redacted>")
        self.assertEqual(clean["x-api-key"], "<redacted>")
        self.assertEqual(clean["content-type"], "application/json")


if __name__ == "__main__":
    unittest.main()
