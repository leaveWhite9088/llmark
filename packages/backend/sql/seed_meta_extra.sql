-- LLMark 补充元数据填充脚本
-- 为 reports 中已存在但 seed_meta.sql 未覆盖的模型和供应商补充数据

-- ============================================
-- model_meta: 补充模型
-- ============================================

INSERT INTO model_meta (model, display_name, tags, context_window, release_date, description) VALUES
-- Anthropic
('claude-3-5-haiku', 'Claude 3.5 Haiku', '["fast"]', 200000, '2024-09', 'Anthropic 超轻量级模型，响应速度极快'),
('claude-3-7-sonnet', 'Claude 3.7 Sonnet', '["vision", "code", "reasoning"]', 200000, '2025-02', 'Anthropic 最新平衡型模型，支持扩展推理模式'),

-- OpenAI
('gpt-4.1', 'GPT-4.1', '["vision", "code", "long-context"]', 1000000, '2025-04', 'OpenAI GPT-4.1 系列，支持百万级上下文'),
('gpt-4.1-mini', 'GPT-4.1 Mini', '["fast", "vision"]', 1000000, '2025-04', 'OpenAI GPT-4.1 轻量版，高性价比'),
('o3', 'o3', '["reasoning", "powerful"]', 200000, '2025-01', 'OpenAI o3 推理模型，复杂任务表现出色'),
('o3-mini', 'o3 Mini', '["reasoning", "fast"]', 200000, '2025-01', 'OpenAI o3 轻量推理模型'),
('o4-mini', 'o4 Mini', '["reasoning", "fast"]', 200000, '2025-04', 'OpenAI o4 系列轻量推理模型'),

-- Google
('gemini-2.0-flash', 'Gemini 2.0 Flash', '["fast", "vision"]', 1000000, '2025-02', 'Google 新一代轻量级多模态模型'),
('gemini-2.5-pro', 'Gemini 2.5 Pro', '["vision", "long-context", "reasoning"]', 1000000, '2025-03', 'Google 旗舰多模态模型，推理能力大幅提升'),

-- DeepSeek
('deepseek-coder', 'DeepSeek Coder', '["code"]', 64000, '2023-11', 'DeepSeek 代码专用模型'),
('deepseek-v3', 'DeepSeek V3', '["code", "powerful"]', 64000, '2024-12', 'DeepSeek 第三代通用模型，性能全面增强'),

-- Moonshot
('moonshot-v1-8k', 'Kimi K1 8K', '["fast"]', 8192, '2024-10', 'Moonshot 短上下文轻量模型'),
('moonshot-v1-32k', 'Kimi K1 32K', '["long-context"]', 32000, '2024-10', 'Moonshot 中上下文模型'),
('moonshot-v1-128k', 'Kimi K1 128K', '["long-context"]', 128000, '2024-10', 'Moonshot 长上下文模型'),

-- Alibaba / Qwen
('qwen-long', 'Qwen Long', '["long-context"]', 1000000, '2024-06', '通义千问超长上下文模型，支持百万级 tokens'),
('qwen-plus', 'Qwen Plus', '["powerful"]', 32000, '2024-09', '通义千问增强版模型'),
('qwen2.5-72b-instruct', 'Qwen2.5 72B', '["powerful", "code"]', 32000, '2024-09', 'Qwen2.5 720亿参数指令模型'),
('qwen2.5-coder-32b', 'Qwen2.5 Coder 32B', '["code"]', 32000, '2024-09', 'Qwen2.5 320亿参数代码专用模型'),

-- MiniMax
('abab5.5-chat', 'MiniMax abab5.5', '["fast"]', 8192, '2023-08', 'MiniMax 早期对话模型'),
('abab6.5g-chat', 'MiniMax abab6.5g', '["powerful"]', 8192, '2024-04', 'MiniMax 通用增强版模型'),
('abab6.5s-chat', 'MiniMax abab6.5s', '["fast"]', 8192, '2024-04', 'MiniMax 轻量版模型'),

-- Mistral
('codestral-latest', 'Codestral', '["code"]', 32000, '2024-05', 'Mistral 代码专用模型'),
('ministral-8b', 'Ministral 8B', '["fast"]', 128000, '2024-10', 'Mistral 80亿参数轻量模型'),
('mistral-large', 'Mistral Large', '["powerful"]', 128000, '2024-02', 'Mistral 旗舰模型'),

-- Cohere
('command-a', 'Command A', '["powerful"]', 256000, '2025-03', 'Cohere 最新旗舰指令模型'),
('command-r', 'Command R', '["long-context"]', 128000, '2024-03', 'Cohere 长上下文检索增强模型'),
('command-r-plus', 'Command R+', '["long-context", "powerful"]', 128000, '2024-04', 'Cohere 增强版检索模型'),

-- ByteDance / 豆包
('doubao-lite-4k', '豆包 Lite 4K', '["fast"]', 4096, '2024-08', '字节跳动豆包轻量模型'),
('doubao-pro-32k', '豆包 Pro 32K', '["powerful"]', 32000, '2024-08', '字节跳动豆包专业版模型'),
('doubao-vision-pro', '豆包 Vision Pro', '["vision", "powerful"]', 32000, '2024-10', '字节跳动豆包视觉增强模型'),

-- Baidu / 文心
('ernie-3.5-8k', '文心一言 3.5', '["fast"]', 8192, '2023-10', '百度文心一言基础版'),
('ernie-4.0-turbo', '文心一言 4.0 Turbo', '["powerful"]', 8192, '2024-06', '百度文心一言增强版'),
('ernie-speed-128k', '文心 Speed 128K', '["long-context", "fast"]', 128000, '2024-08', '百度文心长上下文极速版'),

-- Tencent / 混元
('hunyuan-lite', '混元 Lite', '["fast"]', 256000, '2024-05', '腾讯混元轻量模型'),
('hunyuan-standard', '混元 Standard', '["powerful"]', 32000, '2024-05', '腾讯混元标准版模型'),
('hunyuan-turbo', '混元 Turbo', '["powerful", "vision"]', 32000, '2024-08', '腾讯混元增强版模型'),

-- Meta / Llama (via SiliconFlow etc.)
('llama-3.1-70b-instruct', 'Llama 3.1 70B', '["open-source", "powerful"]', 128000, '2024-07', 'Meta Llama 3.1 700亿参数开源模型'),

-- Zhipu AI / 智谱
('glm-4-air', 'GLM-4 Air', '["fast"]', 128000, '2024-06', '智谱 GLM-4 轻量版'),
('glm-4-flash', 'GLM-4 Flash', '["fast"]', 128000, '2024-09', '智谱 GLM-4 极速版'),
('glm-4-plus', 'GLM-4 Plus', '["powerful", "vision"]', 128000, '2024-09', '智谱 GLM-4 增强版');

-- ============================================
-- provider_info: 补充供应商
-- ============================================

INSERT INTO provider_info (provider, display_name, description, policies, logo_url) VALUES
('aliyun', '阿里云', '阿里云是中国领先的云计算服务商，提供通义千问系列大模型。', '["与阿里云生态深度集成", "支持国内节点", "按量计费"]','/assets/logo/aliyun.png'),
('baidu', '百度', '百度是中国领先的 AI 公司，开发了文心一言系列模型。', '["中文场景优化", "与百度搜索生态集成", "提供多种规格模型"]','/assets/logo/baidu.png'),
('bytedance', '字节跳动', '字节跳动旗下豆包大模型，依托推荐算法优势提供 AI 服务。', '["支持多模态输入", "与字节生态集成", "国内节点覆盖广"]','/assets/logo/bytedance.png'),
('cohere', 'Cohere', 'Cohere 是加拿大 AI 公司，专注于企业级自然语言处理。', '["企业级安全合规", "支持长上下文检索", "提供嵌入模型"]','/assets/logo/cohere.png'),
('minimax', 'MiniMax', 'MiniMax 是中国 AI 创业公司，开发了 abab 系列大模型。', '["支持语音和文本多模态", "国内节点部署", "提供 API 服务"]','/assets/logo/minimax.png'),
('mistral', 'Mistral AI', 'Mistral AI 是法国 AI 公司，以开源模型和高性能闭源模型著称。', '["开源部分模型权重", "欧洲合规优先", "支持多种语言"]','/assets/logo/mistral.png'),
('tencent', '腾讯', '腾讯混元大模型是中国领先的 AI 模型系列。', '["与腾讯生态深度集成", "支持多模态输入", "国内节点覆盖"]','/assets/logo/tencent.png'),
('zhipuai', '智谱 AI', '智谱 AI 是中国领先的 AI 公司，开发了 GLM 系列大模型。', '["开源部分模型权重", "中文场景优化", "提供多种规格模型"]','/assets/logo/zhipuai.png');
