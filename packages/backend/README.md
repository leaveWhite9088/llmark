# LLMark 后端

LLMark —— LLM 性能基准测试平台后端。

技术栈：FastAPI + Pydantic + asyncpg + PostgreSQL + Redis。

---

## 本地运行

```bash
conda activate llmark
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8011
```

## 环境配置

复制 `.env.example` 为 `.env` 并填写密钥：

```env
DATABASE_URL=postgresql://llmark:llmark_password@127.0.0.1:5432/llmark
REDIS_URL=redis://127.0.0.1:6380/0
CACHE_TTL_SECONDS=300
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
JWT_SECRET=replace_me_with_a_long_random_secret
FRONTEND_URL=http://127.0.0.1:3011
ENV=development
```

## 数据库

使用 Docker Compose 启动 PostgreSQL 和 Redis：

```bash
docker compose up -d
```

服务说明：

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 主数据库 |
| Redis | 6380 | 缓存层 |

后端启动时自动创建表结构（`db/bootstrap.py`），无需手动执行 SQL。

### 初始元数据

执行 `sql/seed_meta.sql` 和 `sql/seed_meta_extra.sql` 填充 `model_meta` 和 `provider_info` 表：

```bash
psql -h 127.0.0.1 -U llmark -d llmark -f sql/seed_meta.sql
psql -h 127.0.0.1 -U llmark -d llmark -f sql/seed_meta_extra.sql
```

## Redis 缓存

Redis 用于缓存高频查询结果，减少数据库压力：

| 缓存键前缀 | 数据 | TTL |
|-----------|------|-----|
| `leaderboard` | 性能排行榜 | 5 分钟 |
| `users_leaderboard` | 用户贡献排行榜 | 5 分钟 |
| `models_catalog` | 模型目录 | 5 分钟 |
| `providers_catalog` | 厂商目录 | 5 分钟 |
| `filter_options` | 筛选项元数据 | 10 分钟 |

新报告提交时自动清除相关缓存，确保数据一致性。

缓存工具函数位于 `db/cache.py`，配置项：
- `REDIS_URL` — Redis 连接地址
- `CACHE_TTL_SECONDS` — 默认缓存过期时间（秒）

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

## 聚合说明

- 排行榜默认时间窗口为 `24h`。
- 首页排行榜聚合维度为 `provider + model`。
- `input_length_bucket` 分桶规则：
  - `short`：<= 4096 tokens
  - `medium`：<= 16384 tokens
  - `long`：> 16384 tokens
- `input_length_bucket` 是分析/筛选维度，默认不拆分首页排行榜行。

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
|------|------|------|
| 后端 API | `http://127.0.0.1:8011/v1` | 8011 |
| 前端开发 | `http://127.0.0.1:3011` | 3011 |

前端 `.env.local` 配置：

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8011/v1
```

## 接口示例

```bash
GET /v1/detail-by-model?model=gpt-4o&range=24h
GET /v1/detail-by-model?model=gpt-4o&range=24h&input_length_bucket=short
GET /v1/provider/openai/models?range=24h
GET /v1/model/gpt-4o/entries?range=24h&input_length_bucket=short
GET /v1/models?range=24h
GET /v1/providers?range=24h
```

## 项目结构

```
backend/
├── config.py           # 配置管理
├── constants.py        # 共享常量
├── main.py             # FastAPI 应用入口
├── limiter.py          # 限流器
├── db/
│   ├── adapter.py      # 数据库适配器
│   ├── bootstrap.py    # 表结构初始化
│   ├── cache.py        # Redis 缓存工具
│   ├── connection.py   # 数据库连接管理
│   └── queries/        # 查询层（按领域分组）
├── dependencies/       # FastAPI 依赖注入
├── routers/            # API 路由
├── schemas/            # Pydantic 模型
├── utils/              # 工具函数
├── scripts/            # 迁移脚本
├── sql/                # SQL 初始化脚本
└── tests/              # 测试
```
