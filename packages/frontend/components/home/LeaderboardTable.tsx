"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import type { LeaderboardItem } from "@/lib/types";
import { getProviderBrand } from "@/constants/brands";
import ProviderLogo from "@/components/ui/ProviderLogo";
import { getInputLengthBucketLabel } from "@/lib/inputLength";
import { formatNumber } from "@/lib/utils";

type SortField = "tps" | "ttft" | "samples";
type SortOrder = "asc" | "desc";

interface LeaderboardTableProps {
  items: LeaderboardItem[];
  sortBy: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
}

const DEFAULT_VISIBLE_COUNT = 10;

const TAG_COLORS: Record<string, string> = {
  vision: "#fbbf24",
  code: "#60a5fa",
  "long-context": "#a78bfa",
  fast: "#34d399",
  powerful: "#f87171",
  reasoning: "#818cf8",
};

function TagBadge({ tag }: { tag: string }) {
  const color = TAG_COLORS[tag] || "#64748b";
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: `${color}15`,
        color: color,
        border: `1px solid ${color}25`,
      }}
    >
      {tag}
    </span>
  );
}

function RankBadge({ rank, rankChange }: { rank: number; rankChange?: number }) {
  const changeEl =
    rankChange === undefined ? null : rankChange > 0 ? (
      <span className="ml-1 text-[10px] text-theme-accent-success">↑{rankChange}</span>
    ) : rankChange < 0 ? (
      <span className="ml-1 text-[10px] text-theme-accent-error">↓{Math.abs(rankChange)}</span>
    ) : (
      <span className="ml-1 text-[10px] text-theme-text-disabled">−</span>
    );

  if (rank === 1) {
    return (
      <div className="flex items-center">
        <span className="text-lg font-bold text-theme-accent-warning">1</span>
        {changeEl}
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center">
        <span className="text-lg font-bold text-theme-text-secondary">2</span>
        {changeEl}
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center">
        <span className="text-lg font-bold text-theme-accent-warning">3</span>
        {changeEl}
      </div>
    );
  }
  return (
    <div className="flex items-center">
      <span className="text-sm font-medium text-theme-text-disabled w-4 text-right">
        {rank}
      </span>
      {changeEl}
    </div>
  );
}

// 趋势统一用灰色，淡淡的就行
function TrendValue({ change, unit }: { change?: number; unit?: string }) {
  if (change === undefined || change === 0) return null;
  const sign = change > 0 ? "+" : "−";
  const abs = Math.abs(change);
  const display = abs >= 1000 && unit !== "ms" && unit !== "tps"
    ? `${(abs / 1000).toFixed(1)}k`
    : abs.toFixed(unit === "tps" ? 1 : 0);
  return (
    <span className="ml-1 text-[11px] text-theme-text-disabled">
      ({sign}{display}{unit ?? ""})
    </span>
  );
}

function DataQualityDot({ quality }: { quality: string }) {
  const isSufficient = quality === "sufficient";
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${
        isSufficient ? "bg-theme-accent-success" : "bg-theme-accent-warning/50"
      }`}
      title={isSufficient ? "数据充足" : "数据量有限"}
    />
  );
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

export default function LeaderboardTable({
  items,
  sortBy,
  sortOrder,
  onSortChange,
}: LeaderboardTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      onSortChange(field, sortOrder === "asc" ? "desc" : "asc");
    } else {
      // 新字段使用默认方向：ttft 默认 asc，其他默认 desc
      const defaultOrder = field === "ttft" ? "asc" : "desc";
      onSortChange(field, defaultOrder);
    }
  };

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          className="text-theme-text-disabled"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <p className="mt-3 text-sm text-theme-text-muted">暂无数据</p>
      </div>
    );
  }

  const visibleItems = isExpanded ? items : items.slice(0, DEFAULT_VISIBLE_COUNT);
  const hasMore = items.length > DEFAULT_VISIBLE_COUNT;

  return (
    <div className="flex flex-col gap-3">
      <div className={`overflow-x-auto${isExpanded ? " max-h-[920px] overflow-y-auto" : ""}`}>
        <table className="w-full min-w-[600px] border-collapse">
          <thead className="sticky top-0 z-10 bg-theme-bg-secondary">
            <tr className="border-b border-theme-border-subtle">
              <TableHeader label="#" className="w-12" />
              <TableHeader label="模型" className="min-w-[180px]" />
              <TableHeader
                label="TPS"
                sortable
                active={sortBy === "tps"}
                order={sortOrder}
                onClick={() => handleSort("tps")}
                align="right"
                className="w-32"
              />
              <TableHeader
                label="TTFT"
                sortable
                active={sortBy === "ttft"}
                order={sortOrder}
                onClick={() => handleSort("ttft")}
                align="right"
                className="w-32"
              />
              <TableHeader
                label="样本量"
                sortable
                active={sortBy === "samples"}
                order={sortOrder}
                onClick={() => handleSort("samples")}
                align="right"
                className="w-32"
              />
              <TableHeader label="" className="min-w-[140px]" />
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item, index) => {
              const rank = index + 1;
              const brand = getProviderBrand(item.provider);
              const rowKey = `${item.provider}-${item.model}-${item.input_length_bucket ?? "all"}`;
              return (
                <tr
                  key={rowKey}
                  className="group border-b border-theme-border-faint transition-colors hover:bg-theme-bg-overlay-subtlest"
                >
                  {/* 排名 */}
                  <td className="py-3 pl-2">
                    <RankBadge rank={rank} rankChange={item.rank_change} />
                  </td>

                  {/* 模型信息 */}
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <ProviderLogo provider={item.provider} size={28} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-theme-text-muted">{brand.name}</span>
                          <span className="text-theme-text-disabled">/</span>
                          <span className="text-sm font-medium text-theme-text-secondary">
                            {item.model}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {item.tags?.map((tag) => (
                            <TagBadge key={tag} tag={tag} />
                          ))}
                          {item.input_length_bucket && (
                            <span className="text-[10px] text-theme-text-disabled">
                              {getInputLengthBucketLabel(item.input_length_bucket)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* TPS + 趋势 */}
                  <td className={`py-3 text-right ${sortBy === "tps" ? "text-theme-accent-success" : ""}`}>
                    <span
                      className={`text-sm font-semibold ${
                        sortBy === "tps" ? "text-theme-accent-success" : "text-theme-text-secondary"
                      }`}
                    >
                      {item.avg_tps.toFixed(1)}
                    </span>
                    <TrendValue change={item.trend_tps_change} />
                  </td>

                  {/* TTFT + 趋势 */}
                  <td className={`py-3 text-right ${sortBy === "ttft" ? "text-theme-accent-info" : ""}`}>
                    <span
                      className={`text-sm font-semibold ${
                        sortBy === "ttft" ? "text-theme-accent-info" : "text-theme-text-secondary"
                      }`}
                    >
                      {item.avg_ttft_ms}
                    </span>
                    <span className="text-[10px] text-theme-text-muted">ms</span>
                    <TrendValue change={item.trend_ttft_change} unit="ms" />
                  </td>

                  {/* 样本量 + 趋势 —— inline-flex 确保一行 */}
                  <td className={`py-3 text-right ${sortBy === "samples" ? "text-theme-accent-violet" : ""}`}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`text-xs ${sortBy === "samples" ? "text-theme-accent-violet font-semibold" : "text-theme-text-muted"}`}>
                        {formatNumber(item.sample_count)}
                      </span>
                      <DataQualityDot quality={item.data_quality} />
                      <TrendValue change={item.trend_samples_change} />
                    </span>
                  </td>

                  {/* 操作 */}
                  <td className="py-3 pr-2">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/model/${encodeURIComponent(item.model)}`}
                        className="rounded px-1.5 py-0.5 text-[11px] text-theme-text-muted transition-colors hover:bg-theme-bg-overlay-subtle hover:text-theme-text-secondary"
                      >
                        看模型
                      </Link>
                      <Link
                        href={`/provider/${encodeURIComponent(item.provider)}`}
                        className="rounded px-1.5 py-0.5 text-[11px] text-theme-text-muted transition-colors hover:bg-theme-bg-overlay-subtle hover:text-theme-text-secondary"
                      >
                        看厂商
                      </Link>
                      <Link
                        href={`/provider/${encodeURIComponent(item.provider)}/model/${encodeURIComponent(item.model)}`}
                        className="rounded px-1.5 py-0.5 text-[11px] text-theme-accent-info transition-colors hover:bg-theme-bg-overlay-subtle hover:text-theme-accent-info/80"
                      >
                        看详细
                      </Link>
                    </div>
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
                共 {items.length} 个
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
