"""Shared benchmark reporting utilities.

汇总表格和 Markdown 报告生成，被 CLI benchmark 和 interactive wizard 共同依赖。
"""

from __future__ import annotations

import os
from datetime import datetime

from rich.console import Console
from rich.table import Table

console = Console()


def _fmt(value: float | int | None, fmt: str = "{:.0f}") -> str:
    return fmt.format(value) if value is not None else "N/A"


def print_summary_table(all_results: list[tuple[str, list]]) -> None:
    """Print a rich comparison table across all models."""
    table = Table(
        title="Benchmark Results Comparison",
        show_header=True,
        header_style="bold cyan",
    )
    table.add_column("Model", style="bold", no_wrap=False, min_width=20)
    table.add_column("Runs", justify="right")
    table.add_column("Success", justify="right")
    table.add_column("Avg TTFT", justify="right")
    table.add_column("Avg TPS", justify="right")
    table.add_column("Avg Total", justify="right")
    table.add_column("Input Tok", justify="right")
    table.add_column("Output Tok", justify="right")
    table.add_column("Uploaded", justify="right")

    for model, results in all_results:
        if not results:
            table.add_row(model, "0", "0/0", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A")
            continue

        total = len(results)
        success = sum(1 for r in results if r.status_code == 200)
        uploaded = sum(1 for r in results if r.uploaded)

        ttft_values = [r.ttft_ms for r in results if r.ttft_ms is not None]
        total_values = [r.total_ms for r in results if r.total_ms is not None]
        prompt_values = [r.prompt_tokens for r in results if r.prompt_tokens is not None]
        completion_values = [r.completion_tokens for r in results if r.completion_tokens is not None]
        tps_values = [r.tps for r in results if r.tps is not None]

        avg_ttft = sum(ttft_values) / len(ttft_values) if ttft_values else None
        avg_total = sum(total_values) / len(total_values) if total_values else None
        avg_prompt = sum(prompt_values) / len(prompt_values) if prompt_values else None
        avg_completion = sum(completion_values) / len(completion_values) if completion_values else None
        avg_tps = sum(tps_values) / len(tps_values) if tps_values else None

        table.add_row(
            model,
            str(total),
            f"{success}/{total}",
            f"{avg_ttft:.0f} ms" if avg_ttft is not None else "N/A",
            f"{avg_tps:.1f}" if avg_tps is not None else "N/A",
            f"{avg_total:.0f} ms" if avg_total is not None else "N/A",
            f"{avg_prompt:.0f}" if avg_prompt is not None else "N/A",
            f"{avg_completion:.0f}" if avg_completion is not None else "N/A",
            f"{uploaded}/{total}",
        )

    console.print()
    console.print(table)
    console.print()


def generate_markdown_report(
    provider: str,
    preset: str,
    runs: int,
    all_results: list[tuple[str, list]],
) -> str:
    """Generate a Markdown benchmark report. Returns the file path."""
    template_path = os.path.join(os.path.dirname(__file__), "..", "templates", "benchmark_report.md")
    with open(template_path, "r", encoding="utf-8") as f:
        template = f.read()

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    summary_rows = []
    detail_sections = []
    for model, results in all_results:
        if not results:
            summary_rows.append(f"| {model} | 0 | 0/0 | N/A | N/A | N/A | N/A | N/A | N/A |")
            detail_sections.append(f"### {model}\n\n测试失败，无数据。\n")
            continue

        total = len(results)
        success = sum(1 for r in results if r.status_code == 200)
        uploaded = sum(1 for r in results if r.uploaded)

        ttft_values = [r.ttft_ms for r in results if r.ttft_ms is not None]
        total_values = [r.total_ms for r in results if r.total_ms is not None]
        prompt_values = [r.prompt_tokens for r in results if r.prompt_tokens is not None]
        completion_values = [r.completion_tokens for r in results if r.completion_tokens is not None]
        tps_values = [r.tps for r in results if r.tps is not None]

        avg_ttft = sum(ttft_values) / len(ttft_values) if ttft_values else None
        avg_total = sum(total_values) / len(total_values) if total_values else None
        avg_prompt = sum(prompt_values) / len(prompt_values) if prompt_values else None
        avg_completion = sum(completion_values) / len(completion_values) if completion_values else None
        avg_tps = sum(tps_values) / len(tps_values) if tps_values else None

        row = (
            f"| {model} | {total} | {success}/{total} | "
            f"{_fmt(avg_ttft, '{:.0f}')} ms | {_fmt(avg_tps, '{:.1f}')} | "
            f"{_fmt(avg_total, '{:.0f}')} ms | {_fmt(avg_prompt)} | "
            f"{_fmt(avg_completion)} | {uploaded}/{total} |"
        )
        summary_rows.append(row)

        detail_lines = [f"### {model}\n"]
        detail_lines.append("| Run | Status | TTFT | Total | Prompt | Completion | TPS | Uploaded |")
        detail_lines.append("|-----|--------|------|-------|--------|------------|-----|----------|")
        for r in results:
            detail_lines.append(
                f"| {r.run_index} | {r.status_code} | "
                f"{_fmt(r.ttft_ms)} ms | {_fmt(r.total_ms)} ms | "
                f"{_fmt(r.prompt_tokens)} | {_fmt(r.completion_tokens)} | "
                f"{_fmt(r.tps, '{:.1f}')} | {'Yes' if r.uploaded else 'No'} |"
            )
        detail_sections.append("\n".join(detail_lines))

    report = template.format(
        timestamp=timestamp,
        provider=provider,
        preset=preset,
        runs=runs,
        summary_rows="\n".join(summary_rows),
        detail_sections="\n\n".join(detail_sections),
    )

    desktop = os.path.join(os.path.expanduser("~"), "Desktop")
    filename = f"llmark-report-{provider}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.md"
    filepath = os.path.join(desktop, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(report)
    return filepath
