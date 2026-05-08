"use client";

import { Search, X, ChevronDown } from "lucide-react";
import { getInputLengthBucketLabel, getInputLengthBucketOptions } from "@/lib/inputLength";
import type { InputLengthBucketMeta } from "@/lib/types";

const TIME_RANGE_LABELS: Record<string, string> = {
  "24h": "24小时",
  "7d": "7天",
  "30d": "30天"
};

type FilterBarProps = {
  provider: string;
  model: string;
  inputLengthBucket: string;
  timeRange: string;
  providers: string[];
  inputLengthBuckets: string[];
  inputLengthBucketMeta?: InputLengthBucketMeta[];
  onProviderChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onInputLengthBucketChange: (value: string) => void;
  onTimeRangeChange: (value: string) => void;
  onClearAll: () => void;
};

// 克制的原生 select 包装 —— 小圆角，不花哨
function SimpleSelect({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md border border-theme-border-light bg-theme-bg-primary px-3 py-2 pr-8 text-sm text-theme-text-secondary outline-none transition-colors focus:border-theme-accent-primary/40 focus:ring-1 focus:ring-theme-accent-primary/20"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-theme-text-muted"
      />
    </div>
  );
}

export default function FilterBar({
  provider,
  model,
  inputLengthBucket,
  timeRange,
  providers,
  inputLengthBuckets,
  inputLengthBucketMeta,
  onProviderChange,
  onModelChange,
  onInputLengthBucketChange,
  onTimeRangeChange,
  onClearAll,
}: FilterBarProps) {
  const hasActiveFilters = provider || inputLengthBucket || model || timeRange !== "24h";

  const providerOptions = providers.map((p) => ({ value: p, label: p }));
  const lengthOptions = inputLengthBuckets.length > 0
    ? inputLengthBuckets.map((bucket) => ({ value: bucket, label: getInputLengthBucketLabel(bucket, inputLengthBucketMeta) }))
    : getInputLengthBucketOptions(inputLengthBucketMeta);
  const timeRangeOptions = [
    { value: "24h", label: "24小时" },
    { value: "7d", label: "7天" },
    { value: "30d", label: "30天" }
  ];

  return (
    <div className="space-y-3">
      {/* 主筛选栏 —— 所有控件一排 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 搜索框 —— 克制风格，小圆角 */}
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" aria-hidden="true" />
          <input
            type="text"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder="搜索模型..."
            aria-label="搜索模型"
            className="w-full rounded-md border border-theme-border-light bg-theme-bg-primary py-2 pl-9 pr-8 text-sm text-theme-text-secondary outline-none transition-colors placeholder:text-theme-text-muted focus:border-theme-accent-primary/40 focus:ring-1 focus:ring-theme-accent-primary/20"
          />
          {model && (
            <button
              type="button"
              onClick={() => onModelChange("")}
              aria-label="清除搜索"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-theme-text-muted hover:bg-theme-bg-overlay-subtle hover:text-theme-text-secondary"
            >
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* 时间范围 */}
        <SimpleSelect
          value={timeRange}
          placeholder="时间"
          options={timeRangeOptions}
          onChange={onTimeRangeChange}
        />

        {/* 厂商 */}
        <SimpleSelect
          value={provider}
          placeholder="全部厂商"
          options={providerOptions}
          onChange={onProviderChange}
        />

        {/* 输入长度 */}
        <SimpleSelect
          value={inputLengthBucket}
          placeholder="全部文本"
          options={lengthOptions}
          onChange={onInputLengthBucketChange}
        />

        {/* 清除筛选 */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="ml-auto flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-theme-text-muted transition-colors hover:bg-theme-bg-overlay-subtle hover:text-theme-text-secondary"
          >
            <X size={12} aria-hidden="true" />
            清除
          </button>
        )}
      </div>

    </div>
  );
}
