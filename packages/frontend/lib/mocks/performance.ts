import type {
  FilterOptions,
  LeaderboardItem,
  ModelCatalogItem,
  ModelsCatalogResponse,
  ProviderCatalogItem,
  ProvidersCatalogResponse,
  ProviderOverview,
  ProviderModelsResponse,
  ModelEntriesResponse,
  ModelComparisonResponse,
  DetailResponse,
} from "@/lib/types";

const MOCK_PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "Google",
  "DeepSeek",
  "阿里云",
  "硅基流动",
  "Moonshot",
  "Azure",
  "Cohere",
  "Mistral",
];

const MOCK_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "claude-3-5-sonnet",
  "claude-3-opus",
  "claude-3-haiku",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "deepseek-chat",
  "deepseek-reasoner",
  "qwen-turbo",
  "qwen-plus",
  "qwen-max",
  "kimi-k1",
  "kimi-k1.5",
  "command-r",
  "mistral-large",
];

// 每个 provider 擅长的模型及其基准性能
const PROVIDER_MODEL_PERF: Record<
  string,
  { model: string; baseTps: number; baseTtft: number }[]
> = {
  OpenAI: [
    { model: "gpt-4o", baseTps: 85, baseTtft: 180 },
    { model: "gpt-4o-mini", baseTps: 145, baseTtft: 120 },
    { model: "gpt-4-turbo", baseTps: 62, baseTtft: 240 },
  ],
  Anthropic: [
    { model: "claude-3-5-sonnet", baseTps: 72, baseTtft: 200 },
    { model: "claude-3-opus", baseTps: 45, baseTtft: 320 },
    { model: "claude-3-haiku", baseTps: 110, baseTtft: 90 },
  ],
  Google: [
    { model: "gemini-1.5-pro", baseTps: 95, baseTtft: 160 },
    { model: "gemini-1.5-flash", baseTps: 130, baseTtft: 110 },
  ],
  DeepSeek: [
    { model: "deepseek-chat", baseTps: 68, baseTtft: 220 },
    { model: "deepseek-reasoner", baseTps: 35, baseTtft: 450 },
  ],
  阿里云: [
    { model: "qwen-turbo", baseTps: 120, baseTtft: 100 },
    { model: "qwen-plus", baseTps: 88, baseTtft: 170 },
    { model: "qwen-max", baseTps: 55, baseTtft: 280 },
  ],
  硅基流动: [
    { model: "deepseek-chat", baseTps: 75, baseTtft: 190 },
    { model: "qwen-plus", baseTps: 92, baseTtft: 155 },
    { model: "mistral-large", baseTps: 80, baseTtft: 175 },
  ],
  Moonshot: [
    { model: "kimi-k1", baseTps: 58, baseTtft: 260 },
    { model: "kimi-k1.5", baseTps: 48, baseTtft: 310 },
  ],
  Azure: [
    { model: "gpt-4o", baseTps: 78, baseTtft: 210 },
    { model: "gpt-4o-mini", baseTps: 132, baseTtft: 135 },
    { model: "gpt-4-turbo", baseTps: 55, baseTtft: 280 },
  ],
  Cohere: [
    { model: "command-r", baseTps: 65, baseTtft: 230 },
  ],
  Mistral: [
    { model: "mistral-large", baseTps: 70, baseTtft: 195 },
  ],
  硅基流动: [
    { model: "gpt-4o-mini", baseTps: 138, baseTtft: 125 },
    { model: "deepseek-chat", baseTps: 75, baseTtft: 190 },
    { model: "qwen-plus", baseTps: 92, baseTtft: 155 },
    { model: "mistral-large", baseTps: 80, baseTtft: 175 },
  ],
  Moonshot: [
    { model: "gpt-4o-mini", baseTps: 128, baseTtft: 140 },
    { model: "kimi-k1", baseTps: 58, baseTtft: 260 },
    { model: "kimi-k1.5", baseTps: 48, baseTtft: 310 },
  ],
};

// 输入长度对性能的影响系数
const BUCKET_FACTORS: Record<string, { tpsFactor: number; ttftFactor: number }> = {
  short: { tpsFactor: 1.15, ttftFactor: 0.85 },
  medium: { tpsFactor: 1.0, ttftFactor: 1.0 },
  long: { tpsFactor: 0.75, ttftFactor: 1.4 },
};

// 模型基本信息
const MODEL_BASE_INFO: Record<string, {
  displayName: string;
  parameters: string;
  contextWindow: string;
  releaseDate: string;
  description: string;
}> = {
  "gpt-4o": {
    displayName: "GPT-4o",
    parameters: "—",
    contextWindow: "128k",
    releaseDate: "2024-05",
    description: "OpenAI 旗舰多模态模型，支持文本、图像和音频输入输出",
  },
  "gpt-4o-mini": {
    displayName: "GPT-4o Mini",
    parameters: "—",
    contextWindow: "128k",
    releaseDate: "2024-07",
    description: "轻量级多模态模型，速度快、成本低，适合高频场景",
  },
  "gpt-4-turbo": {
    displayName: "GPT-4 Turbo",
    parameters: "—",
    contextWindow: "128k",
    releaseDate: "2023-11",
    description: "强大的文本理解与生成能力，支持代码和长上下文",
  },
  "claude-3-5-sonnet": {
    displayName: "Claude 3.5 Sonnet",
    parameters: "—",
    contextWindow: "200k",
    releaseDate: "2024-06",
    description: "Anthropic 均衡型模型，在推理和编码方面表现出色",
  },
  "claude-3-opus": {
    displayName: "Claude 3 Opus",
    parameters: "—",
    contextWindow: "200k",
    releaseDate: "2024-03",
    description: "Anthropic 最强模型，适合复杂推理和深度分析",
  },
  "claude-3-haiku": {
    displayName: "Claude 3 Haiku",
    parameters: "—",
    contextWindow: "200k",
    releaseDate: "2024-03",
    description: "Anthropic 最快模型，低延迟，适合实时应用",
  },
  "gemini-1.5-pro": {
    displayName: "Gemini 1.5 Pro",
    parameters: "—",
    contextWindow: "1M",
    releaseDate: "2024-05",
    description: "Google 专业级模型，超长款上下文窗口，多模态能力强",
  },
  "gemini-1.5-flash": {
    displayName: "Gemini 1.5 Flash",
    parameters: "—",
    contextWindow: "1M",
    releaseDate: "2024-06",
    description: "Google 轻量快速模型，适合大规模部署",
  },
  "deepseek-chat": {
    displayName: "DeepSeek Chat",
    parameters: "—",
    contextWindow: "64k",
    releaseDate: "2024-01",
    description: "DeepSeek 通用对话模型，性价比高，中文表现优秀",
  },
  "deepseek-reasoner": {
    displayName: "DeepSeek Reasoner",
    parameters: "—",
    contextWindow: "64k",
    releaseDate: "2024-12",
    description: "DeepSeek 推理模型，擅长数学、代码和逻辑推理",
  },
  "qwen-turbo": {
    displayName: "Qwen Turbo",
    parameters: "—",
    contextWindow: "128k",
    releaseDate: "2024-03",
    description: "阿里云通义千问极速版，低延迟高并发",
  },
  "qwen-plus": {
    displayName: "Qwen Plus",
    parameters: "—",
    contextWindow: "128k",
    releaseDate: "2024-03",
    description: "阿里云通义千问增强版，均衡性能与成本",
  },
  "qwen-max": {
    displayName: "Qwen Max",
    parameters: "—",
    contextWindow: "128k",
    releaseDate: "2024-03",
    description: "阿里云通义千问旗舰版，最强理解和生成能力",
  },
  "kimi-k1": {
    displayName: "Kimi K1",
    parameters: "—",
    contextWindow: "200k",
    releaseDate: "2024-06",
    description: "Moonshot 长文本模型，支持超长上下文理解",
  },
  "kimi-k1.5": {
    displayName: "Kimi K1.5",
    parameters: "—",
    contextWindow: "200k",
    releaseDate: "2024-10",
    description: "Moonshot 增强版长文本模型，推理能力更强",
  },
  "command-r": {
    displayName: "Command R",
    parameters: "—",
    contextWindow: "128k",
    releaseDate: "2024-03",
    description: "Cohere 企业级 RAG 模型，擅长检索增强生成",
  },
  "mistral-large": {
    displayName: "Mistral Large",
    parameters: "—",
    contextWindow: "128k",
    releaseDate: "2024-02",
    description: "Mistral AI 旗舰模型，多语言能力强",
  },
};

// 厂商基本信息
const PROVIDER_BASE_INFO: Record<string, {
  displayName: string;
  description: string;
  policies: string[];
}> = {
  OpenAI: {
    displayName: "OpenAI",
    description: "全球领先的 AI 研究机构，致力于开发通用人工智能",
    policies: [
      "2024 年推出 GPT-4o 系列多模态模型",
      "强化 API 速率限制与用量管控策略",
      "扩展企业级服务与合规认证体系",
    ],
  },
  Anthropic: {
    displayName: "Anthropic",
    description: "以 AI 安全为核心的研究公司，提出宪法 AI 方法",
    policies: [
      "2024 年发布 Claude 3.5 Sonnet，编码能力大幅提升",
      "推出计算机使用功能，支持自动化操作",
      "持续强化负责任扩展政策框架",
    ],
  },
  Google: {
    displayName: "Google",
    description: "全球最大搜索引擎公司，Gemini 系列模型开发者",
    policies: [
      "Gemini 1.5 Pro 支持 100 万 token 上下文窗口",
      "Gemini API 定价持续下调，增强竞争力",
      "深化与 Google Cloud 的企业级集成",
    ],
  },
  DeepSeek: {
    displayName: "DeepSeek",
    description: "幻方量化旗下 AI 公司，以高性价比模型著称",
    policies: [
      "2024 年底发布 DeepSeek-V3，性能对标 GPT-4o",
      "推理模型 R1 在数学和代码任务上表现突出",
      "API 价格极具竞争力，推动行业降价",
    ],
  },
  阿里云: {
    displayName: "阿里云",
    description: "阿里巴巴旗下云计算平台，通义千问系列模型开发者",
    policies: [
      "通义千问 2.5 系列全面升级多模态能力",
      "百炼平台降低大模型应用开发门槛",
      "Qwen 开源模型在全球开发者社区广泛采用",
    ],
  },
  硅基流动: {
    displayName: "硅基流动",
    description: "国内大模型 API 聚合平台，提供多厂商模型接入",
    policies: [
      "持续扩展支持的模型厂商和版本",
      "推出批量推理和流式输出优化",
      "针对国内开发者优化网络延迟",
    ],
  },
  Moonshot: {
    displayName: "Moonshot",
    description: "月之暗面科技有限公司，专注长文本处理技术",
    policies: [
      "Kimi 智能助手支持 200 万字上下文",
      "推出 Kimi K1.5 增强推理模型",
      "面向 C 端用户提供免费长文本服务",
    ],
  },
  Azure: {
    displayName: "Azure",
    description: "微软云计算平台，OpenAI 模型的企业级部署渠道",
    policies: [
      "Azure OpenAI Service 扩展至更多区域",
      "增强企业合规与数据驻留能力",
      "与 Microsoft 365 Copilot 深度集成",
    ],
  },
  Cohere: {
    displayName: "Cohere",
    description: "专注于企业级 NLP 和 RAG 解决方案的 AI 公司",
    policies: [
      "Command R+ 专为检索增强生成优化",
      "推出 Embed 系列多语言嵌入模型",
      "聚焦企业私有化部署与数据安全",
    ],
  },
  Mistral: {
    displayName: "Mistral",
    description: "欧洲领先的开源大模型公司，Mixtral 系列开发者",
    policies: [
      "Mixtral 8x22B 开源模型性能强劲",
      "Mistral Large 缩小与闭源模型差距",
      "与微软 Azure 达成战略合作",
    ],
  },
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function generateMockLeaderboardData(params: {
  provider?: string;
  model?: string;
  input_length_bucket?: string;
  range?: string;
}): LeaderboardItem[] {
  const items: LeaderboardItem[] = [];
  let seed = 42;

  for (const [provider, models] of Object.entries(PROVIDER_MODEL_PERF)) {
    for (const { model, baseTps, baseTtft } of models) {
      for (const bucket of ["short", "medium", "long"] as const) {
        if (params.provider && provider !== params.provider) continue;
        if (params.model && model !== params.model) continue;
        if (params.input_length_bucket && bucket !== params.input_length_bucket) continue;

        const factor = BUCKET_FACTORS[bucket];
        const rand1 = seededRandom(seed++);
        const rand2 = seededRandom(seed++);
        const rand3 = seededRandom(seed++);
        const rand4 = seededRandom(seed++);
        const rand5 = seededRandom(seed++);
        const rand6 = seededRandom(seed++);

        const avg_tps = Math.max(5, baseTps * factor.tpsFactor * (0.85 + rand1 * 0.3));
        const avg_ttft_ms = Math.max(30, baseTtft * factor.ttftFactor * (0.9 + rand2 * 0.2));
        const sample_count = Math.floor(50 + rand3 * 2500);

        // 趋势变化 —— 绝对值，时间基准跟随 range 参数
        const trend_tps_change = Number((rand4 * 20 - 10).toFixed(1));      // -10 ~ +10
        const trend_ttft_change = Math.floor(rand5 * 40 - 20);               // -20 ~ +20 ms
        const trend_samples_change = Math.floor(rand6 * 600 - 300);          // -300 ~ +300

        // 排名变化（-5 到 +5）
        const rank_change = Math.floor((rand4 - 0.5) * 10);

        items.push({
          provider,
          model,
          avg_tps: Number(avg_tps.toFixed(1)),
          avg_ttft_ms: Math.floor(avg_ttft_ms),
          sample_count,
          input_length_bucket: bucket,
          data_quality: sample_count >= 500 ? "sufficient" : "limited",
          last_reported_at: new Date(Date.now() - Math.floor(rand3 * 86400000 * 3)).toISOString(),
          trend_tps_change,
          trend_ttft_change,
          trend_samples_change,
          rank_change,
        });
      }
    }
  }

  return items.sort((a, b) => b.avg_tps - a.avg_tps);
}

// ==================== 模型库 Mock ====================

export function getMockModelsCatalog(params?: {
  sort_by?: "tps" | "ttft" | "sample_count" | "provider_count" | "best_provider" | "name";
  sort_order?: "asc" | "desc";
}): ModelsCatalogResponse {
  const items: ModelCatalogItem[] = [];

  // 为每个模型聚合所有厂商的数据
  const modelMap = new Map<string, { providers: { name: string; avg_tps: number; avg_ttft_ms: number; sample_count: number }[] }>();

  for (const [provider, models] of Object.entries(PROVIDER_MODEL_PERF)) {
    let seed = 100 + MOCK_PROVIDERS.indexOf(provider) * 10;
    for (const { model, baseTps, baseTtft } of models) {
      if (!modelMap.has(model)) {
        modelMap.set(model, { providers: [] });
      }
      const rand = seededRandom(seed++);
      const avg_tps = baseTps * (0.9 + rand * 0.2);
      const avg_ttft_ms = baseTtft * (0.9 + rand * 0.2);
      modelMap.get(model)!.providers.push({
        name: provider,
        avg_tps,
        avg_ttft_ms,
        sample_count: Math.floor(200 + rand * 2000),
      });
    }
  }

  for (const [model, data] of modelMap) {
    const totalSamples = data.providers.reduce((s, p) => s + p.sample_count, 0);
    const avgTps = data.providers.reduce((s, p) => s + p.avg_tps * p.sample_count, 0) / totalSamples;
    const avgTtft = data.providers.reduce((s, p) => s + p.avg_ttft_ms * p.sample_count, 0) / totalSamples;
    const bestProvider = data.providers.reduce((b, p) => (p.avg_tps > b.avg_tps ? p : b), data.providers[0]);

    items.push({
      model,
      provider_count: data.providers.length,
      avg_tps: Number(avgTps.toFixed(1)),
      avg_ttft_ms: Math.floor(avgTtft),
      total_samples: totalSamples,
      best_provider: {
        name: bestProvider.name,
        display_name: bestProvider.name,
        avg_tps: Number(bestProvider.avg_tps.toFixed(1)),
      },
    });
  }

  // 根据参数排序
  const sortBy = params?.sort_by ?? "tps";
  const sortOrder = params?.sort_order ?? "desc";
  const order = sortOrder === "asc" ? 1 : -1;

  items.sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "tps":
        cmp = a.avg_tps - b.avg_tps;
        break;
      case "ttft":
        cmp = a.avg_ttft_ms - b.avg_ttft_ms;
        break;
      case "sample_count":
        cmp = a.total_samples - b.total_samples;
        break;
      case "provider_count":
        cmp = a.provider_count - b.provider_count;
        break;
      case "best_provider":
        cmp = a.best_provider.name.localeCompare(b.best_provider.name);
        break;
      case "name":
        cmp = a.model.localeCompare(b.model);
        break;
    }
    return cmp * order;
  });

  return { items, total: items.length };
}

// ==================== 厂商库 Mock ====================

export function getMockProvidersCatalog(): ProvidersCatalogResponse {
  const items: ProviderCatalogItem[] = [];

  for (const [provider, models] of Object.entries(PROVIDER_MODEL_PERF)) {
    let seed = 300 + MOCK_PROVIDERS.indexOf(provider) * 10;
    const modelEntries = models.map((m) => {
      const rand = seededRandom(seed++);
      return {
        name: m.model,
        avg_tps: m.baseTps * (0.9 + rand * 0.2),
        avg_ttft_ms: m.baseTtft * (0.9 + rand * 0.2),
        sample_count: Math.floor(100 + rand * 1500),
      };
    });

    const totalSamples = modelEntries.reduce((s, m) => s + m.sample_count, 0);
    const avgTps = modelEntries.reduce((s, m) => s + m.avg_tps * m.sample_count, 0) / totalSamples;
    const avgTtft = modelEntries.reduce((s, m) => s + m.avg_ttft_ms * m.sample_count, 0) / totalSamples;

    // all models sorted by sample_count
    const topModels = [...modelEntries].sort(
      (a, b) => b.sample_count - a.sample_count
    );

    items.push({
      provider,
      name: provider,
      model_count: models.length,
      avg_tps: Number(avgTps.toFixed(1)),
      avg_ttft_ms: Math.floor(avgTtft),
      total_samples: totalSamples,
      top_models: topModels.map((m) => ({
        name: m.name,
        avg_tps: Number(m.avg_tps.toFixed(1)),
        avg_ttft_ms: Math.floor(m.avg_ttft_ms),
        sample_count: m.sample_count,
      })),
    });
  }

  items.sort((a, b) => b.avg_tps - a.avg_tps);

  return { items, total: items.length };
}

// ==================== 厂商详情 Mock ====================

export function getMockProviderOverview(
  provider: string,
  params: { range?: string; input_length_bucket?: string } = {}
): ProviderOverview {
  const models = PROVIDER_MODEL_PERF[provider] || [];
  let seed = 400 + MOCK_PROVIDERS.indexOf(provider) * 10;
  const rangeFactor = params.range === "24h" ? 1.0 : params.range === "7d" ? 0.95 : 0.9;

  const modelEntries = models.map((m) => {
    const rand = seededRandom(seed++);
    if (params.input_length_bucket) {
      const factor = BUCKET_FACTORS[params.input_length_bucket];
      return {
        model: m.model,
        avg_tps: m.baseTps * factor.tpsFactor * (0.9 + rand * 0.2) * rangeFactor,
        avg_ttft_ms: m.baseTtft * factor.ttftFactor * (0.9 + rand * 0.2) * rangeFactor,
        sample_count: Math.floor(50 + rand * 800),
      };
    }
    return {
      model: m.model,
      avg_tps: m.baseTps * (0.9 + rand * 0.2) * rangeFactor,
      avg_ttft_ms: m.baseTtft * (0.9 + rand * 0.2) * rangeFactor,
      sample_count: Math.floor(100 + rand * 1500),
    };
  });

  const totalSamples = modelEntries.reduce((s, m) => s + m.sample_count, 0);
  const avgTps = modelEntries.reduce((s, m) => s + m.avg_tps * m.sample_count, 0) / totalSamples;
  const avgTtft = modelEntries.reduce((s, m) => s + m.avg_ttft_ms * m.sample_count, 0) / totalSamples;
  const bestCombo = modelEntries.reduce((b, m) => (m.avg_tps > b.avg_tps ? m : b), modelEntries[0]);

  // 计算 compute_allocation（基于 TPS）
  const totalTps = modelEntries.reduce((s, m) => s + m.avg_tps, 0);
  const compute_allocation = modelEntries.map((m) => ({
    model: m.model,
    sample_count: m.sample_count,
    percentage: totalTps > 0 ? Number(((m.avg_tps / totalTps) * 100).toFixed(1)) : 0,
    avg_tps: Number(m.avg_tps.toFixed(1)),
  }));
  compute_allocation.sort((a, b) => b.percentage - a.percentage);

  return {
    provider,
    provider_name: provider,
    overview: {
      avg_tps: Number(avgTps.toFixed(1)),
      avg_ttft_ms: Math.floor(avgTtft),
      best_combo: {
        model: bestCombo.model,
        tps: Number(bestCombo.avg_tps.toFixed(1)),
        ttft_ms: Math.floor(bestCombo.avg_ttft_ms),
      },
      total_models: models.length,
      total_samples: totalSamples,
    },
    compute_allocation,
    description: null,
    policies: [],
  };
}

export function getMockProviderModels(
  provider: string,
  params: { range?: string; input_length_bucket?: string; model?: string } = {}
): ProviderModelsResponse {
  const models = PROVIDER_MODEL_PERF[provider] || [];
  let seed = 500 + MOCK_PROVIDERS.indexOf(provider) * 10;
  const rangeFactor = params.range === "24h" ? 1.0 : params.range === "7d" ? 0.95 : 0.9;

  const items = models.flatMap((m) => {
    if (params.model && m.model !== params.model) return [];

    /* 既没有指定 model 也没有指定 bucket → 返回聚合数据（每个模型一条） */
    if (!params.model && !params.input_length_bucket) {
      const rand = seededRandom(seed++);
      const avgTpsFactor =
        (BUCKET_FACTORS.short.tpsFactor +
          BUCKET_FACTORS.medium.tpsFactor +
          BUCKET_FACTORS.long.tpsFactor) /
        3;
      const avgTtftFactor =
        (BUCKET_FACTORS.short.ttftFactor +
          BUCKET_FACTORS.medium.ttftFactor +
          BUCKET_FACTORS.long.ttftFactor) /
        3;
      return [
        {
          model: m.model,
          input_length_bucket: null,
          avg_tps: Number(
            (m.baseTps * avgTpsFactor * (0.9 + rand * 0.2) * rangeFactor).toFixed(1)
          ),
          avg_ttft_ms: Math.floor(
            m.baseTtft * avgTtftFactor * (0.9 + rand * 0.2) * rangeFactor
          ),
          sample_count: Math.floor(150 + rand * 2400),
          data_quality: "sufficient" as const,
        },
      ];
    }

    /* 其他情况：指定了 model 或 bucket */
    const buckets = params.input_length_bucket
      ? [params.input_length_bucket]
      : (["short", "medium", "long"] as const);
    return buckets.map((bucket) => {
      const rand = seededRandom(seed++);
      const factor = BUCKET_FACTORS[bucket];
      return {
        model: m.model,
        input_length_bucket: bucket,
        avg_tps: Number(
          (m.baseTps * factor.tpsFactor * (0.9 + rand * 0.2) * rangeFactor).toFixed(1)
        ),
        avg_ttft_ms: Math.floor(
          m.baseTtft * factor.ttftFactor * (0.9 + rand * 0.2) * rangeFactor
        ),
        sample_count: Math.floor(50 + rand * 800),
        data_quality: "sufficient" as const,
      };
    });
  });

  return {
    items,
    available_filters: {
      models: models.map((m) => m.model),
    },
  };
}

export function getMockModelInfo(
  provider: string,
  params: { model?: string } = {}
): import("@/lib/types").ModelInfoResponse {
  const models = PROVIDER_MODEL_PERF[provider] || [];
  const items = models
    .filter((m) => !params.model || m.model === params.model)
    .map((m) => {
      const info = MODEL_BASE_INFO[m.model];
      return {
        model: m.model,
        displayName: info?.displayName || m.model,
        parameters: info?.parameters || "—",
        contextWindow: info?.contextWindow || "—",
        releaseDate: info?.releaseDate || "—",
        description: info?.description || "",
      };
    });
  return { items };
}

// ==================== 模型详情 Mock ====================

export function getMockModelEntries(
  model: string,
  params: { input_length_bucket?: string; provider?: string } = {}
): ModelEntriesResponse {
  // 先生成该模型所有厂商所有 bucket 的原始数据
  const allEntries: ModelEntriesResponse["items"] = [];
  let seed = 700;

  for (const [provider, models] of Object.entries(PROVIDER_MODEL_PERF)) {
    const found = models.find((m) => m.model === model);
    if (found) {
      for (const bucket of ["short", "medium", "long"] as const) {
        const rand = seededRandom(seed++);
        const factor = BUCKET_FACTORS[bucket];
        allEntries.push({
          provider,
          provider_name: provider,
          input_length_bucket: bucket,
          avg_tps: Number((found.baseTps * factor.tpsFactor * (0.9 + rand * 0.2)).toFixed(1)),
          avg_ttft_ms: Math.floor(found.baseTtft * factor.ttftFactor * (0.9 + rand * 0.2)),
          sample_count: Math.floor(50 + rand * 800),
          data_quality: "sufficient" as const,
        });
      }
    }
  }

  const allProviders = [...new Set(allEntries.map((e) => e.provider))];

  // 场景1: 选了具体厂商 + 没选输入长度 → 返回该厂商所有 bucket 的明细（3行）
  if (params.provider && !params.input_length_bucket) {
    const filtered = allEntries.filter((e) => e.provider === params.provider);
    filtered.sort((a, b) => b.avg_tps - a.avg_tps);
    return { items: filtered, available_filters: { providers: allProviders }, meta: null };
  }

  // 场景2: 没选厂商 + 没选输入长度 → 每厂商聚合为1行，input_length_bucket = null
  if (!params.provider && !params.input_length_bucket) {
    const grouped = new Map<
      string,
      { provider: string; provider_name: string; totalSamples: number; weightedTps: number; weightedTtft: number }
    >();

    for (const entry of allEntries) {
      if (!grouped.has(entry.provider)) {
        grouped.set(entry.provider, {
          provider: entry.provider,
          provider_name: entry.provider_name,
          totalSamples: 0,
          weightedTps: 0,
          weightedTtft: 0,
        });
      }
      const g = grouped.get(entry.provider)!;
      g.totalSamples += entry.sample_count;
      g.weightedTps += entry.avg_tps * entry.sample_count;
      g.weightedTtft += entry.avg_ttft_ms * entry.sample_count;
    }

    const aggregated: ModelEntriesResponse["items"] = [];
    for (const g of grouped.values()) {
      aggregated.push({
        provider: g.provider,
        provider_name: g.provider_name,
        input_length_bucket: null,
        avg_tps: Number((g.weightedTps / g.totalSamples).toFixed(1)),
        avg_ttft_ms: Math.floor(g.weightedTtft / g.totalSamples),
        sample_count: g.totalSamples,
        data_quality: g.totalSamples >= 500 ? "sufficient" : "limited",
      });
    }
    aggregated.sort((a, b) => b.avg_tps - a.avg_tps);
    return { items: aggregated, available_filters: { providers: allProviders }, meta: null };
  }

  // 场景3: 选了输入长度（不管厂商有没有选）→ 按条件过滤返回
  let entries = allEntries;
  if (params.input_length_bucket) {
    entries = entries.filter((e) => e.input_length_bucket === params.input_length_bucket);
  }
  if (params.provider) {
    entries = entries.filter((e) => e.provider === params.provider);
  }

  entries.sort((a, b) => b.avg_tps - a.avg_tps);
  return { items: entries, available_filters: { providers: allProviders }, meta: null };
}

export function getMockModelComparison(model: string): ModelComparisonResponse {
  const data: ModelComparisonResponse["data"] = { "24h": [], "7d": [], "30d": [] };
  let seed = 800;

  for (const range of (["24h", "7d", "30d"] as const)) {
    for (const [provider, models] of Object.entries(PROVIDER_MODEL_PERF)) {
      const found = models.find((m) => m.model === model);
      if (found) {
        const rand = seededRandom(seed++);
        const factor = range === "24h" ? 1.0 : range === "7d" ? 0.95 : 0.9;
        data[range].push({
          provider,
          name: provider,
          avg_tps: Number((found.baseTps * factor * (0.9 + rand * 0.2)).toFixed(1)),
          avg_ttft: Math.floor(found.baseTtft * factor * (0.9 + rand * 0.2)),
        });
      }
    }
    data[range].sort((a, b) => b.avg_tps - a.avg_tps);
  }

  return { model, data };
}

// ==================== 性能榜 (已有) ====================

export const mockFilterOptions: FilterOptions = {
  providers: MOCK_PROVIDERS,
  input_length_buckets: ["short", "medium", "long"],
  input_length_bucket_meta: [
    {
      key: "short",
      label: "短文本",
      min_tokens: 0,
      max_tokens: 4096,
      description: "0 - 4096 tokens",
    },
    {
      key: "medium",
      label: "中文本",
      min_tokens: 4097,
      max_tokens: 16384,
      description: "4097 - 16384 tokens",
    },
    {
      key: "long",
      label: "长文本",
      min_tokens: 16385,
      max_tokens: null,
      description: "大于 16384 tokens",
    },
  ],
  models: MOCK_MODELS,
};

export function getMockLeaderboard(params: {
  provider?: string;
  model?: string;
  input_length_bucket?: string;
  range?: string;
}): LeaderboardItem[] {
  return generateMockLeaderboardData(params);
}

export function getMockFilterOptions(): FilterOptions {
  return mockFilterOptions;
}

// ==================== Detail 页面趋势数据 ====================

export function getMockModelInsights(
  model: string
): import("@/lib/types").ModelInsightsResponse {
  // 仅 GPT-4o mini 有数据洞察，其余模型返回空以测试空状态 UI
  if (model !== "gpt-4o-mini") {
    return { insights: [] };
  }

  return {
    insights: [
      {
        icon: "speed",
        title: "短输入性能最佳",
        description: "短输入下 TPS 达到 162.9，比长输入快 49%",
      },
      {
        icon: "trend",
        title: "TTFT 随长度递增",
        description: "输入越长，首字延迟越高，长输入 TTFT 比短输入高 74%",
      },
      {
        icon: "stability",
        title: "性能波动适中",
        description: "近 7 天 TPS 在 124~167 之间波动，标准差约 12%",
      },
      {
        icon: "sample",
        title: "样本量充足",
        description: "共收集 28 个测试样本，数据可信度较高",
      },
    ],
  };
}

export function getMockDetail(
  provider: string,
  model: string,
  range: "24h" | "7d" | "30d",
  inputLengthBucket?: string
): DetailResponse {
  const found = PROVIDER_MODEL_PERF[provider]?.find((m) => m.model === model);
  if (!found) {
    return { trend: [] };
  }

  const bucketFactor = inputLengthBucket
    ? BUCKET_FACTORS[inputLengthBucket]
    : { tpsFactor: 1.0, ttftFactor: 1.0 };

  const baseTps = found.baseTps * bucketFactor.tpsFactor;
  const baseTtft = found.baseTtft * bucketFactor.ttftFactor;

  const now = new Date();
  const trend: DetailResponse["trend"] = [];

  let pointCount: number;
  let intervalMs: number;

  switch (range) {
    case "24h":
      pointCount = 24;
      intervalMs = 60 * 60 * 1000; // 1小时
      break;
    case "7d":
      pointCount = 28;
      intervalMs = 6 * 60 * 60 * 1000; // 6小时
      break;
    case "30d":
      pointCount = 30;
      intervalMs = 24 * 60 * 60 * 1000; // 1天
      break;
  }

  for (let i = pointCount - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * intervalMs);
    const seed =
      provider.length * 1000 +
      model.length * 100 +
      i * 7 +
      (inputLengthBucket?.length ?? 0) * 3;
    const rand1 = seededRandom(seed);
    const rand2 = seededRandom(seed + 1);
    const rand3 = seededRandom(seed + 2);

    // TPS 在基准值上下波动 ±15%
    const avgTps = baseTps * (0.85 + rand1 * 0.3);
    // TTFT 在基准值上下波动 ±20%
    const avgTtft = baseTtft * (0.8 + rand2 * 0.4);
    // P99 TTFT 约为平均值的 1.2~1.8 倍
    const p99Ttft = avgTtft * (1.2 + rand3 * 0.6);

    trend.push({
      time: time.toISOString(),
      avg_tps: Number(avgTps.toFixed(1)),
      avg_ttft_ms: Math.floor(avgTtft),
      p99_ttft_ms: Math.floor(p99Ttft),
    });
  }

  return { trend };
}

