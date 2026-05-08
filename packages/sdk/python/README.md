# LLMark Python SDK

Python SDK for LLMark - 众包式 LLM API 性能监控平台。

## 功能特性

- **零代码埋点**: 自动 monkey-patch 主流 LLM 库，一行代码开启采集
- **隐私优先**: 仅采集性能指标，不上报提示词内容和模型回复
- **三种工作模式**:
  - **SDK 自动采集**: 代码中调用 `llmark.init()` 即可拦截请求
  - **本地代理**: 不改代码，通过代理拦截第三方工具请求
  - **基准测试**: 主动压测模型性能并上报结果
- **零外部依赖**: 纯 Python 标准库实现核心功能

## 安装

```bash
pip install llmark
```

或从源码安装:

```bash
cd python
pip install -e .
```

## 快速开始

### 方式一: SDK 自动采集（推荐）

在导入 LLM 客户端库**之后**初始化 LLMark:

```python
from openai import OpenAI
import llmark

llmark.init(
    api_url="http://101.42.166.174/v1/report",
    sample_rate=1.0,  # 100% 采样
)

# 正常使用 OpenAI 客户端
client = OpenAI(api_key="sk-xxx")
stream = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "hello"}],
    stream=True,
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
```

支持自动采集的库:

| 库 | 被 patch 的类 | 被 patch 的方法 |
|-----|-------------|----------------|
| OpenAI | `OpenAI` | `chat.completions.create` |
| Anthropic | `Anthropic` | `messages.create` |
| Google Gemini | `GenerativeModel` | `generate_content` |

### 方式二: TUI 交互式基准测试

最简体验，无需记忆任何参数，向导式交互:

```bash
llmark benchmark-interactive
```

流程:
1. 自动探测环境中可用的厂商（通过环境变量中的 API Key）
2. 展示可用模型列表，选择要测试的模型
3. 选择测试场景（short / medium / long）和轮数
4. 自动运行测试，实时展示进度
5. 测试结束后可选择生成 Markdown 报告到桌面

首次运行会询问是否保存配置，下次可直接加载历史配置复用。

### 方式三: 命令行基准测试

#### 全自动模式（零参数）

```bash
# 只需在环境变量中配置好 API Key
export OPENAI_API_KEY="sk-xxx"

# 自动探测厂商、获取模型列表、测试所有模型
llmark benchmark api
```

#### 半自动模式

```bash
# 指定厂商，自动获取模型列表
llmark benchmark api --provider minimax

# 指定厂商和模型
llmark benchmark api --provider minimax --model MiniMax-M2.7
```

#### 完整参数模式

```bash
llmark benchmark api \
  --provider minimax \
  --model MiniMax-M2.7 \
  --base-url https://api.minimax.chat/v1 \
  --preset medium \
  --runs 3 \
  --report
```

参数说明:

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--provider` | 厂商标识，如 openai / deepseek / minimax | 自动探测 |
| `--model` | 模型名称 | 测试全部可用模型 |
| `--base-url` | API Base URL | 从厂商预设推断 |
| `--preset` | 测试场景: short / medium / long | medium |
| `--runs` | 每模型测试轮数 | 3 |
| `--report` | 测试结束后生成 Markdown 报告到桌面 | 否 |
| `--sample-rate` | 上报采样率 | 1.0 |
| `--debug` | 打印调试日志 | 否 |

场景预设:
- `short`: 约 2500 字符，模糊需求
- `medium`: 约 6000 字符，PRD 风格
- `long`: 约 12000 字符，完整规格书

### 方式四: 本地代理模式

适用于无法修改代码的场景（如 Claude Code、Cursor、Continue 等工具）:

```bash
# 启动代理
llmark proxy \
  --provider openai \
  --upstream https://api.openai.com/v1 \
  --port 8787
```

在工具中配置:
- Base URL: `http://127.0.0.1:8787/v1`
- API Key: 你的原始厂商 API Key

请求流转:
```
你的工具 → LLMark 代理 → 上游 API
              |
              ▼
       性能指标上报到 LLMark
```

## 环境变量配置

支持 `.env` / `.env.local` 文件自动加载，也支持直接通过系统环境变量配置。

| 环境变量 | 说明 | 有效值 | 默认值 |
|---------|------|--------|--------|
| `LLMARK_ENABLED` | 是否启用上报 | `true` / `false` | `true` |
| `LLMARK_API_URL` | 上报接口地址 | URL 字符串 | `http://127.0.0.1:8011/v1/report` |
| `LLMARK_SAMPLE_RATE` | 采样率 | `0.0` ~ `1.0` | `0.3` |
| `LLMARK_DEBUG` | 开启 DEBUG 日志 | `true` / `false` | `false` |
| `LLMARK_LOG_FILE` | 写入文件日志 | `true` / `false` | `false` |
| `LLMARK_LOG_DIR` | 自定义日志目录 | 路径字符串 | 平台标准目录 |

`.env.local` 示例:

```bash
# 厂商 API Key（benchmark 用）
MINIMAX_API_KEY=sk-xxx
SILICONFLOW_API_KEY=sk-xxx

# LLMark SDK 配置
LLMARK_ENABLED=true
LLMARK_API_URL=http://101.42.166.174/v1/report
LLMARK_SAMPLE_RATE=1.0
LLMARK_DEBUG=true
LLMARK_LOG_FILE=true
```

## SDK 配置详解

### 代码中显式配置（最高优先级）

```python
import llmark

llmark.init(
    token="可选的用户 token",          # 用于上报归属
    enabled=True,                       # 启用/禁用采集
    sample_rate=0.3,                    # 采样率 0.0~1.0
    api_url="http://101.42.166.174/v1/report",
    debug=True,                         # 控制台 DEBUG 日志
    log_to_file=True,                   # 同时写入日志文件
    log_dir="./logs",                   # 自定义日志目录（可选）
)
```

### 通过 .env 文件配置

在项目根目录创建 `.env.local`（已被 `.gitignore` 排除）:

```bash
LLMARK_DEBUG=true
LLMARK_SAMPLE_RATE=1.0
```

代码中无需传参:

```python
import llmark
llmark.init()  # 自动读取 .env.local
```

### 查看日志文件

```bash
llmark logs          # 打开日志目录
llmark logs --dir .  # 打开指定目录
```

日志文件位置:
- **Windows**: `C:\Users\<用户名>\AppData\Local\llmark\Logs\llmark-YYYYMMDD.log`
- **macOS**: `~/Library/Logs/llmark/llmark-YYYYMMDD.log`
- **Linux**: `~/.local/state/llmark/log/llmark-YYYYMMDD.log`

## 数据上报说明

### 采集字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `device_id` | string | 匿名设备 UUID |
| `provider` | string | 厂商标识 |
| `model` | string | 模型名称 |
| `prompt_tokens` | int | 输入 token 数 |
| `completion_tokens` | int | 输出 token 数 |
| `ttft_ms` | int | 首 token 延迟（毫秒） |
| `total_ms` | int | 总耗时（毫秒） |
| `token` | string | 可选的用户 token |

### 绝不采集

- 提示词内容
- 模型回复内容
- API Key
- 个人隐私信息

## CLI 命令参考

### `llmark benchmark-interactive`

启动交互式 TUI 向导，自动探测厂商、选择模型、运行测试。

### `llmark benchmark api`

命令行基准测试，支持全自动/半自动/完整参数三种模式。

```bash
# 全自动
llmark benchmark api

# 半自动
llmark benchmark api --provider minimax --runs 5 --report

# 完整参数
llmark benchmark api \
  --provider openai \
  --model gpt-4o-mini \
  --base-url https://api.openai.com/v1 \
  --preset medium \
  --runs 3 \
  --api-key sk-xxx \
  --report \
  --debug
```

### `llmark proxy`

启动本地代理服务器。

```bash
llmark proxy \
  --host 127.0.0.1 \
  --port 8787 \
  --provider openai \
  --upstream https://api.openai.com/v1 \
  --report-url http://101.42.166.174/v1/report \
  --sample-rate 1.0
```

### `llmark logs`

打开日志目录。

```bash
llmark logs              # 默认日志目录
llmark logs --dir ./logs # 自定义目录
```

## 项目结构

```
python/
├── llmark/
│   ├── __init__.py          # 公共 API (init)
│   ├── config.py            # 配置管理（.env 加载 + 环境变量解析）
│   ├── device.py            # 设备 ID 生成
│   ├── log_config.py        # 日志配置
│   ├── reporter.py          # 异步上报器
│   ├── uploader.py          # 上传线程管理
│   ├── core/
│   │   ├── collector.py     # 指标采集
│   │   ├── patcher.py       # Monkey-patch 逻辑
│   │   └── providers.py     # 厂商识别与适配
│   ├── benchmark/           # 基准测试
│   │   ├── api.py           # 核心压测引擎
│   │   ├── auto_detect.py   # 厂商自动探测
│   │   └── interactive/     # TUI 交互向导
│   │       ├── wizard.py    # 问题流程
│   │       └── main.py      # 交互式运行器
│   ├── cli/
│   │   └── main.py          # CLI 入口
│   └── templates/
│       └── benchmark_report.md  # Markdown 报告模板
├── tests/
│   └── integration/
│       └── test_sdk_collection.py  # SDK 采集集成测试
└── setup.py
```

## 常见问题

### SDK 没有采集到数据

1. 确认 `llmark.init()` 在目标库导入**之后**调用
2. 检查 `LLMARK_ENABLED` 没有被设为 `false`
3. 确认 API URL 正确且服务可达
4. 确认请求是流式模式（`stream=True`，TTFT 测量依赖流式）

### 代理无法启动

1. 检查端口占用: `lsof -i :8787` (macOS/Linux) 或 `netstat -ano | findstr 8787` (Windows)
2. 确认 Python 版本: `python --version` (需要 3.10+)

### Benchmark 无法获取模型列表

1. 检查 API Key 是否正确配置（环境变量或 `--api-key`）
2. 确认 `--base-url` 或厂商预设的地址正确
3. 部分厂商可能不支持 `/v1/models` 接口，可手动指定 `--model`

## License

MIT License - see [LICENSE](../../LICENSE)
