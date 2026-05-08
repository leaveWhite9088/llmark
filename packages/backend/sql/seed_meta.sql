-- LLMark 初始元数据填充脚本
-- 执行方式：sqlite3 llmark.db < seed_meta.sql
-- 或手动在 PostgreSQL 中执行

-- ============================================
-- model_meta: 模型基本信息
-- ============================================

INSERT INTO model_meta (model, display_name, tags, context_window, release_date, description) VALUES
('gpt-4o', 'GPT-4o', '["vision", "code"]', 128000, '2024-05', 'OpenAI 旗舰多模态模型，支持文本、图像和音频输入'),
('gpt-4o-mini', 'GPT-4o Mini', '["fast"]', 128000, '2024-07', 'OpenAI 轻量级模型，速度快、成本低'),
('gpt-4-turbo', 'GPT-4 Turbo', '["long-context"]', 128000, '2023-11', 'OpenAI 长上下文模型，支持 128k tokens'),
('claude-3-5-sonnet', 'Claude 3.5 Sonnet', '["vision", "code"]', 200000, '2024-06', 'Anthropic 平衡型模型，在推理和代码方面表现出色'),
('claude-3-opus', 'Claude 3 Opus', '["long-context", "powerful"]', 200000, '2024-03', 'Anthropic 旗舰模型，综合能力最强'),
('claude-3-haiku', 'Claude 3 Haiku', '["fast"]', 200000, '2024-03', 'Anthropic 轻量级模型，响应极快'),
('gemini-1.5-pro', 'Gemini 1.5 Pro', '["vision", "long-context"]', 1000000, '2024-05', 'Google 多模态模型，支持超长上下文'),
('gemini-1.5-flash', 'Gemini 1.5 Flash', '["fast"]', 1000000, '2024-05', 'Google 轻量级模型，速度优先'),
('deepseek-chat', 'DeepSeek V3', '["code"]', 64000, '2024-12', 'DeepSeek 通用对话模型，代码能力优秀'),
('deepseek-reasoner', 'DeepSeek R1', '["reasoning"]', 64000, '2025-01', 'DeepSeek 推理模型，擅长复杂逻辑推理'),
('kimi-k1', 'Kimi K1', '["long-context"]', 200000, '2024-10', 'Moonshot 长上下文模型'),
('kimi-k1.5', 'Kimi K1.5', '["reasoning"]', 200000, '2025-01', 'Moonshot 推理模型'),
('qwen-max', 'Qwen Max', '["powerful"]', 32000, '2024-09', '通义千问旗舰模型'),
('qwen-turbo', 'Qwen Turbo', '["fast"]', 32000, '2024-09', '通义千问轻量级模型');

-- ============================================
-- provider_info: 厂商基本信息
-- ============================================

INSERT INTO provider_info (provider, display_name, description, policies, logo_url) VALUES
('openai', 'OpenAI', 'OpenAI 是全球领先的 AI 研究公司，开发了 GPT 系列模型。', '["API 按 token 计费", "支持流式输出", "提供多语言 SDK"]', '/assets/logo/openai.png'),
('anthropic', 'Anthropic', 'Anthropic 致力于构建可靠、可解释和可操控的 AI 系统，开发了 Claude 系列模型。', '["注重 AI 安全", "支持长上下文", "提供对话式接口"]', '/assets/logo/anthropic.png'),
('google', 'Google', 'Google DeepMind 整合了 Google 的 AI 研究力量，开发了 Gemini 系列模型。', '["支持多模态输入", "与 Google 云服务集成", "提供免费额度"]', '/assets/logo/google.png'),
('deepseek', 'DeepSeek', 'DeepSeek 是中国领先的 AI 公司，以高性价比的模型和开源策略著称。', '["价格极具竞争力", "开源部分模型权重", "支持中文优化"]', '/assets/logo/deepseek.png'),
('moonshot', 'Moonshot AI', 'Moonshot AI（月之暗面）是中国 AI 创业公司，开发了 Kimi 系列模型。', '["支持超长上下文", "专注中文场景", "提供网页和 API 服务"]', '/assets/logo/moonshot.png'),
('alibaba', '阿里巴巴', '阿里云通义千问是中国领先的大语言模型系列。', '["与阿里云生态集成", "支持中文优化", "提供多种规格模型"]', '/assets/logo/alibaba.png'),
('azure', 'Azure', 'Microsoft Azure OpenAI Service 提供企业级的 OpenAI 模型托管服务。', '["企业级 SLA 保障", "与 Azure 生态集成", "支持私有部署"]', '/assets/logo/azure.png'),
('siliconflow', '硅基流动', '硅基流动是中国 AI 基础设施提供商，聚合了多种开源模型。', '["支持多种开源模型", "提供国内节点", "按量计费"]', '/assets/logo/siliconflow.png');
