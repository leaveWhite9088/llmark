# LLMark 后端

LLMark —— LLM 性能基准测试平台后端。

技术栈：FastAPI + Pydantic + SQLAlchemy/Raw SQL + SQLite（开发）/ PostgreSQL（生产）。

---

## 本地运行

```powershell
conda activate llmark
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8011
```

或使用快捷脚本：

```powershell
.\scripts\start-backend.ps1
```

## 环境配置

复制 `.env.example` 为 `.env` 并填写密钥：

```env
DATABASE_URL=sqlite:///./data/llmark-dev.db
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
JWT_SECRET=replace_me_with_a_long_random_secret
FRONTEND_URL=http://127.0.0.1:3011
ENV=development
```

## 数据库

本地开发默认使用 SQLite：

```env
DATABASE_URL=sqlite:///./data/llmark-dev.db
```

生产环境使用 PostgreSQL，表结构初始化参考 `sql/init.sql`。

后端存储原始上报数据，查询时实时聚合。查询逻辑位于 `db/queries/`，按领域分组（leaderboard、detail、provider、model、me、catalog、users）。

### 初始元数据

执行 `sql/seed_meta.sql` 填充 `model_meta`（模型标签/基本信息）和 `provider_info`（厂商描述/策略）表：

```bash
sqlite3 data/llmark-dev.db < sql/seed_meta.sql
```

## 主要接口

### 核心
- `GET /healthz` — 健康检查
- `POST /v1/report` — SDK 性能数据上报

### 认证
- `GET /v1/auth/github` — GitHub OAuth 登录入口
- `GET /v1/auth/github/callback` — OAuth 回调
- `GET /v1/auth/me` — 获取当前用户信息
- `POST /v1/auth/logout` — 退出登录

### 目录
- `GET /v1/models` — 模型目录
- `GET /v1/providers` — 厂商目录
- `GET /v1/meta/filters` — 筛选项元数据

### 排行榜
- `GET /v1/leaderboard` — 性能排行榜（含趋势、排名变化、标签）
- `GET /v1/users/leaderboard` — 用户贡献排行榜
- `GET /v1/users/badges` — 用户徽章列表

### 模型详情
- `GET /v1/model/{model}/overview` — 模型概览
- `GET /v1/model/{model}/entries` — 模型在各厂商下的表现条目
- `GET /v1/model/{model}/provider-comparison` — 供应商对比（按时间维度）
- `GET /v1/model/{model}/comparison` — 同上，别名路由
- `GET /v1/model/{model}/insights` — 模型洞察摘要

### 厂商详情
- `GET /v1/provider/{provider}/overview` — 厂商概览（含算力分配、描述、策略）
- `GET /v1/provider/{provider}/models` — 厂商下模型列表
- `GET /v1/provider/{provider}/models/info` — 厂商下模型基本信息

### 趋势与明细
- `GET /v1/detail` — 供应商+模型时间趋势
- `GET /v1/detail-by-model` — 按模型查看各供应商趋势对比

### 用户中心（Me）
- `GET /v1/me/stats` — 用户贡献统计
- `GET /v1/me/overview` — 用户综合概览
- `GET /v1/me/contribution-heatmap` — 贡献热力图
- `GET /v1/me/profile` — 用户详细档案

### 已废弃
- ~~`GET /v1/models/{model}/providers`~~ — 由 `/v1/model/{model}/entries` 完全覆盖
- ~~`GET /v1/provider/{provider}/stats`~~ — 数据已合并至 `overview`

## 聚合说明

- 排行榜默认时间窗口为 `24h`。
- 首页排行榜聚合维度为 `provider + model`。
- `input_length_bucket` 分桶规则：
  - `short`：<= 4096 tokens
  - `medium`：<= 16384 tokens
  - `long`：> 16384 tokens
- `input_length_bucket` 是分析/筛选维度，默认不拆分首页排行榜行。
- `GET /v1/detail` 为供应商维度：一个供应商 + 一个模型。
- `GET /v1/detail-by-model` 为模型维度：一个模型跨所有供应商，含各供应商指标和趋势。
- `GET /v1/provider/{provider}/models` 每模型返回一行。
- `GET /v1/model/{model}/entries` 每供应商返回一行。

## 动态筛选项

`GET /v1/meta/filters` 返回当前可用的：

- `providers` — 供应商列表
- `input_length_buckets` — 输入长度分桶
- `models` — 模型列表

用于前端筛选渲染，避免硬编码。

## 认证

GitHub 登录通过后端 OAuth 路由实现。真实登录需要在 `.env` 中配置有效值：

```env
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
FRONTEND_URL=http://127.0.0.1:3011
JWT_SECRET=...
```

## 前端联调

本地联调时的服务地址：

| 服务 | 地址 | 端口 |
|---------|-----|------|
| 后端 API | `http://127.0.0.1:8011/v1` | 8011 |
| 前端开发 | `http://127.0.0.1:3011` | 3011 |

前端 `.env.local` 配置：

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8011/v1
NEXT_PUBLIC_USE_MOCK=false
```

## 接口示例

```text
GET /v1/detail-by-model?model=gpt-4o&range=24h
GET /v1/detail-by-model?model=gpt-4o&range=24h&input_length_bucket=short
GET /v1/provider/openai/models?range=24h
GET /v1/model/gpt-4o/entries?range=24h&input_length_bucket=short
GET /v1/models?range=24h
GET /v1/providers?range=24h
```

---

## 项目文档

| 文档 | 说明 |
|------|------|
| `docs/API_REFERENCE.md` | 后端 API 参考文档（v0.2.0） |
| `docs/API_ALIGNMENT.md` | 前后端 API 对齐清单 |
| `docs/API_CHANGELOG_FOR_FRONTEND.md` | 后端变更说明（供前端对接） |
| `docs/ARCHITECTURE.md` | 项目架构与数据流 |
| `docs/ROUTER_GUIDE.md` | 新增 API 端点规范 |
| `docs/SCHEMAS_GUIDE.md` | 请求/响应模型规范 |
| `docs/DB_GUIDE.md` | 数据库查询层规范 |
