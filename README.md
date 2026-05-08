# LLMark

LLM 性能评测平台 — 用于大语言模型的性能基准测试与可视化分析。

## 项目结构

```
llmark/
├── packages/
│   ├── frontend/    # Next.js 14 前端应用（React + Tailwind CSS）
│   ├── backend/     # FastAPI 后端服务（Python）
│   └── sdk/         # 客户端 SDK（JavaScript / Python）
├── docs/            # 项目文档（本地维护，不上传远程）
├── package.json     # 根级工作区配置
└── pnpm-workspace.yaml
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14、React 18、Tailwind CSS、Recharts、SWR |
| 后端 | FastAPI、asyncpg、Pydantic、PostgreSQL |
| SDK | JavaScript (ESM)、Python |
| 包管理 | pnpm workspaces |

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Python >= 3.11
- PostgreSQL

### 安装依赖

```bash
# 安装所有工作区依赖
pnpm install

# 仅安装 Python 依赖
cd packages/backend && pip install -r requirements.txt
```

### 启动开发服务

```bash
# 同时启动所有服务
pnpm dev

# 仅启动前端
pnpm dev:frontend

# 仅启动后端
pnpm dev:backend
```

前端默认运行在 `http://127.0.0.1:3011`。

### 构建

```bash
pnpm build
```

## 各子包说明

### frontend

基于 Next.js 14 App Router 的前端应用，提供评测任务管理、结果可视化等功能。

```bash
cd packages/frontend
pnpm dev
```

### backend

基于 FastAPI 的后端 API 服务，提供评测执行、数据存储、结果查询等接口。

```bash
cd packages/backend
uvicorn main:app --reload
```

### sdk

客户端 SDK，支持 JavaScript 和 Python 两种语言，用于集成 LLMark 评测能力。

```bash
# JavaScript SDK
cd packages/sdk/javascript

# Python SDK
cd packages/sdk/python
```

## 许可证

私有项目，未公开授权。
# llmark
