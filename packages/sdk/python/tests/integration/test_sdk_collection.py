"""Integration test: verify llmark.init() intercepts MiniMax streaming calls.

Usage:
    python tests/integration/test_sdk_collection.py              # with llmark
    python tests/integration/test_sdk_collection.py --no-llmark  # without llmark
"""

from __future__ import annotations

import argparse
import os
import sys
import time

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PROJECT_ROOT)

# Load .env.local before importing llmark so env vars are available
from llmark.config import load_dotenv, get_report_url

load_dotenv(prefix=None)


def run_test(*, use_llmark: bool) -> None:
    """Run streaming call to MiniMax, optionally with llmark.init()."""
    api_key = os.environ.get("MINIMAX_API_KEY") or os.environ.get("LLMARK_API_KEY")
    if not api_key:
        print("ERROR: No API key found. Set MINIMAX_API_KEY in .env.local")
        sys.exit(1)

    from openai import OpenAI

    if use_llmark:
        import llmark

        llmark.init(
            enabled=True,
            sample_rate=1.0,
            api_url=get_report_url(),
            debug=True,
            log_to_file=True,
        )

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.minimax.chat/v1",
    )

    mode = "WITH llmark.init()" if use_llmark else "WITHOUT llmark.init()"
    print("=" * 50)
    print(f"MiniMax Streaming Test — {mode}")
    print("Provider : minimax")
    print("Model    : MiniMax-M2.7")
    print("=" * 50)

    start = time.time()
    stream = client.chat.completions.create(
        model="MiniMax-M2.7",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello, say hi in one word."},
        ],
        stream=True,
        max_tokens=10,
    )

    chunk_count = 0
    content = ""
    for chunk in stream:
        chunk_count += 1
        delta = chunk.choices[0].delta.content
        if delta:
            content += delta
            print(delta, end="", flush=True)

    elapsed = time.time() - start
    print(f"\n\nStream : {chunk_count} chunks")
    print(f"Latency: {elapsed * 1000:.0f} ms")
    print(f"Content: {content!r}")
    print("-" * 50)

    if use_llmark:
        print("Waiting 5s for async metrics upload...")
        time.sleep(5)
    print("Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MiniMax SDK collection integration test")
    parser.add_argument("--no-llmark", action="store_true", help="Run without llmark.init()")
    args = parser.parse_args()
    run_test(use_llmark=not args.no_llmark)
