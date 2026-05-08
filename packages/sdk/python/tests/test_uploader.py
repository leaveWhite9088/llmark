import json
import unittest
from unittest import mock

from llmark.config import DEFAULT_API_URL
from llmark.uploader import _do_upload


class UploaderTests(unittest.TestCase):
    def test_upload_serializes_payload(self) -> None:
        payload = {"provider": "openai", "token": None, "model": "gpt-4o-mini"}
        response = mock.MagicMock()
        response.__enter__.return_value = response
        response.__exit__.return_value = False

        with mock.patch("llmark.uploader.urllib_request.urlopen", return_value=response) as urlopen:
            _do_upload(payload, DEFAULT_API_URL)

        req = urlopen.call_args.args[0]
        body = json.loads(req.data.decode("utf-8"))
        self.assertEqual(body, {"provider": "openai", "model": "gpt-4o-mini"})
        self.assertEqual(req.full_url, DEFAULT_API_URL)


if __name__ == "__main__":
    unittest.main()
