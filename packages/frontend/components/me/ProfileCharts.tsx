import { useMemo } from "react";
import { Building2, FileText, Box } from "lucide-react";
import { getProviderName } from "@/constants/brands";
import { getInputLengthBucketLabel } from "@/lib/inputLength";
import type { DistributionItem, InputLengthBucketMeta, PersonalModelEntry } from "@/lib/types";

interface ProfileChartsProps {
  providerDistribution: DistributionItem[];
  inputLengthDistribution: DistributionItem[];
  inputLengthBucketMeta?: InputLengthBucketMeta[];
  modelEntries?: PersonalModelEntry[];
}

function formatSampleCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

/* 输入长度排序：短 -> 中 -> 长 */
const BUCKET_ORDER: Record<string, number> = {
  short: 0,
  medium: 1,
  long: 2,
};

/* 颜色配置：使用 CSS 变量 + 内联样式，避免 Tailwind JIT 无法扫描数组类名的问题 */
const CHART_COLORS = {
  provider: {
    iconClass: "text-theme-accent-purple",
    barVar: "var(--color-accent-purple)",
    opacities: [0.9, 0.7, 0.5, 0.3, 0.2],
  },
  model: {
    iconClass: "text-theme-accent-primary",
    barVar: "var(--color-accent-primary)",
    opacities: [0.9, 0.7, 0.5, 0.3, 0.2],
  },
  inputLength: {
    iconClass: "text-theme-accent-success",
    barVar: "var(--color-accent-success)",
    opacities: [0.9, 0.7, 0.5, 0.3, 0.2],
  },
};

function BarChart({
  data,
  title,
  icon,
  getLabel,
  colorConfig,
  showTop5 = false,
}: {
  data: DistributionItem[];
  title: string;
  icon: React.ReactNode;
  getLabel?: (key: string) => string;
  colorConfig: { barVar: string; opacities: number[] };
  showTop5?: boolean;
}) {
  const maxValue = Math.max(...data.map((d) => d.sample_count), 1);

  return (
    <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-medium text-theme-text-primary">{title}</h3>
        </div>
        {showTop5 && (
          <span className="rounded-md bg-theme-bg-quaternary/60 px-2 py-0.5 text-[10px] font-medium text-theme-text-muted">
            Top 5
          </span>
        )}
      </div>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-theme-text-secondary truncate max-w-[80px]">
                {getLabel ? getLabel(item.key) : item.key}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-theme-text-muted">{formatSampleCount(item.sample_count)}</span>
                <span className="w-8 text-right font-medium text-theme-text-primary">
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-theme-bg-quaternary/80">
              <div
                className="h-full rounded-full transition-all duration-500 group-hover:opacity-90"
                style={{
                  width: `${(item.sample_count / maxValue) * 100}%`,
                  backgroundColor: colorConfig.barVar,
                  opacity: colorConfig.opacities[index] ?? colorConfig.opacities[colorConfig.opacities.length - 1],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfileCharts({
  providerDistribution,
  inputLengthDistribution,
  inputLengthBucketMeta,
  modelEntries,
}: ProfileChartsProps) {
  /* 计算模型分布 */
  const modelDistribution = useMemo(() => {
    if (!modelEntries || modelEntries.length === 0) return [];
    const map = new Map<string, number>();
    for (const entry of modelEntries) {
      map.set(entry.model, (map.get(entry.model) || 0) + entry.my_sample_count);
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    return Array.from(map.entries())
      .map(([key, sample_count]) => ({
        key,
        sample_count,
        percentage: Number(((sample_count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.sample_count - a.sample_count)
      .slice(0, 5);
  }, [modelEntries]);

  /* 过滤并排序输入长度分布：只保留 short/medium/long，按短->中->长排序 */
  const sortedInputLength = inputLengthDistribution
    .filter((d) => d.key === "short" || d.key === "medium" || d.key === "long")
    .sort((a, b) => (BUCKET_ORDER[a.key] ?? 99) - (BUCKET_ORDER[b.key] ?? 99));

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <BarChart
        data={providerDistribution.slice(0, 5)}
        title="厂商偏好分布"
        icon={<Building2 size={14} className={CHART_COLORS.provider.iconClass} />}
        getLabel={getProviderName}
        colorConfig={CHART_COLORS.provider}
        showTop5
      />
      <BarChart
        data={modelDistribution}
        title="模型偏好分布"
        icon={<Box size={14} className={CHART_COLORS.model.iconClass} />}
        colorConfig={CHART_COLORS.model}
        showTop5
      />
      <BarChart
        data={sortedInputLength}
        title="文本长度画像"
        icon={<FileText size={14} className={CHART_COLORS.inputLength.iconClass} />}
        getLabel={(key) => getInputLengthBucketLabel(key, inputLengthBucketMeta, key)}
        colorConfig={CHART_COLORS.inputLength}
      />
    </div>
  );
}
