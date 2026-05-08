# LLMark 后端 — AI 工作指南

> 本文档是 Claude Code 每次会话的入口文件。开始任何工作前，请先完整阅读本文档，然后按任务类型阅读对应的专项指南。
>
> 语言要求：所有输出使用简体中文。

---

## 1. 项目简介

LLMark 是一个 LLM 性能基准测试平台的后端。用户通过 SDK 上报 LLM 推理性能数据（TPS、TTFT 等），后端存储、聚合并提供排行榜、趋势分析、厂商对比等功能。

技术栈：FastAPI + Pydantic + SQLAlchemy/Raw SQL + SQLite（开发）/ PostgreSQL（生产）。

---

## 2. 首次接触 — 阅读顺序

**每次开始新任务时，按以下顺序阅读：**

1. **本文档（CLAUDE.md）** — 了解工作流、规范索引、验证清单
2. **docs/ARCHITECTURE.md** — 了解项目地图、数据流、目录结构
3. **根据任务类型，阅读对应的专项指南**（见第 3 节）

**不要跳过 ARCHITECTURE.md。** 它是项目的"地图"，不读它你就不知道数据怎么流动、文件该怎么找。

---

## 3. 按任务类型的工作流

### 3.1 任务类型矩阵

| 你要做什么 | 必读指南 | 修改的文件范围 | 是否需要测试 |
|-----------|---------|---------------|-------------|
| 新增/修改 API 端点 | `docs/ROUTER_GUIDE.md` | `routers/xxx.py` → `schemas/xxx.py` → `db/queries/xxx.py` | 是 |
| 新增/修改请求或响应模型 | `docs/SCHEMAS_GUIDE.md` | `schemas/xxx.py` → `schemas/__init__.py` | 否（编译检查即可） |
| 新增/修改 SQL 查询或数据库操作 | `docs/DB_GUIDE.md` | `db/queries/xxx.py` | 是 |
| 修改配置项 | 不需要 | `config.py` / `.env.example` | 否 |
| 修改日志/中间件/生命周期 | 不需要 | `main.py` / `log/` | 是 |
| 编写测试 | 不需要 | `tests/test_xxx.py` | — |

### 3.2 新增 API 的标准工作流（最常见场景）

当根据 API 文档实现新接口时，**严格按以下顺序执行**：

```
Step 1: 分析 API 文档 → 确定路由域（report/catalog/model/provider/me/leaderboard/detail/meta/auth）
Step 2: 阅读 docs/ROUTER_GUIDE.md 第 4 章（创建新 Router 文件规范）
Step 3: 阅读 docs/SCHEMAS_GUIDE.md → 在 schemas/xxx.py 中定义请求/响应模型 → 在 schemas/__init__.py 中导出
Step 4: 在 routers/xxx.py 中实现路由（使用 ROUTER_GUIDE.md 的模板）
Step 5: 阅读 docs/DB_GUIDE.md → 在 db/queries/xxx.py 中实现查询函数（使用 DatabaseAdapter）
Step 6: 在 main.py 中注册路由（如果是新模块）
Step 7: 编写 tests/test_xxx.py 测试
Step 8: 执行第 6 节的验证清单
```

**关键原则：先写模型，再写路由，最后写查询。** 不要倒过来。

---

## 4. 各目录规范索引

| 目录 | 规范文件 | 核心要求 |
|------|---------|---------|
| `routers/` | `docs/ROUTER_GUIDE.md` | 必须声明 `response_model`，必须加 `@limiter.limit()`，禁止直接执行 SQL |
| `schemas/` | `docs/SCHEMAS_GUIDE.md` | 禁止 `dict[str, Any]`，必须定义具体子模型，统一从 `schemas` 包导入 |
| `db/queries/` | `docs/DB_GUIDE.md` | 必须使用 DatabaseAdapter，禁止路由层逻辑，返回原始字典 |
| `tests/` | 无单独指南 | 参考现有测试风格，至少覆盖正常流程 + 参数校验 + 认证 |

---

## 5. 红线 — 绝对禁止的行为

以下行为一旦发现，立即纠正：

1. **禁止在 routers 中直接写 SQL** — 必须通过 `db/queries/` 中的函数
2. **禁止响应模型中使用 `dict[str, Any]` 或 `list[dict[str, Any]]`** — 必须定义具体子模型
3. **禁止在 routers 中做数据聚合** — 聚合逻辑必须在 `db/queries/` 中
4. **禁止直接引用 schemas 子模块** — routers 中必须使用 `from schemas import XxxResponse`
5. **禁止内联重复导入** — 文件顶部已导入的模块，函数体内不要再 import
6. **禁止跳过测试** — 新增/修改接口后必须补充或更新测试
7. **禁止直接修改 `schemas/__init__.py` 之外的地方来导出模型** — 所有模型必须注册到 `__init__.py`

---

## 6. 验证清单（每次改动后必须执行）

代码改动完成后，按顺序执行以下检查。如果有任何一项失败，修复后再继续：

```bash
# 1. 编译检查 — 所有修改过的 Python 文件
python -m py_compile 修改过的文件.py

# 2. 应用导入检查 — 确保没有循环依赖或导入错误
python -c "from main import app; print('OK')"

# 3. 运行测试套件
python -m pytest tests/ -q
```

**如果新增/修改了 API：**

- [ ] 所有路由声明了 `response_model`（重定向除外）
- [ ] 所有路由添加了 `@limiter.limit()`
- [ ] `range` 参数使用 `RangeQuery()`（me.py 除外）
- [ ] `input_length_bucket` 参数使用 `InputLengthBucketQuery()`
- [ ] range 映射使用 `map_range_to_interval()` / `map_bucket_unit()`
- [ ] 路由层没有直接执行 SQL
- [ ] 路由层没有复杂的数据聚合逻辑
- [ ] 新增 schema 模型已注册到 `schemas/__init__.py`
- [ ] 新增 router 已注册到 `routers/__init__.py` 和 `main.py`
- [ ] 新增/修改了测试用例
- [ ] `python -m pytest tests/` 全部通过

**如果新增/修改了数据库查询：**

- [ ] 使用了 `DatabaseAdapter` 处理双数据库兼容性
- [ ] SQLite 分支使用 `?` 占位符，PostgreSQL 分支使用 `$N` 占位符
- [ ] 查询函数接收 `db` 作为第一个参数
- [ ] 查询函数不抛出 HTTPException，返回原始数据

---

## 7. 常见任务的快速指令模板

### 7.1 "根据 API 文档实现 /v1/xxx 接口"

> 根据以下 API 文档实现接口：
> ```
> GET /v1/xxx
> 请求参数: ...
> 响应: ...
> ```
> 工作流程：
> 1. 先读 docs/ROUTER_GUIDE.md 第 4 章
> 2. 在 schemas/xxx.py 中定义响应模型（遵循 SCHEMAS_GUIDE.md 的规范）
> 3. 在 routers/xxx.py 中实现路由
> 4. 在 db/queries/xxx.py 中实现查询函数（使用 DatabaseAdapter）
> 5. 补充测试
> 6. 执行第 6 节的验证清单

### 7.2 "修复 /v1/xxx 接口的 Bug"

> 修复 /v1/xxx 接口的以下问题：...
> 1. 先读 docs/ARCHITECTURE.md 了解该接口涉及的文件
> 2. 定位问题后修改，优先在 db/queries/ 中修复（不要改路由层除非必要）
> 3. 补充或更新测试
> 4. 执行验证清单

### 7.3 "重构某个模块"

> 重构 db/queries/xxx.py：...
> 1. 先读 docs/DB_GUIDE.md 了解查询层规范
> 2. 重构时保持函数签名不变（避免影响 routers）
> 3. 确保双数据库兼容性不被破坏
> 4. 执行验证清单

---

## 8. 快速参考

| 文件 | 用途 |
|------|------|
| `main.py` | FastAPI 入口、中间件注册、路由挂载、生命周期 |
| `config.py` | Pydantic Settings 配置管理 |
| `constants.py` | 业务常量（分桶定义、提供商显示名映射等） |
| `limiter.py` | SlowAPI 速率限制器 |
| `log/__init__.py` | 日志系统对外接口：`setup()`、`setup_middleware()`、`get_logger()`、`audit()` |
| `log/config.py` | 环境分级日志配置（development→控制台DEBUG，production→文件轮转INFO） |
| `log/middleware.py` | FastAPI 请求日志中间件（生成 request_id、记录请求开始/完成/异常） |
| `log/context.py` | contextvars 传递 request_id 跨异步调用链 |
| `log/formatter.py` | 统一日志格式，自动包含 request_id |
| `dependencies/queries.py` | 共享 Query 参数依赖 + range 映射工具 |
| `dependencies/auth.py` | JWT Cookie 解析依赖 `get_current_user_id` |
| `db/connection.py` | 数据库连接管理（双数据库支持） |
| `db/bootstrap.py` | 数据库表结构初始化 |
| `sql/init_sqlite.sql` | SQLite 表结构定义 |

---

*本文档版本：v1.1*
*更新日期：2026-04-29*
