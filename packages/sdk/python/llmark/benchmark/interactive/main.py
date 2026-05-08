"""Main entry for interactive benchmark wizard."""

from __future__ import annotations

import logging
import os

from rich.console import Console

from llmark.benchmark.api import (
    BenchmarkApiConfig,
    print_api_benchmark_report,
    run_api_benchmark,
)
from llmark.benchmark.interactive.config_store import save_profile
from llmark.benchmark.interactive.wizard import WizardConfig, run_wizard
from llmark.benchmark.report import generate_markdown_report, print_summary_table
from llmark.config import get_report_url

logger = logging.getLogger("llmark.benchmark.interactive")
console = Console()


def _run_single_model(config: WizardConfig, model: str) -> tuple[str, list, bool]:
    """Run benchmark for a single model. Returns (model, results, success)."""
    api_config = BenchmarkApiConfig(
        provider=config.provider,
        model=model,
        base_url=config.base_url,
        runs=config.runs,
        preset=config.preset,
        api_key=config.api_key,
        report_url=config.report_url,
        token=config.token,
        sample_rate=config.sample_rate,
        timeout=config.timeout,
        debug=False,
        stream=True,
    )

    status = console.status(f"[cyan]测试 {model} 中...[/cyan]", spinner="dots")
    try:
        status.start()

        def _on_run_start(run_idx: int, total: int) -> None:
            status.update(status=f"[cyan]测试 {model} 第 {run_idx}/{total} 轮...[/cyan]")

        results = run_api_benchmark(api_config, on_run_start=_on_run_start)
        status.stop()
        all_ok = all(r.status_code == 200 for r in results)
        return model, results, all_ok
    except Exception as exc:
        status.stop()
        console.print(f"[red]✗ {model} 测试失败: {exc}[/red]")
        return model, [], False


def run_interactive_benchmark() -> int:
    """Run the interactive benchmark wizard."""
    try:
        config = run_wizard(get_report_url())
    except KeyboardInterrupt:
        console.print("\n[yellow]已取消[/yellow]")
        return 130

    console.print(f"\n[bold green]开始测试[/bold green] 厂商: {config.provider} | 场景: {config.preset} | 轮数: {config.runs}")
    console.print(f"模型: {', '.join(config.models)}\n")

    all_results: list[tuple[str, list]] = []

    for idx, model in enumerate(config.models, 1):
        console.print(f"[cyan][{idx}/{len(config.models)}] 测试 {model}...[/cyan]")
        model_name, results, ok = _run_single_model(config, model)
        all_results.append((model_name, results))

        if results:
            ok_count = sum(1 for r in results if r.status_code == 200)
            if ok_count == len(results):
                console.print(f"[green]  ✓ {model} 全部 {len(results)} 轮通过[/green]")
            else:
                console.print(f"[yellow]  ⚠ {model} {ok_count}/{len(results)} 轮通过[/yellow]")
        else:
            console.print(f"[red]  ✗ {model} 测试失败[/red]")

    print_summary_table(all_results)

    # Auto-save configuration for new runs
    if config.from_profile:
        console.print(f"[green]✓ 本次配置 '[bold]{config.from_profile}[/bold]' 已跑完[/green]")
    else:
        # 1. 自动保存 API Key 到 .env.local（如果环境变量中没有）
        if config.api_key and not os.environ.get(config.env_key):
            from llmark.config import save_env_var
            saved_path = save_env_var(config.env_key, config.api_key)
            if saved_path:
                console.print(f"[green]✓ API Key 已自动保存到 .env.local[/green]")

        # 2. 自动保存配置到 profile
        auto_name = f"{config.provider}-auto"
        save_profile(auto_name, config.__dict__)
        console.print(f"[green]✓ 配置已自动保存为 '[bold]{auto_name}[/bold]'[/green]")

    # Ask to generate report
    try:
        import questionary
        gen_report = questionary.confirm(
            "是否生成 Markdown 数据报告?",
            default=True,
            style=questionary.Style([
                ("qmark", "fg:cyan bold"),
                ("question", "bold"),
                ("answer", "fg:green bold"),
            ]),
        ).ask()
        if gen_report:
            filepath = generate_markdown_report(
                config.provider, config.preset, config.runs, all_results
            )
            console.print(f"[green]✓ 报告已保存到桌面: [bold]{filepath}[/bold][/green]")
    except Exception:
        pass

    console.print("[dim]提示: 下次可使用 llmark benchmark-interactive --profile <名称> 快速加载[/dim]")
    return 0
