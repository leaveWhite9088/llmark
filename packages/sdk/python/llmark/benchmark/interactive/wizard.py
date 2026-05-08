"""Interactive question flow for benchmark wizard."""

from __future__ import annotations

import os
from dataclasses import dataclass

import questionary
from rich.console import Console

from llmark.benchmark.auto_detect import detect_provider_by_key, detect_providers
from llmark.benchmark.interactive.config_store import get_last_used, list_profiles
from llmark.benchmark.providers import list_provider_presets

console = Console()


@dataclass
class WizardConfig:
    provider: str
    base_url: str
    api_key: str
    models: list[str]
    preset: str
    runs: int
    sample_rate: float
    timeout: int
    report_url: str
    token: str | None
    env_key: str
    from_profile: str | None = None  # 若不为 None，表示使用了已有配置，跑完后不再询问保存


def _style() -> questionary.Style:
    return questionary.Style([
        ("qmark", "fg:cyan bold"),
        ("question", "bold"),
        ("answer", "fg:green bold"),
        ("pointer", "fg:cyan bold"),
        ("highlighted", "fg:cyan bold"),
        ("selected", "fg:green bold"),
        ("separator", "dim"),
        ("instruction", "dim"),
    ])


def ask_provider() -> tuple[str, str, str]:
    presets = list_provider_presets()
    choices = [(f"{p.name}  ({p.base_url})", p.key, p.base_url, p.env_key) for p in presets]
    choices.append(("自定义...  (手动输入 Base URL)", "custom", "", ""))

    selected = questionary.select(
        "选择厂商预设:",
        choices=[questionary.Choice(title=c[0], value=c) for c in choices],
        style=_style(),
    ).ask()

    if selected is None:
        raise KeyboardInterrupt

    label, key, base_url, env_key = selected

    if key == "custom":
        base_url = questionary.text(
            "输入 API Base URL:",
            default="https://",
            style=_style(),
        ).ask()
        if not base_url:
            raise KeyboardInterrupt
        env_key = questionary.text(
            "环境变量名 (用于自动读取 API Key):",
            default="OPENAI_API_KEY",
            style=_style(),
        ).ask() or "OPENAI_API_KEY"

    return key, base_url, env_key


def ask_api_key(env_key: str) -> str:
    # Try env first
    env_value = os.environ.get("LLMARK_API_KEY") or os.environ.get(env_key)
    if env_value:
        use_env = questionary.confirm(
            f"检测到环境变量 {env_key}，是否使用?",
            default=True,
            style=_style(),
        ).ask()
        if use_env:
            return env_value

    key = questionary.password(
        "输入 API Key:",
        style=_style(),
    ).ask()
    if key is None:
        raise KeyboardInterrupt
    return key


def ask_models(provider_key: str, base_url: str, api_key: str) -> list[str]:
    from llmark.benchmark.models import get_model_choices
    with console.status("[cyan]正在获取模型列表...", spinner="dots"):
        models = get_model_choices(provider_key, base_url, api_key)

    if not models:
        console.print("[red]未能自动获取模型列表，请检查 API Key 和 Base URL[/red]")
        raise KeyboardInterrupt

    console.print(f"\n[bold]可用模型 ({len(models)} 个):[/bold]")
    for i, m in enumerate(models, 1):
        console.print(f"  {i}. {m}")

    console.print()
    use_all = questionary.confirm(
        f"是否测试全部 {len(models)} 个模型?",
        default=True,
        style=_style(),
    ).ask()
    if use_all is None:
        raise KeyboardInterrupt
    if use_all:
        return models

    while True:
        raw = questionary.text(
            "输入要测试的模型编号 (多个用逗号分隔, 如 1,3,5):",
            style=_style(),
        ).ask()
        if raw is None:
            raise KeyboardInterrupt
        raw = raw.strip()
        if not raw:
            console.print("[yellow]未输入任何编号，请重新输入[/yellow]")
            continue
        try:
            indices = [int(x.strip()) for x in raw.split(",") if x.strip()]
            selected = [models[i - 1] for i in indices if 1 <= i <= len(models)]
        except Exception:
            selected = []
        if selected:
            return selected
        console.print("[yellow]无效的编号，请重新输入[/yellow]")


def ask_benchmark_options() -> tuple[str, int]:
    preset = questionary.select(
        "选择测试场景:",
        choices=[
            questionary.Choice("short   (~2500 chars, 模糊需求)", value="short"),
            questionary.Choice("medium  (~6000 chars, PRD 风格) [推荐]", value="medium"),
            questionary.Choice("long    (~12000 chars, 完整规格)", value="long"),
        ],
        default="medium",
        style=_style(),
    ).ask()
    if preset is None:
        raise KeyboardInterrupt

    runs_str = questionary.text(
        "测试轮数:",
        default="3",
        style=_style(),
    ).ask()
    runs = int(runs_str) if runs_str and runs_str.isdigit() else 3

    return preset, runs


def ask_llmark_options(report_url: str) -> tuple[str, str | None]:
    """Always upload to LLMark. Token is optional and skipped for now."""
    return report_url, None


def ask_save_profile(config: WizardConfig) -> str | None:
    profiles = list_profiles()
    if profiles:
        console.print(f"\n[dim]已有 {len(profiles)} 个配置档案[/dim]")

    save = questionary.confirm(
        "保存本次配置供下次使用?",
        default=True,
        style=_style(),
    ).ask()
    if not save:
        return None

    name = questionary.text(
        "配置名称:",
        default=f"{config.provider}-test",
        style=_style(),
    ).ask()
    return name


def run_wizard(report_url: str) -> WizardConfig:
    console.print("\n[bold cyan]LLMark Interactive Benchmark[/bold cyan]")
    console.print("[dim]=" * 40 + "[/dim]\n")

    # Check last used profile
    last = get_last_used()
    if last:
        use_last = questionary.confirm(
            f"检测到上次配置 '[bold]{last.get('name')}[/bold]'，是否直接使用?",
            default=False,
            style=_style(),
        ).ask()
        if use_last:
            api_key = ask_api_key(last.get("env_key", ""))
            profile_name = last.get("name", "")
            console.print(f"[green]✓ 已加载配置 '[bold]{profile_name}[/bold]'[/green]")
            return WizardConfig(
                provider=last.get("provider", ""),
                base_url=last.get("base_url", ""),
                api_key=api_key,
                models=last.get("models", []),
                preset=last.get("preset", "medium"),
                runs=last.get("runs", 3),
                sample_rate=last.get("sample_rate", 1.0),
                timeout=last.get("timeout", 120),
                report_url=report_url,
                token=None,
                env_key=last.get("env_key", ""),
                from_profile=profile_name,
            )

    # Auto-detect providers
    with console.status("[cyan]正在探测可用厂商...", spinner="dots"):
        available = detect_providers()
    for d in available:
        console.print(f"[green]  ✓ {d.name} 探测成功 ({len(d.models)} 个模型)[/green]")
    detected_models: list[str] = []

    # 统一入口：问是否输入新的 API Key
    use_new_key = questionary.confirm(
        "是否输入新的 API Key?",
        default=False,
        style=_style(),
    ).ask()
    if use_new_key is None:
        raise KeyboardInterrupt

    if use_new_key:
        key = questionary.password(
            "输入 API Key:",
            style=_style(),
        ).ask()
        if key is None:
            raise KeyboardInterrupt
        with console.status("[cyan]正在识别厂商...", spinner="dots"):
            detected = detect_provider_by_key(key)
        if detected:
            console.print(f"[green]✓ 识别成功: [bold]{detected.name}[/bold] ({detected.base_url})[/green]")
            console.print(f"[green]  获取到 {len(detected.models)} 个模型[/green]\n")
            provider = detected.key
            base_url = detected.base_url
            env_key = detected.env_key
            api_key = key
            detected_models = detected.models
            # 自动保存新 Key 到全局配置（跨目录可用）
            if not os.environ.get(env_key):
                from llmark.config import save_env_var
                save_env_var(env_key, key)
        else:
            console.print("[yellow]未能自动识别厂商，请手动配置[/yellow]\n")
            provider, base_url, env_key = ask_provider()
            api_key = ask_api_key(env_key)
    else:
        # 不输入新 Key，从探测到的厂商中选择（直接用环境变量里的 Key）
        if len(available) == 0:
            console.print("[yellow]未探测到可用厂商[/yellow]\n")
            provider, base_url, env_key = ask_provider()
            api_key = ask_api_key(env_key)
        elif len(available) == 1:
            d = available[0]
            provider = d.key
            base_url = d.base_url
            env_key = d.env_key
            detected_models = d.models
            # 直接用环境变量里的 Key（能探测到就说明有）
            api_key = os.environ.get("LLMARK_API_KEY") or os.environ.get(d.env_key) or ""
            console.print(f"[green]✓ 自动检测到厂商: [bold]{d.name}[/bold] ({base_url})[/green]\n")
        else:
            console.print(f"[yellow]探测到 {len(available)} 个可用厂商[/yellow]\n")
            choices = [(f"{d.name}  ({d.base_url})", d) for d in available]
            selected = questionary.select(
                "请选择厂商:",
                choices=[questionary.Choice(title=c[0], value=c[1]) for c in choices],
                style=_style(),
            ).ask()
            if selected is None:
                raise KeyboardInterrupt
            d = selected
            provider = d.key
            base_url = d.base_url
            env_key = d.env_key
            detected_models = d.models
            # 直接用环境变量里的 Key（能探测到就说明有）
            api_key = os.environ.get("LLMARK_API_KEY") or os.environ.get(d.env_key) or ""

    models = ask_models(provider, base_url, api_key)
    preset, runs = ask_benchmark_options()
    report_url, token = ask_llmark_options(report_url)

    return WizardConfig(
        provider=provider,
        base_url=base_url,
        api_key=api_key,
        models=models,
        preset=preset,
        runs=runs,
        sample_rate=1.0,
        timeout=120,
        report_url=report_url,
        token=token,
        env_key=env_key,
    )
