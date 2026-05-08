"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, ChevronDown, ChevronUp } from "lucide-react";
import ProviderLogo from "@/components/ui/ProviderLogo";
import { getProviderName } from "@/constants/brands";
import { getInputLengthBucketLabel } from "@/lib/inputLength";
import type { InputLengthBucketMeta, PersonalModelEntry } from "@/lib/types";

const DEFAULT_VISIBLE_COUNT = 10;

type SortField = "sample_count" | "my_avg_tps" | "my_avg_ttft_ms" | "last_contributed_at";
type SortOrder = "asc" | "desc";

interface MyModelTableProps {
  entries: PersonalModelEntry[];
  inputLengthBucketMeta?: InputLengthBucketMeta[];
}

function TableHeader({
  label,
  active,
  sortable,
  order,
  onClick,
  align = "left",
  className = "",
}: {
  label: string;
  active?: boolean;
  sortable?: boolean;
  order?: "asc" | "desc";
  onClick?: () => void;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={`pb-3 pt-2 text-xs font-medium text-theme-text-muted ${
        sortable ? "cursor-pointer select-none hover:text-theme-text-secondary" : ""
      } ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${className}`}
      onClick={sortable ? onClick : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && sortable && (
          order === "asc" ? (
            <ArrowUp size={12} className="text-theme-accent-primary" />
          ) : (
            <ArrowDown size={12} className="text-theme-accent-primary" />
          )
        )}
      </span>
    </th>
  );
}

function formatTimeWithRelative(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay}天前`;
  if (diffHour > 0) return `${diffHour}小时前`;
  if (diffMin > 0) return `${diffMin}分钟前`;
  return "刚刚";
}

export default function MyModelTable({ entries, inputLengthBucketMeta }: MyModelTableProps) {
  const [sortField, setSortField] = useState<SortField>("sample_count");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "my_avg_ttft_ms" ? "asc" : "desc");
    }
  };

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "sample_count": comparison = a.my_sample_count - b.my_sample_count; break;
        case "my_avg_tps": comparison = a.my_avg_tps - b.my_avg_tps; break;
        case "my_avg_ttft_ms": comparison = a.my_avg_ttft_ms - b.my_avg_ttft_ms; break;
        case "last_contributed_at": comparison = new Date(a.last_contributed_at).getTime() - new Date(b.last_contributed_at).getTime(); break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [entries, sortField, sortOrder]);

  const visibleEntries = isExpanded
    ? sortedEntries
    : sortedEntries.slice(0, DEFAULT_VISIBLE_COUNT);
  const hasMore = entries.length > DEFAULT_VISIBLE_COUNT;

  const formatInputLength = (bucket: string | null) =>
    getInputLengthBucketLabel(bucket, inputLengthBucketMeta, "-");

  return (
    <div className="flex flex-col gap-3">
      <div className={`overflow-x-auto${isExpanded ? " max-h-[920px] overflow-y-auto" : ""}`}>
        <table className="w-full min-w-[600px] border-collapse">
          <thead className="sticky top-0 z-10 bg-theme-bg-secondary">
            <tr className="border-b border-theme-border-subtle">
              <TableHeader label="#" className="w-10 pl-2" />
              <TableHeader label="厂商/模型" className="min-w-[200px]" />
              <TableHeader label="文本长度" align="center" className="w-24" />
              <TableHeader
                label="样本数"
                sortable
                active={sortField === "sample_count"}
                order={sortOrder}
                onClick={() => handleSort("sample_count")}
                align="right"
                className="w-24"
              />
              <TableHeader
                label="我的 TPS"
                sortable
                active={sortField === "my_avg_tps"}
                order={sortOrder}
                onClick={() => handleSort("my_avg_tps")}
                align="right"
                className="w-28"
              />
              <TableHeader
                label="我的 TTFT"
                sortable
                active={sortField === "my_avg_ttft_ms"}
                order={sortOrder}
                onClick={() => handleSort("my_avg_ttft_ms")}
                align="right"
                className="w-28"
              />
              <TableHeader
                label="贡献时间"
                sortable
                active={sortField === "last_contributed_at"}
                order={sortOrder}
                onClick={() => handleSort("last_contributed_at")}
                align="right"
                className="w-32"
              />
            </tr>
          </thead>
          <tbody>
            {visibleEntries.map((entry, index) => {
              const rank = index + 1;
              const rowKey = `${entry.provider}-${entry.model}-${entry.input_length_bucket ?? "all"}-${index}`;
              return (
                <tr
                  key={rowKey}
                  className="group border-b border-theme-border-faint transition-colors hover:bg-theme-bg-overlay-subtlest"
                >
                  {/* 编号 */}
                  <td className="py-3 pl-2">
                    <span className="text-sm font-medium text-theme-text-disabled w-4 text-right block">
                      {rank}
                    </span>
                  </td>

                  {/* 厂商/模型 */}
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <ProviderLogo provider={entry.provider} size={28} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/provider/${encodeURIComponent(entry.provider)}`}
                            className="text-xs text-theme-text-muted hover:text-theme-accent-primary transition-colors"
                          >
                            {getProviderName(entry.provider)}
                          </Link>
                          <span className="text-theme-text-disabled">/</span>
                          <Link
                            href={`/model/${encodeURIComponent(entry.model)}`}
                            className="text-sm font-medium text-theme-text-primary hover:text-theme-accent-primary transition-colors"
                          >
                            {entry.model}
                          </Link>
                        </div>
                        <div className="mt-0.5 text-[10px] text-theme-text-disabled">
                          全站平均 {entry.global_avg_tps.toFixed(1)} TPS / {entry.global_avg_ttft_ms}ms
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 文本长度 */}
                  <td className="py-3 text-center">
                    <span className="text-xs text-theme-text-muted">
                      {formatInputLength(entry.input_length_bucket)}
                    </span>
                  </td>

                  {/* 样本数 */}
                  <td className={`py-3 text-right ${sortField === "sample_count" ? "text-theme-accent-violet" : ""}`}>
                    <span className={`text-sm ${sortField === "sample_count" ? "text-theme-accent-violet font-semibold" : "text-theme-text-secondary"}`}>
                      {entry.my_sample_count}
                    </span>
                  </td>

                  {/* 我的 TPS */}
                  <td className={`py-3 text-right ${sortField === "my_avg_tps" ? "text-theme-accent-success" : ""}`}>
                    <span className={`text-sm font-semibold ${sortField === "my_avg_tps" ? "text-theme-accent-success" : "text-theme-text-secondary"}`}>
                      {entry.my_avg_tps.toFixed(1)}
                    </span>
                  </td>

                  {/* 我的 TTFT */}
                  <td className={`py-3 text-right ${sortField === "my_avg_ttft_ms" ? "text-theme-accent-info" : ""}`}>
                    <span className={`text-sm font-semibold ${sortField === "my_avg_ttft_ms" ? "text-theme-accent-info" : "text-theme-text-secondary"}`}>
                      {entry.my_avg_ttft_ms}
                    </span>
                    <span className="text-[10px] text-theme-text-muted">ms</span>
                  </td>

                  {/* 贡献时间 */}
                  <td className={`py-3 pr-2 text-right ${sortField === "last_contributed_at" ? "text-theme-accent-primary" : ""}`}>
                    <span className={`text-xs ${sortField === "last_contributed_at" ? "text-theme-accent-primary font-medium" : "text-theme-text-muted"}`}>
                      {formatTimeWithRelative(entry.last_contributed_at)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center gap-2 rounded-xl border border-theme-border-subtle bg-theme-bg-overlay-subtlest py-3 text-sm font-medium text-theme-text-muted transition-all hover:border-theme-border-subtle hover:bg-theme-bg-overlay-subtle hover:text-theme-text-tertiary"
        >
          {isExpanded ? (
            <>
              <ChevronUp size={16} />
              <span>收起列表</span>
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              <span>展开全部</span>
              <span className="ml-1 rounded-full bg-theme-bg-overlay-default px-2 py-0.5 text-xs text-theme-text-disabled">
                共 {entries.length} 个
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
