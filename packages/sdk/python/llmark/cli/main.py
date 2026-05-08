"""Command line entry points for LLMark."""

from __future__ import annotations

import argparse
import os
import platform
import subprocess
from typing import Sequence

from platformdirs import user_log_dir

from llmark.benchmark.api import DEFAULT_REPORT_URL, BenchmarkApiConfig, print_api_benchmark_report, run_api_benchmark
from llmark.benchmark.interactive import run_interactive_benchmark
from llmark.config import DEFAULT_PROXY_HOST, DEFAULT_PROXY_PORT, get_auth_base_url, load_dotenv
from llmark.proxy.server import ProxyConfig, run_proxy


# CLI loads all env vars (including provider API keys), not just LLMARK_*
load_dotenv(prefix=None)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="llmark", description="LLMark SDK, benchmark, and local proxy")
    subparsers = parser.add_subparsers(dest="command", required=True)

    proxy = subparsers.add_parser(
        "proxy",
        help="Run a local OpenAI-compatible proxy for LLMark measurement",
    )
    proxy.add_argument("--host", default=DEFAULT_PROXY_HOST, help=f"Local bind host. Default: {DEFAULT_PROXY_HOST}")
    proxy.add_argument("--port", type=int, default=DEFAULT_PROXY_PORT, help=f"Local bind port. Default: {DEFAULT_PROXY_PORT}")
    proxy.add_argument("--provider", required=True, help="Provider key, for example openai/deepseek/minimax")
    proxy.add_argument("--upstream", required=True, help="Upstream API base URL, for example https://api.openai.com/v1")
    proxy.add_argument(
        "--report-url",
        default=DEFAULT_REPORT_URL,
        help=f"LLMark report endpoint. Default: {DEFAULT_REPORT_URL}",
    )
    proxy.add_argument("--token", default=None, help="Optional LLMark user token")
    proxy.add_argument("--sample-rate", type=float, default=1.0, help="Report sample rate, 0.0 to 1.0")
    proxy.add_argument("--debug", action="store_true", help="Print sanitized proxy debug logs")
    proxy.add_argument(
        "--inject-stream-usage",
        action="store_true",
        help="Try to add stream_options.include_usage=true before forwarding streaming requests",
    )

    benchmark = subparsers.add_parser(
        "benchmark",
        help="Run a voluntary LLMark benchmark",
    )
    benchmark_subparsers = benchmark.add_subparsers(dest="benchmark_command", required=True)
    benchmark_api = benchmark_subparsers.add_parser(
        "api",
        help="Run an API benchmark against an OpenAI-compatible endpoint",
    )
    benchmark_api.add_argument("--provider", default=None, help="Provider key, for example openai/deepseek/minimax. If not set, auto-detect from environment variables.")
    benchmark_api.add_argument("--model", default=None, help="Model name, for example gpt-4o-mini. If not set, benchmark all available models.")
    benchmark_api.add_argument("--base-url", default=None, help="OpenAI-compatible API base URL. If not set, inferred from provider preset.")
    benchmark_api.add_argument("--runs", type=int, default=3, help="Number of benchmark runs. Default: 3")
    benchmark_api.add_argument("--preset", default="medium", choices=["short", "medium", "long"], help="Benchmark preset")
    benchmark_api.add_argument("--api-key", default=None, help="Provider API key (direct). If not set, falls back to LLMARK_API_KEY env var, then --api-key-env, then provider default.")
    benchmark_api.add_argument("--api-key-env", default=None, help="Environment variable name used to read the provider API key")
    benchmark_api.add_argument(
        "--report-url",
        default=DEFAULT_REPORT_URL,
        help=f"LLMark report endpoint. Default: {DEFAULT_REPORT_URL}",
    )
    benchmark_api.add_argument("--token", default=None, help="Optional LLMark user token")
    benchmark_api.add_argument("--sample-rate", type=float, default=1.0, help="Report sample rate, 0.0 to 1.0")
    benchmark_api.add_argument("--timeout", type=int, default=120, help="Request timeout in seconds. Default: 120")
    benchmark_api.add_argument("--debug", action="store_true", help="Print sanitized benchmark debug logs")
    benchmark_api.add_argument("--report", action="store_true", help="Generate a Markdown report on the Desktop after benchmarking")

    subparsers.add_parser(
        "benchmark-interactive",
        help="Run an interactive benchmark wizard",
    )

    login_parser = subparsers.add_parser(
        "login",
        help="Login to LLMark via browser and save JWT token locally",
    )
    login_parser.add_argument("--token", default=None, help="Manually provide a JWT token instead of browser login")
    login_parser.add_argument("--auth-url", default=None, help=f"Auth service base URL. Default: auto from report URL")

    logs = subparsers.add_parser(
        "logs",
        help="Open the LLMark log directory in file manager",
    )
    logs.add_argument("--dir", default=None, help="Custom log directory to open")

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "benchmark-interactive":
        return run_interactive_benchmark()
    if args.command == "login":
        from llmark.auth import has_token, login, save_token
        if args.token:
            save_token(args.token)
            print("Token 已保存。")
            return 0
        auth_base = args.auth_url or get_auth_base_url()
        token = login(auth_base)
        return 0 if token else 1
    if args.command == "logs":
        log_dir = args.dir or user_log_dir("llmark", appauthor=False)
        os.makedirs(log_dir, exist_ok=True)
        print(f"Opening log directory: {log_dir}")
        system = platform.system()
        if system == "Windows":
            subprocess.run(["explorer", log_dir])
        elif system == "Darwin":
            subprocess.run(["open", log_dir])
        else:
            subprocess.run(["xdg-open", log_dir])
        return 0
    if args.command == "proxy":
        config = ProxyConfig(
            host=args.host,
            port=args.port,
            provider=args.provider,
            upstream=args.upstream,
            report_url=args.report_url,
            token=args.token,
            sample_rate=max(0.0, min(1.0, args.sample_rate)),
            debug=bool(args.debug),
            inject_stream_usage=bool(args.inject_stream_usage),
        )
        run_proxy(config)
        return 0
    if args.command == "benchmark" and args.benchmark_command == "api":
        # Auto-resolve provider, base_url, and models
        provider = args.provider
        base_url = args.base_url
        model = args.model

        if not provider:
            from llmark.benchmark.auto_detect import detect_providers
            detected = detect_providers()
            if not detected:
                parser.error("No available provider detected. Set API key in environment or provide --provider, --base-url, and --model.")
            if len(detected) > 1:
                names = ", ".join(d.name for d in detected)
                parser.error(f"Multiple providers detected: {names}. Use --provider to specify one.")
            d = detected[0]
            provider = d.key
            base_url = d.base_url
            env_key = d.env_key
            available_models = d.models
            print(f"Auto-detected provider: {d.name} ({base_url})")
        else:
            if not base_url:
                from llmark.benchmark.providers import get_provider_preset
                preset_info = get_provider_preset(provider)
                if preset_info:
                    base_url = preset_info.base_url
                    env_key = preset_info.env_key
                else:
                    parser.error(f"Unknown provider '{provider}'. Provide --base-url or use a known provider key.")
            else:
                env_key = None
            available_models = []

        # Resolve API key
        api_key = args.api_key
        if not api_key:
            from llmark.benchmark.api import _resolve_api_key
            temp_config = BenchmarkApiConfig(
                provider=provider, model="", base_url=base_url,
                api_key=None, api_key_env=args.api_key_env or env_key,
            )
            api_key = _resolve_api_key(temp_config)
        if not api_key:
            parser.error("No API key found. Provide --api-key or set the provider environment variable.")

        # Resolve models
        if model:
            models = [model]
        else:
            if not available_models:
                from llmark.benchmark.models import get_model_choices
                available_models = get_model_choices(provider, base_url, api_key)
            if not available_models:
                parser.error(f"Could not fetch model list for {provider}.")
            models = available_models
            print(f"Benchmarking all {len(models)} models: {', '.join(models)}")

        # Run benchmark for each model
        all_results: list[tuple[str, list]] = []
        for m in models:
            config = BenchmarkApiConfig(
                provider=provider,
                model=m,
                base_url=base_url,
                runs=max(1, int(args.runs)),
                preset=args.preset,
                api_key=api_key,
                api_key_env=args.api_key_env,
                report_url=args.report_url,
                token=args.token,
                sample_rate=max(0.0, min(1.0, args.sample_rate)),
                timeout=max(1, int(args.timeout)),
                debug=bool(args.debug),
                stream=True,
            )
            def _on_run_start(run_idx: int, total: int) -> None:
                print(f"  {m} run {run_idx}/{total}...", end="\r")
            results = run_api_benchmark(config, on_run_start=_on_run_start)
            print(" " * 50, end="\r")
            all_results.append((m, results))

        # Print report
        if len(models) == 1:
            print_api_benchmark_report(config, results)
        else:
            from llmark.benchmark.report import print_summary_table
            print_summary_table(all_results)

        # Generate Markdown report if requested
        if args.report:
            from llmark.benchmark.report import generate_markdown_report
            filepath = generate_markdown_report(provider, args.preset, max(1, int(args.runs)), all_results)
            print(f"\nReport saved to Desktop: {filepath}")

        # Auto-save API Key to global config (if not already in env)
        if api_key and env_key and not os.environ.get(env_key):
            from llmark.config import save_env_var
            saved_path = save_env_var(env_key, api_key)
            if saved_path:
                print(f"API Key auto-saved to {saved_path}")

        return 0
    parser.error(f"Unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
