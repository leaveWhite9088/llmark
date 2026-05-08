"""Standard-library local proxy server for OpenAI-compatible APIs."""

from __future__ import annotations

import time
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib import error as urllib_error
from urllib import request as urllib_request
from urllib.parse import urlsplit

from llmark.proxy.metrics import (
    ProxyMetrics,
    report_proxy_metrics,
    update_metrics_from_sse_line,
)
from llmark.proxy.openai_compat import is_chat_completions_path
from llmark.config import get_report_url
from llmark.proxy.privacy import should_forward_request_header, should_forward_response_header
from llmark.proxy.upstream import (
    build_upstream_url,
    get_request_model,
    is_streaming_request,
    maybe_inject_stream_usage,
)


@dataclass
class ProxyConfig:
    host: str
    port: int
    provider: str
    upstream: str
    report_url: str = get_report_url()
    token: str | None = None
    sample_rate: float = 1.0
    debug: bool = False
    inject_stream_usage: bool = False


def run_proxy(config: ProxyConfig) -> None:
    handler = _make_handler(config)
    server = ThreadingHTTPServer((config.host, config.port), handler)
    _debug(config, f"listening on http://{config.host}:{config.port}; upstream={config.upstream}; provider={config.provider}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        _debug(config, "stopping")
    finally:
        server.server_close()


def _make_handler(config: ProxyConfig):
    class LLMarkProxyHandler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def do_POST(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
            self._proxy_post(config)

        def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
            self._proxy_without_body(config, "GET")

        def do_OPTIONS(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
            self._proxy_without_body(config, "OPTIONS")

        def log_message(self, format: str, *args: object) -> None:
            if config.debug:
                super().log_message(format, *args)

        def _proxy_without_body(self, config: ProxyConfig, method: str) -> None:
            self._forward(config, method=method, body=b"", collect_metrics=False)

        def _proxy_post(self, config: ProxyConfig) -> None:
            content_length = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(content_length) if content_length > 0 else b""
            path = urlsplit(self.path).path
            collect_metrics = is_chat_completions_path(path)
            if collect_metrics:
                body = maybe_inject_stream_usage(body, config.inject_stream_usage)
            self._forward(config, method="POST", body=body, collect_metrics=collect_metrics)

        def _forward(self, config: ProxyConfig, method: str, body: bytes, collect_metrics: bool) -> None:
            split = urlsplit(self.path)
            upstream_url = build_upstream_url(config.upstream, split.path, split.query)
            headers = {
                name: value
                for name, value in self.headers.items()
                if should_forward_request_header(name) and name.lower() != "accept-encoding"
            }
            if body:
                headers["Content-Length"] = str(len(body))
            headers["Accept-Encoding"] = "identity"

            req = urllib_request.Request(
                upstream_url,
                data=body if method not in {"GET", "OPTIONS"} else None,
                headers=headers,
                method=method,
            )
            model = get_request_model(body) if collect_metrics else "unknown"
            metrics = ProxyMetrics(provider=config.provider.lower(), model=model)
            start_time = time.perf_counter()
            first_token_time: float | None = None

            try:
                with urllib_request.urlopen(req, timeout=None) as upstream_response:
                    status = upstream_response.status
                    response_headers = upstream_response.headers
                    content_type = response_headers.get("Content-Type", "")
                    self.send_response(status)
                    for name, value in response_headers.items():
                        if should_forward_response_header(name):
                            self.send_header(name, value)
                    self.send_header("Connection", "close")
                    self.close_connection = True
                    self.end_headers()

                    is_stream = collect_metrics and (
                        "text/event-stream" in content_type.lower() or is_streaming_request(body)
                    )
                    if is_stream:
                        for line in upstream_response:
                            has_content = update_metrics_from_sse_line(metrics, line)
                            if first_token_time is None and has_content:
                                first_token_time = time.perf_counter()
                            self.wfile.write(line)
                            self.wfile.flush()
                        end_time = time.perf_counter()
                    else:
                        data = upstream_response.read()
                        self.wfile.write(data)
                        self.wfile.flush()
                        end_time = time.perf_counter()

                    if collect_metrics and is_stream:
                        report_proxy_metrics(
                            metrics,
                            start_time=start_time,
                            first_token_time=first_token_time,
                            end_time=end_time,
                            report_url=config.report_url,
                            token=config.token,
                            sample_rate=config.sample_rate,
                            debug=config.debug,
                        )
            except urllib_error.HTTPError as exc:
                self._send_upstream_error(exc)
            except Exception as exc:
                _debug(config, f"proxy error: {exc.__class__.__name__}")
                body_bytes = b'{"error":"LLMark proxy upstream request failed"}'
                self.send_response(502)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body_bytes)))
                self.send_header("Connection", "close")
                self.close_connection = True
                self.end_headers()
                self.wfile.write(body_bytes)

        def _send_upstream_error(self, exc: urllib_error.HTTPError) -> None:
            data = exc.read()
            self.send_response(exc.code)
            for name, value in exc.headers.items():
                if should_forward_response_header(name):
                    self.send_header(name, value)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Connection", "close")
            self.close_connection = True
            self.end_headers()
            self.wfile.write(data)

    return LLMarkProxyHandler


def _debug(config: ProxyConfig, message: str) -> None:
    if config.debug:
        print(f"[llmark proxy] {message}")
