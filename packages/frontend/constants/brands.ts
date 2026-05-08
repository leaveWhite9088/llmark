// 厂商品牌配置
export type ProviderBrand = {
  name: string;           // 显示名称
  color: string;          // 品牌色
  logo: string;           // logo 路径
  gradient?: string;      // 渐变色（可选）
};

export const PROVIDER_BRANDS: Record<string, ProviderBrand> = {
  // ==================== 1. 国际主流模型厂商 ====================
  openai: {
    name: "OpenAI",
    color: "#10A37F",
    logo: "/assets/logo/openai.png",
    gradient: "from-[#10A37F] to-[#0E8A6B]",
  },
  anthropic: {
    name: "Anthropic",
    color: "#D97757",
    logo: "/assets/logo/anthropic.png",
    gradient: "from-[#D97757] to-[#BF6347]",
  },
  google: {
    name: "Google",
    color: "#4285F4",
    logo: "/assets/logo/google.png",
    gradient: "from-[#4285F4] to-[#357ABD]",
  },
  mistral: {
    name: "Mistral",
    color: "#FA5316",
    logo: "/assets/logo/mistral.png",
    gradient: "from-[#FA5316] to-[#D44612]",
  },
  cohere: {
    name: "Cohere",
    color: "#D1F366",
    logo: "/assets/logo/cohere.png",
    gradient: "from-[#D1F366] to-[#B8D659]",
  },

  // ==================== 2. 国内头部模型厂商 ====================
  deepseek: {
    name: "DeepSeek",
    color: "#4F46E5",
    logo: "/assets/logo/deepseek.png",
    gradient: "from-[#4F46E5] to-[#3730A3]",
  },
  moonshot: {
    name: "Kimi",
    color: "#1A1A1A",
    logo: "/assets/logo/kimi.png",
    gradient: "from-[#1A1A1A] to-[#000000]",
  },
  zhipuai: {
    name: "GLM",
    color: "#315EFB",
    logo: "/assets/logo/glm.png",
    gradient: "from-[#315EFB] to-[#274BDB]",
  },
  minimax: {
    name: "MiniMax",
    color: "#DC2626",
    logo: "/assets/logo/minimax.png",
    gradient: "from-[#DC2626] to-[#B91C1C]",
  },
  baichuan: {
    name: "百川智能",
    color: "#FF4D00",
    logo: "/assets/logo/baichuan.png",
    gradient: "from-[#FF4D00] to-[#E64500]",
  },
  "01ai": {
    name: "零一万物",
    color: "#059669",
    logo: "/assets/logo/01ai.png",
    gradient: "from-[#059669] to-[#047857]",
  },
  stepfun: {
    name: "阶跃星辰",
    color: "#0057FF",
    logo: "/assets/logo/stepfun.png",
    gradient: "from-[#0057FF] to-[#0046CC]",
  },
  iflytek: {
    name: "讯飞星火",
    color: "#E60012",
    logo: "/assets/logo/iflytek.png",
    gradient: "from-[#E60012] to-[#CC0010]",
  },
  xiaomi: {
    name: "小米",
    color: "#FF6700", // 小米品牌橙
    logo: "/assets/logo/xiaomi.png",
    gradient: "from-[#FF6700] to-[#E65D00]", // 保持橙色系的渐变质感
  },

  // ==================== 3. 模型聚合与开发者平台 ====================
  siliconflow: {
    name: "SiliconFlow",
    color: "#0061FF",
    logo: "/assets/logo/siliconflow.png",
    gradient: "from-[#0061FF] to-[#004BB3]",
  },
  coze: {
    name: "扣子",
    color: "#6347D9",
    logo: "/assets/logo/coze.png",
    gradient: "from-[#6347D9] to-[#4F38B0]",
  },
  dify: {
    name: "Dify",
    color: "#155EEF",
    logo: "/assets/logo/dify.png",
    gradient: "from-[#155EEF] to-[#1047B3]",
  },
  fastgpt: {
    name: "FastGPT",
    color: "#10B981",
    logo: "/assets/logo/fastgpt.png",
    gradient: "from-[#10B981] to-[#059669]",
  },
  infinity: {
    name: "无问芯穹",
    color: "#22C55E",
    logo: "/assets/logo/infinity.png",
    gradient: "from-[#22C55E] to-[#16A34A]",
  },

  // ==================== 4. 国内主流云服务厂商 ====================
  aliyun: {
    name: "阿里云",
    color: "#FF6A00",
    logo: "/assets/logo/aliyun.png",
    gradient: "from-[#FF6A00] to-[#E65F00]",
  },
  bytedance: {
    name: "火山引擎",
    color: "#165DFF",
    logo: "/assets/logo/volcengine.png",
    gradient: "from-[#165DFF] to-[#0E4AD9]",
  },
  baidu: {
    name: "百度云",
    color: "#2932E1",
    logo: "/assets/logo/baidu.png",
    gradient: "from-[#2932E1] to-[#1F26B0]",
  },
  tencent: {
    name: "腾讯云",
    color: "#0052D9",
    logo: "/assets/logo/tencent.png",
    gradient: "from-[#0052D9] to-[#0041AD]",
  },
  huaweicloud: {
    name: "华为云",
    color: "#FF0000",
    logo: "/assets/logo/huawei.png",
    gradient: "from-[#FF0000] to-[#CC0000]",
  },
  ctyun: {
    name: "天翼云",
    color: "#D7000F",
    logo: "/assets/logo/ctyun.png",
    gradient: "from-[#D7000F] to-[#B3000D]",
  },
  cmcccloud: {
    name: "移动云",
    color: "#0099FF",
    logo: "/assets/logo/cmcc.png",
    gradient: "from-[#0099FF] to-[#007ACC]",
  },
  jdcloud: {
    name: "京东云",
    color: "#E1251B",
    logo: "/assets/logo/jd.png",
    gradient: "from-[#E1251B] to-[#B31D15]",
  },

  // ==================== 5. 国际云服务厂商 ====================
  azure: {
    name: "Azure",
    color: "#0089D6",
    logo: "/assets/logo/azure.png",
    gradient: "from-[#0089D6] to-[#0069A8]",
  },
  aws: {
    name: "AWS",
    color: "#FF9900",
    logo: "/assets/logo/aws.png",
    gradient: "from-[#FF9900] to-[#CC7A00]",
  },
  gcp: {
    name: "GCP",
    color: "#4285F4",
    logo: "/assets/logo/gcp.png",
    gradient: "from-[#4285F4] to-[#357ABD]",
  },
} as const satisfies Record<string, ProviderBrand>;

// 获取厂商品牌配置
export function getProviderBrand(provider: string): ProviderBrand {
  if (!provider) {
    return {
      name: "Unknown",
      color: "#64748B",
      logo: "",
      gradient: "from-slate-400 to-slate-600",
    };
  }
  const key = provider.toLowerCase();
  return PROVIDER_BRANDS[key] || {
    name: provider,
    color: "#64748B",
    logo: "",
    gradient: "from-slate-400 to-slate-600",
  };
}

// 获取厂商颜色
export function getProviderColor(provider: string): string {
  return getProviderBrand(provider).color;
}

// 获取厂商显示名称
export function getProviderName(provider: string): string {
  return getProviderBrand(provider).name;
}

// 格式化模型显示名称：厂商/模型名
export function formatModelName(provider: string, model: string): string {
  const providerName = getProviderName(provider);
  return `${providerName}/${model}`;
}

// ==================== 模型品牌配置 ====================
// 注：这是模型自己的 logo，与厂商 logo 区分开
// 路径规则：/assets/logo/models/{model_key}.png

export type ModelBrand = {
  name: string;           // 显示名称
  color: string;          // 品牌色
  logo: string;           // logo 路径
};

// 主要模型的品牌配置
// 注：这里只配置有特殊显示需求的模型，如需要自定义显示名称或专属 logo
// 大多数模型会通过 MODEL_SERIES_MAP 自动推断所属系列并使用厂商 logo
export const MODEL_BRANDS: Record<string, ModelBrand> = {
  // 示例：如果某个模型需要特殊的显示名称或专属 logo，可以在这里配置
  // "gpt-4o": {
  //   name: "GPT-4o",
  //   color: "#10A37F",
  //   logo: "/assets/logo/models/gpt-4o.png",
  //   fallbackProvider: "openai",
  // },
} as const satisfies Record<string, ModelBrand>;

/**
 * 获取模型品牌配置
 * 智能识别模型所属系列，返回对应的系列 logo
 * 所有 gpt-* 系列都用 chatgpt.png，claude-* 都用 claude.png，以此类推
 */
export function getModelBrand(model: string): ModelBrand & {
  effectiveLogo: string; // 最终生效的 logo 路径
  isModelLogo: boolean;  // 是否是模型专属 logo
} {
  const key = model.toLowerCase();

  // 1. 检查是否有该模型的专属配置（特殊模型单独配置）
  const brand = MODEL_BRANDS[key];
  if (brand && brand.logo) {
    return {
      ...brand,
      effectiveLogo: brand.logo,
      isModelLogo: true,
    };
  }

  // 2. 根据模型名称推断所属系列
  const series = inferSeriesFromModel(model);

  if (series) {
    return {
      name: series.name,
      color: series.color,
      logo: series.logo,
      effectiveLogo: series.logo,
      isModelLogo: true, // 系列 logo 也是模型级别的 logo
    };
  }

  // 3. 完全未知，使用默认配置（尝试用厂商 logo）
  return {
    name: model,
    color: "#64748B",
    logo: "",
    effectiveLogo: "",
    isModelLogo: false,
  };
}

// ==================== 模型系列归属映射 ====================
// 定义模型名称前缀到系列 logo 的映射规则
// 所有 gpt-* 用 chatgpt.png，claude-* 用 claude.png，以此类推

interface SeriesMapping {
  pattern: RegExp;
  logo: string;      // 模型系列 logo 路径
  name: string;      // 显示名称
  color: string;     // 品牌色
}

const MODEL_SERIES_MAP: SeriesMapping[] = [
  // ==================== OpenAI / ChatGPT 系列 ====================
  // gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, gpt-3.5-turbo 等
  // o3, o3-mini, o4-mini, o1 等 reasoning 模型
  { pattern: /^gpt-/i, logo: "/assets/logo/chatgpt.png", name: "ChatGPT", color: "#10A37F" },
  { pattern: /^o\d/i, logo: "/assets/logo/chatgpt.png", name: "ChatGPT", color: "#10A37F" }, // o1, o3, o4-mini
  { pattern: /^chatgpt-/i, logo: "/assets/logo/chatgpt.png", name: "ChatGPT", color: "#10A37F" },

  // ==================== Anthropic / Claude 系列 ====================
  // claude-3-opus, claude-3-5-sonnet, claude-3-7-sonnet, claude-3-5-haiku
  { pattern: /^claude-/i, logo: "/assets/logo/claude.png", name: "Claude", color: "#D97757" },

  // ==================== Google / Gemini & Gemma 系列 ====================
  // Gemini: gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash, gemini-2.5-pro
  // Gemma: gemma-2b, gemma-7b, gemma-2-9b, gemma-2-27b 等开源模型
  { pattern: /^gemini-/i, logo: "/assets/logo/gemini.png", name: "Gemini", color: "#4285F4" },
  { pattern: /^gemma-/i, logo: "/assets/logo/gemini.png", name: "Gemma", color: "#4285F4" },

  // ==================== DeepSeek 系列 ====================
  // deepseek-chat, deepseek-reasoner, deepseek-v3, deepseek-coder, deepseek-v2
  { pattern: /^deepseek-/i, logo: "/assets/logo/deepseek.png", name: "DeepSeek", color: "#4F46E5" },

  // ==================== Moonshot / Kimi 系列 ====================
  // moonshot-v1-8k, moonshot-v1-32k, kimi-k1.5, kimi-v1
  { pattern: /^moonshot-/i, logo: "/assets/logo/kimi.png", name: "Kimi", color: "#1A1A1A" },
  { pattern: /^kimi-/i, logo: "/assets/logo/kimi.png", name: "Kimi", color: "#1A1A1A" },

  // ==================== Zhipu / GLM & ChatGLM 系列 ====================
  // glm-4, glm-4-plus, glm-4-flash, chatglm3, chatglm-pro
  { pattern: /^glm-/i, logo: "/assets/logo/glm.png", name: "GLM", color: "#315EFB" },
  { pattern: /^chatglm/i, logo: "/assets/logo/glm.png", name: "ChatGLM", color: "#315EFB" },

  // ==================== Alibaba / Qwen 系列 ====================
  // qwen, qwen-plus, qwen-turbo, qwen-max, qwen2.5-coder-32b, qwen2.5-72b-instruct
  { pattern: /^qwen/i, logo: "/assets/logo/qwen.png", name: "Qwen", color: "#FF6A00" },

  // ==================== MiniMax 系列 ====================
  // abab6.5g-chat, abab6.5s-chat, abab5.5
  // minimax-m1, minimax-text-01, m2.5 等各种变体
  { pattern: /^abab/i, logo: "/assets/logo/minimax.png", name: "MiniMax", color: "#DC2626" },
  { pattern: /^minimax/i, logo: "/assets/logo/minimax.png", name: "MiniMax", color: "#DC2626" },
  { pattern: /^m\d+(\.\d+)?/i, logo: "/assets/logo/minimax.png", name: "MiniMax", color: "#DC2626" }, // M2.5, M1 等

  // ==================== Mistral 系列 ====================
  // mistral-large, mistral-medium, mistral-small, mistral-7b, mistral-nemo
  // codestral-latest, codestral-2405
  { pattern: /^mistral-/i, logo: "/assets/logo/mistral.png", name: "Mistral", color: "#FA5316" },
  { pattern: /^codestral/i, logo: "/assets/logo/mistral.png", name: "Codestral", color: "#FA5316" },

  // ==================== ByteDance / Doubao 系列 ====================
  // doubao-lite-4k, doubao-pro-32k, doubao-vision-pro, doubao-1.5-pro
  { pattern: /^doubao/i, logo: "/assets/logo/doubao.png", name: "Doubao", color: "#165DFF" },

  // ==================== Baidu / ERNIE 系列 ====================
  // ernie-speed-128k, ernie-4.0-turbo, ernie-bot, ernie-3.5
  // 注：暂时无 ernie.png，使用首字母 "E" 回退（不用 baidu.png 因为它是云服务厂商 logo）
  // { pattern: /^ernie/i, logo: "/assets/logo/ernie.png", name: "ERNIE", color: "#2932E1" },

  // ==================== Tencent / Hunyuan 系列 ====================
  // hunyuan-standard, hunyuan-pro, hunyuan-lite
  { pattern: /^hunyuan/i, logo: "/assets/logo/hunyuan.png", name: "Hunyuan", color: "#0052D9" },

  // ==================== Meta / Llama 系列 ====================
  // llama-2-7b, llama-2-70b, llama-3-8b, llama-3.1-70b-instruct, llama-3.2-1b
  // 注：暂时无 llama.png，会使用首字母 "L" 回退
  { pattern: /^llama-/i, logo: "/assets/logo/llama.png", name: "Llama", color: "#0467DF" },

  // ==================== Cohere 系列 ====================
  // command-r, command-r-plus, command-light, command-nightly
  { pattern: /^command-/i, logo: "/assets/logo/cohere.png", name: "Command", color: "#D1F366" },

  // ==================== 01.AI / Yi 系列 ====================
  // yi-34b, yi-6b, yi-large, yi-medium, yi-vision
  { pattern: /^yi-/i, logo: "/assets/logo/01ai.png", name: "Yi", color: "#059669" },

  // ==================== StepFun / 阶跃星辰 ====================
  // step-1, step-2, step-1v
  { pattern: /^step-/i, logo: "/assets/logo/stepfun.png", name: "Step", color: "#0057FF" },

  // ==================== iFlyTek / 讯飞星火 ====================
  // spark-pro, spark-max, spark-lite, spark4.0-ultra
  { pattern: /^spark/i, logo: "/assets/logo/iflytek.png", name: "Spark", color: "#E60012" },

  // ==================== Baichuan / 百川 ====================
  // baichuan2-7b, baichuan2-13b, baichuan4
  { pattern: /^baichuan/i, logo: "/assets/logo/baichuan.png", name: "Baichuan", color: "#FF4D00" },

  // ==================== xAI / Grok 系列 ====================
  // grok-1, grok-2, grok-beta
  { pattern: /^grok/i, logo: "/assets/logo/xai.png", name: "Grok", color: "#000000" },

  // ==================== AI21 / Jurassic & Jamba ====================
  // j2-ultra, j2-mid, jamba-1.5-mini, jamba-1.5-large
  { pattern: /^j2-/i, logo: "/assets/logo/ai21.png", name: "Jurassic", color: "#6B46C1" },
  { pattern: /^jamba/i, logo: "/assets/logo/ai21.png", name: "Jamba", color: "#6B46C1" },
];

/**
 * 从模型名称推断系列信息
 * 返回匹配的系列配置，没有匹配则返回 null
 */
function inferSeriesFromModel(model: string): SeriesMapping | null {
  for (const series of MODEL_SERIES_MAP) {
    if (series.pattern.test(model)) {
      return series;
    }
  }
  return null;
}

