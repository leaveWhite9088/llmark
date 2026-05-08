import unittest
from unittest import mock

from llmark.cli import build_parser, main


class CliTests(unittest.TestCase):
    def test_proxy_args_parse(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "proxy",
            "--provider",
            "openai",
            "--upstream",
            "https://api.openai.com/v1",
            "--port",
            "8788",
        ])
        self.assertEqual(args.command, "proxy")
        self.assertEqual(args.provider, "openai")
        self.assertEqual(args.port, 8788)

    def test_main_runs_proxy(self) -> None:
        with mock.patch("llmark.cli.main.run_proxy") as run_proxy:
            result = main([
                "proxy",
                "--provider",
                "openai",
                "--upstream",
                "https://api.openai.com/v1",
            ])
        self.assertEqual(result, 0)
        config = run_proxy.call_args.args[0]
        self.assertEqual(config.provider, "openai")
        self.assertEqual(config.port, 8787)

    def test_benchmark_api_args_parse(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "benchmark",
            "api",
            "--provider",
            "openai",
            "--model",
            "gpt-4o-mini",
            "--base-url",
            "https://api.openai.com/v1",
            "--preset",
            "long",
        ])
        self.assertEqual(args.command, "benchmark")
        self.assertEqual(args.benchmark_command, "api")
        self.assertEqual(args.provider, "openai")
        self.assertEqual(args.model, "gpt-4o-mini")
        self.assertEqual(args.preset, "long")

    def test_benchmark_api_key_args_parse(self) -> None:
        parser = build_parser()
        args = parser.parse_args([
            "benchmark",
            "api",
            "--provider",
            "openai",
            "--model",
            "gpt-4o-mini",
            "--base-url",
            "https://api.openai.com/v1",
            "--api-key",
            "sk-test-key",
        ])
        self.assertEqual(args.api_key, "sk-test-key")

    def test_main_runs_benchmark_api(self) -> None:
        with mock.patch("llmark.cli.main.run_api_benchmark", return_value=["ok"]) as run_api_benchmark:
            with mock.patch("llmark.cli.main.print_api_benchmark_report") as print_report:
                result = main([
                    "benchmark",
                    "api",
                    "--provider",
                    "openai",
                    "--model",
                    "gpt-4o-mini",
                    "--base-url",
                    "https://api.openai.com/v1",
                    "--runs",
                    "2",
                ])
        self.assertEqual(result, 0)
        config = run_api_benchmark.call_args.args[0]
        self.assertEqual(config.provider, "openai")
        self.assertEqual(config.model, "gpt-4o-mini")
        self.assertEqual(config.runs, 2)
        print_report.assert_called_once_with(config, ["ok"])


if __name__ == "__main__":
    unittest.main()
