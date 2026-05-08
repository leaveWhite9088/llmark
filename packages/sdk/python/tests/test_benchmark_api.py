import os
import unittest
from unittest import mock
from urllib import error as urllib_error

from llmark.benchmark.api import BenchmarkApiConfig, BenchmarkRunResult, print_api_benchmark_report, run_api_benchmark


class _FakeResponse:
    def __init__(self, lines: list[bytes], status: int = 200) -> None:
        self._lines = lines
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        return None

    def __iter__(self):
        return iter(self._lines)


class BenchmarkApiTests(unittest.TestCase):
    def test_run_api_benchmark_uploads_usage_backed_result(self) -> None:
        config = BenchmarkApiConfig(
            provider="openai",
            model="gpt-4o-mini",
            base_url="https://api.openai.com/v1",
            runs=1,
            preset="short",
            report_url="http://test.example.com",
        )
        fake_lines = [
            b'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            b'data: {"usage":{"prompt_tokens":120,"completion_tokens":32}}\n\n',
            b"data: [DONE]\n\n",
        ]
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}, clear=False):
            with mock.patch("llmark.benchmark.api.urllib_request.urlopen", return_value=_FakeResponse(fake_lines)):
                with mock.patch("llmark.reporter.upload_async") as upload_async:
                    with mock.patch("llmark.benchmark.api.get_device_id", return_value="device-1"):
                        with mock.patch("llmark.benchmark.api.time.perf_counter", side_effect=[10.0, 10.2, 11.0]):
                            results = run_api_benchmark(config)
        self.assertEqual(len(results), 1)
        result = results[0]
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.prompt_tokens, 120)
        self.assertEqual(result.completion_tokens, 32)
        self.assertEqual(result.ttft_ms, 200)
        self.assertEqual(result.total_ms, 1000)
        self.assertTrue(result.uploaded)
        payload, report_url = upload_async.call_args.args
        self.assertEqual(payload["sdk_version"], "benchmark-0.1.0")
        self.assertEqual(payload["provider"], "openai")
        self.assertEqual(payload["model"], "gpt-4o-mini")
        self.assertEqual(report_url, config.report_url)

    def test_run_api_benchmark_skips_upload_when_usage_missing(self) -> None:
        config = BenchmarkApiConfig(
            provider="openai",
            model="gpt-4o-mini",
            base_url="https://api.openai.com/v1",
            runs=1,
            preset="short",
        )
        fake_lines = [
            b'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            b"data: [DONE]\n\n",
        ]
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}, clear=False):
            with mock.patch("llmark.benchmark.api.urllib_request.urlopen", return_value=_FakeResponse(fake_lines)):
                with mock.patch("llmark.reporter.upload_async") as upload_async:
                    with mock.patch("llmark.benchmark.api.time.perf_counter", side_effect=[5.0, 5.1, 6.0]):
                        results = run_api_benchmark(config)
        self.assertEqual(results[0].upload_reason, "usage not found")
        self.assertFalse(results[0].uploaded)
        upload_async.assert_not_called()

    def test_run_api_benchmark_requires_api_key(self) -> None:
        config = BenchmarkApiConfig(
            provider="openai",
            model="gpt-4o-mini",
            base_url="https://api.openai.com/v1",
        )
        with mock.patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(RuntimeError) as ctx:
                run_api_benchmark(config)
        self.assertIn("Missing API key", str(ctx.exception))

    def test_run_api_benchmark_uses_direct_api_key(self) -> None:
        config = BenchmarkApiConfig(
            provider="openai",
            model="gpt-4o-mini",
            base_url="https://api.openai.com/v1",
            runs=1,
            preset="short",
            api_key="sk-direct",
        )
        fake_lines = [
            b'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            b'data: {"usage":{"prompt_tokens":120,"completion_tokens":32}}\n\n',
            b"data: [DONE]\n\n",
        ]
        with mock.patch.dict(os.environ, {}, clear=True):
            with mock.patch("llmark.benchmark.api.urllib_request.urlopen", return_value=_FakeResponse(fake_lines)):
                with mock.patch("llmark.reporter.upload_async"):
                    with mock.patch("llmark.benchmark.api.get_device_id", return_value="device-1"):
                        with mock.patch("llmark.benchmark.api.time.perf_counter", side_effect=[10.0, 10.2, 11.0]):
                            results = run_api_benchmark(config)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].status_code, 200)

    def test_run_api_benchmark_uses_llmark_api_key_env(self) -> None:
        config = BenchmarkApiConfig(
            provider="openai",
            model="gpt-4o-mini",
            base_url="https://api.openai.com/v1",
            runs=1,
            preset="short",
        )
        fake_lines = [
            b'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            b'data: {"usage":{"prompt_tokens":120,"completion_tokens":32}}\n\n',
            b"data: [DONE]\n\n",
        ]
        with mock.patch.dict(os.environ, {"LLMARK_API_KEY": "sk-llmark"}, clear=True):
            with mock.patch("llmark.benchmark.api.urllib_request.urlopen", return_value=_FakeResponse(fake_lines)):
                with mock.patch("llmark.reporter.upload_async"):
                    with mock.patch("llmark.benchmark.api.get_device_id", return_value="device-1"):
                        with mock.patch("llmark.benchmark.api.time.perf_counter", side_effect=[10.0, 10.2, 11.0]):
                            results = run_api_benchmark(config)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].status_code, 200)

    def test_run_api_benchmark_handles_http_error(self) -> None:
        config = BenchmarkApiConfig(
            provider="openai",
            model="gpt-4o-mini",
            base_url="https://api.openai.com/v1",
            runs=1,
            preset="short",
        )
        error = urllib_error.HTTPError(
            url="https://api.openai.com/v1/chat/completions",
            code=429,
            msg="Too Many Requests",
            hdrs={},
            fp=None,
        )
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}, clear=False):
            with mock.patch("llmark.benchmark.api.urllib_request.urlopen", side_effect=error):
                results = run_api_benchmark(config)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].status_code, 429)
        self.assertFalse(results[0].uploaded)
        self.assertIn("HTTP 429", results[0].upload_reason)

    def test_run_api_benchmark_handles_url_error(self) -> None:
        config = BenchmarkApiConfig(
            provider="openai",
            model="gpt-4o-mini",
            base_url="https://api.openai.com/v1",
            runs=1,
            preset="short",
        )
        error = urllib_error.URLError("Connection refused")
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}, clear=False):
            with mock.patch("llmark.benchmark.api.urllib_request.urlopen", side_effect=error):
                results = run_api_benchmark(config)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].status_code, 0)
        self.assertFalse(results[0].uploaded)
        self.assertIn("Network error", results[0].upload_reason)


    def test_run_api_benchmark_multiple_runs(self) -> None:
        config = BenchmarkApiConfig(
            provider="openai",
            model="gpt-4o-mini",
            base_url="https://api.openai.com/v1",
            runs=3,
            preset="short",
        )
        fake_lines = [
            b'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            b'data: {"usage":{"prompt_tokens":120,"completion_tokens":32}}\n\n',
            b"data: [DONE]\n\n",
        ]
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}, clear=False):
            with mock.patch("llmark.benchmark.api.urllib_request.urlopen", return_value=_FakeResponse(fake_lines)):
                with mock.patch("llmark.reporter.upload_async"):
                    with mock.patch("llmark.benchmark.api.get_device_id", return_value="device-1"):
                        with mock.patch("llmark.benchmark.api.time.perf_counter", side_effect=[1.0, 1.2, 2.0, 3.0, 3.2, 4.0, 5.0, 5.2, 6.0]):
                            results = run_api_benchmark(config)
        self.assertEqual(len(results), 3)
        for i, result in enumerate(results, start=1):
            self.assertEqual(result.run_index, i)
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result.prompt_tokens, 120)
            self.assertEqual(result.completion_tokens, 32)

    def test_run_api_benchmark_sample_rate_filters(self) -> None:
        config = BenchmarkApiConfig(
            provider="openai",
            model="gpt-4o-mini",
            base_url="https://api.openai.com/v1",
            runs=1,
            preset="short",
            sample_rate=0.0,
        )
        fake_lines = [
            b'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            b'data: {"usage":{"prompt_tokens":120,"completion_tokens":32}}\n\n',
            b"data: [DONE]\n\n",
        ]
        with mock.patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test"}, clear=False):
            with mock.patch("llmark.benchmark.api.urllib_request.urlopen", return_value=_FakeResponse(fake_lines)):
                with mock.patch("llmark.reporter.upload_async") as upload_async:
                    with mock.patch("llmark.benchmark.api.get_device_id", return_value="device-1"):
                        with mock.patch("llmark.benchmark.api.time.perf_counter", side_effect=[10.0, 10.2, 11.0]):
                            with mock.patch("llmark.benchmark.api.random.random", return_value=0.5):
                                results = run_api_benchmark(config)
        self.assertEqual(len(results), 1)
        self.assertFalse(results[0].uploaded)
        self.assertEqual(results[0].upload_reason, "sampled out")
        upload_async.assert_not_called()

    def test_print_api_benchmark_report_format(self) -> None:
        config = BenchmarkApiConfig(
            provider="openai",
            model="gpt-4o-mini",
            base_url="https://api.openai.com/v1",
            runs=2,
            preset="medium",
        )
        results = [
            BenchmarkRunResult(
                run_index=1, ttft_ms=200, total_ms=1000,
                prompt_tokens=100, completion_tokens=50,
                uploaded=True, upload_reason=None, status_code=200,
            ),
            BenchmarkRunResult(
                run_index=2, ttft_ms=300, total_ms=1200,
                prompt_tokens=110, completion_tokens=60,
                uploaded=False, upload_reason="usage not found", status_code=200,
            ),
        ]
        from io import StringIO
        captured = StringIO()
        with mock.patch("sys.stdout", new=captured):
            print_api_benchmark_report(config, results)
        output = captured.getvalue()
        self.assertIn("LLMark API Benchmark", output)
        self.assertIn("Provider: openai", output)
        self.assertIn("Model: gpt-4o-mini", output)
        self.assertIn("Preset: medium", output)
        self.assertIn("Run 1: status=200", output)
        self.assertIn("Run 2: status=200", output)
        self.assertIn("uploaded=yes", output)
        self.assertIn("uploaded=no (usage not found)", output)
        self.assertIn("Success/Total: 2/2", output)
        self.assertIn("Average TTFT (ms): 250.0", output)
        self.assertIn("Average Total (ms): 1100.0", output)
        self.assertIn("Uploaded runs: 1/2", output)

    def test_print_api_benchmark_report_with_errors(self) -> None:
        config = BenchmarkApiConfig(
            provider="openai",
            model="gpt-4o-mini",
            base_url="https://api.openai.com/v1",
            runs=2,
            preset="short",
        )
        results = [
            BenchmarkRunResult(
                run_index=1, ttft_ms=200, total_ms=1000,
                prompt_tokens=100, completion_tokens=50,
                uploaded=True, upload_reason=None, status_code=200,
            ),
            BenchmarkRunResult(
                run_index=2, ttft_ms=None, total_ms=None,
                prompt_tokens=None, completion_tokens=None,
                uploaded=False, upload_reason="HTTP 429", status_code=429,
            ),
        ]
        from io import StringIO
        captured = StringIO()
        with mock.patch("sys.stdout", new=captured):
            print_api_benchmark_report(config, results)
        output = captured.getvalue()
        self.assertIn("Run 1: status=200", output)
        self.assertIn("Run 2: status=429 error=HTTP 429", output)
        self.assertIn("Success/Total: 1/2", output)
        self.assertIn("Average TTFT (ms): 200.0", output)
        self.assertIn("Uploaded runs: 1/2", output)


if __name__ == "__main__":
    unittest.main()
