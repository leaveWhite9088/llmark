"""LLMark JWT 认证管理。

用户通过浏览器登录后，SDK 自动获取 JWT token 并缓存到本地，
后续上报自动携带 Authorization header，首次上报时设备自动绑定到账号。
"""

from __future__ import annotations

import json
import logging
import socket
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlencode, urlparse, parse_qs

from llmark.paths import LLMARK_DIR, AUTH_FILE, CONFIG_FILE
from llmark.utils import read_json_field

logger = logging.getLogger("llmark.auth")

CALLBACK_PORT = 18923
CALLBACK_PATH = "/llmark/callback"


# =============================================================================
# 本地 auth 缓存读写
# =============================================================================

def _load_cached_token() -> str | None:
    return read_json_field(AUTH_FILE, "token")


def _save_token(token: str) -> None:
    LLMARK_DIR.mkdir(parents=True, exist_ok=True)
    AUTH_FILE.write_text(
        json.dumps({"token": token}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


# =============================================================================
# Token 获取
# =============================================================================

def get_token() -> str | None:
    """获取当前 JWT token。

    优先级：环境变量 LLMARK_TOKEN > 本地缓存 auth.json。
    """
    import os
    env_token = os.environ.get("LLMARK_TOKEN")
    if env_token:
        return env_token
    return _load_cached_token()


def has_token() -> bool:
    return get_token() is not None


def save_token(token: str) -> None:
    """手动保存 token 到本地缓存。"""
    _save_token(token)
    logger.info("Token saved to %s", AUTH_FILE)


# =============================================================================
# 浏览器自动登录（回调方式）
# =============================================================================

def login(auth_base_url: str, timeout: int = 120) -> str | None:
    """打开浏览器登录，通过本地回调自动接收 JWT token。

    流程：
    1. 启动本地 HTTP 服务器监听回调
    2. 打开浏览器到认证页面，附带 redirect_uri 和 device_id
    3. 用户登录后，后端 302 重定向到本地回调，携带 token
    4. 自动保存 token

    参数:
        auth_base_url: 后端地址，如 http://192.168.5.224:8011
        timeout: 等待回调的超时秒数

    返回:
        JWT token 字符串，失败返回 None。
    """
    from llmark.device import get_device_id
    device_id = get_device_id()
    result: dict[str, str | None] = {"token": None}

    class CallbackHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            print(f"[debug] 收到回调请求: {self.path}")

            if parsed.path != CALLBACK_PATH:
                self.send_response(404)
                self.end_headers()
                return

            params = parse_qs(parsed.query)
            token = params.get("token", [None])[0]

            if token:
                result["token"] = token
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(
                    "<html><body style='font-family:sans-serif;text-align:center;padding-top:80px'>"
                    "<h2 style='color:green'>登录成功！</h2>"
                    "<p>可以关闭此页面，回到终端继续使用。</p>"
                    "</body></html>".encode("utf-8")
                )
            else:
                self.send_response(400)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(
                    "<html><body style='font-family:sans-serif;text-align:center;padding-top:80px'>"
                    "<h2 style='color:red'>登录失败</h2>"
                    "<p>未收到 token，请重试。</p>"
                    "</body></html>".encode("utf-8")
                )

        def log_message(self, format: str, *args: object) -> None:
            pass

    if not _is_port_available(CALLBACK_PORT):
        logger.warning("回调端口 %d 被占用，请关闭占用程序后重试", CALLBACK_PORT)
        return None

    server = HTTPServer(("127.0.0.1", CALLBACK_PORT), CallbackHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    callback_url = f"http://127.0.0.1:{CALLBACK_PORT}{CALLBACK_PATH}"
    params = {"redirect_uri": callback_url}
    if device_id:
        params["device_id"] = device_id

    login_url = f"{auth_base_url.rstrip('/')}/v1/auth/sdk-token?{urlencode(params)}"

    print(f"正在打开浏览器登录...")
    if not webbrowser.open(login_url):
        print(f"浏览器未自动打开，请手动访问：\n  {login_url}")
    print(f"回调地址: {callback_url}")
    print(f"等待登录回调 (最多 {timeout} 秒)...")

    server_thread.join(timeout=timeout)
    server.shutdown()

    token = result.get("token")
    if token:
        _save_token(token)
        print(f"登录成功！Token 已保存到 {AUTH_FILE}")
        return token

    print("\n登录超时。可能原因：")
    print(f"  1. 后端没有 302 重定向到回调地址")
    print(f"  2. 请确认后端在有 redirect_uri 参数时，返回 302 → {callback_url}?token=xxx")
    return None


def _is_port_available(port: int) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("127.0.0.1", port))
            return True
    except OSError:
        return False
