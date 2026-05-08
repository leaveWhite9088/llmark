"use client";

import { Calendar, Building2, FileText } from "lucide-react";
import { getInputLengthBucketOptions } from "@/lib/inputLength";
import type { FilterOptions } from "@/lib/types";

interface MeFiltersBarProps {
  filters: {
    range: string;
    provider: string;
    input_length_bucket: string;
  };
  onChange: (key: string, value: string) => void;
  filterOptions: FilterOptions | null;
}

const TIME_RANGES = [
  { value: "7d", label: "7天" },
  { value: "30d", label: "30天" },
  { value: "90d", label: "90天" },
  { value: "all", label: "全部" }
];

export default function MeFiltersBar({ filters, onChange, filterOptions }: MeFiltersBarProps) {
  const inputLengthOptions = getInputLengthBucketOptions(filterOptions?.input_length_bucket_meta, true, "全部文本");

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/50 p-3">
      <div className="flex items-center gap-2">
        <Calendar size={14} className="text-theme-text-muted" />
        <select value={filters.range} onChange={(e) => onChange("range", e.target.value)} className="rounded-lg border border-theme-border-subtle bg-theme-bg-quaternary px-3 py-1.5 text-sm text-theme-text-primary outline-none focus:border-theme-accent-primary">
          {TIME_RANGES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Building2 size={14} className="text-theme-text-muted" />
        <select value={filters.provider} onChange={(e) => onChange("provider", e.target.value)} className="rounded-lg border border-theme-border-subtle bg-theme-bg-quaternary px-3 py-1.5 text-sm text-theme-text-primary outline-none focus:border-theme-accent-primary">
          <option value="">全部厂商</option>
          {filterOptions?.providers.map((p) => (<option key={p} value={p}>{p}</option>))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <FileText size={14} className="text-theme-text-muted" />
        <select value={filters.input_length_bucket} onChange={(e) => onChange("input_length_bucket", e.target.value)} className="rounded-lg border border-theme-border-subtle bg-theme-bg-quaternary px-3 py-1.5 text-sm text-theme-text-primary outline-none focus:border-theme-accent-primary">
          {inputLengthOptions.map((option) => (<option key={option.value || 'all'} value={option.value}>{option.label}</option>))}
        </select>
      </div>
    </div>
  );
}
