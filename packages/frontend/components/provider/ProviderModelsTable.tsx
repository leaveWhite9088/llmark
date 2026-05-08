"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ProviderModelItem, ModelInfoResponse } from "@/lib/types";
import { getInputLengthBucketLabel } from "@/lib/inputLength";
import { getSpeedRating, getRatingScore, formatNumber } from "@/lib/utils";

type SortField = "rank" | "model" | "input_length" | "tps" | "ttft" | "samples" | "rating";
type SortOrder = "asc" | "desc";

interface ProviderModelsTableProps {
  entries: ProviderModelItem[];
  provider: string;
  modelInfoData?: ModelInfoResponse;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  isLoading: boolean;
  hasData: boolean;
}

const DEFAULT_VISIBLE_ROWS = 10;

const SORT_LABELS: Record<SortField, string> = {
  rank: "排名",
  model: "模型",
  input_length: "输入长度",
  tps: "TPS",
  ttft: "TTFT",
  samples: "样本",
  rating: "评级",
};

/* ===== 排名徽章 ===== */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg font-bold text-theme-accent-warning">1</span>;
  if (rank === 2) return <span className="text-lg font-bold text-theme-text-secondary">2</span>;
  if (rank === 3) return <span className="text-lg font-bold text-theme-accent-warning">3</span>;
  return (
    <span className="text-sm font-medium text-theme-text-disabled w-4 text-right">
      {rank}
    </span>
  );
}

/* ===== 表头组件 ===== */
function TableHeader({
  label,
  active,
  order,
  onClick,
  align = "left",
}: {
  label: string;
  active?: boolean;
  order?: "asc" | "desc";
  onClick?: () => void;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={`pb-3 pt-2 text-xs font-medium text-theme-text-muted ${
        onClick ? "cursor-pointer select-none hover:text-theme-text-secondary" : ""
      } ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"}`}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active &&
          (order === "asc" ? (
            <ArrowUp size={12} className="text-theme-accent-primary" />
          ) : (
            <ArrowDown size={12} className="text-theme-accent-primary" />
          ))}
      </span>
    </th>
  );
}

/* ===== 数据质量点 ===== */
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

export default function ProviderModelsTable({
  entries,
  provider,
  modelInfoData,
  sortField,
  sortOrder,
  onSort,
  isLoading,
  hasData,
}: ProviderModelsTableProps) {
  const [expanded, setExpanded] = useState(false);

  const formatModelName = (model: string) => {
    const info = modelInfoData?.items.find((i) => i.model === model);
    return info?.displayName || model;
  };

  if (isLoading && !hasData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-theme-border-subtle border-t-theme-accent-primary" />
        <span className="ml-3 text-sm text-theme-text-muted">加载中...</span>
      </div>
    );
  }

  if (entries.length === 0) {
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
        <p className="mt-1 text-xs text-theme-text-disabled">请尝试调整筛选条件</p>
      </div>
    );
  }

  const displayData = expanded ? entries : entries.slice(0, DEFAULT_VISIBLE_ROWS);
  const hasMore = entries.length > DEFAULT_VISIBLE_ROWS;

  const sortStatusText =
    sortField !== "rank"
      ? `按 ${SORT_LABELS[sortField]} ${sortOrder === "asc" ? "升序" : "降序"}`
      : null;

  return (
    <div>
      {sortStatusText && (
        <div className="mb-3 text-xs text-theme-text-muted">{sortStatusText}</div>
      )}

      <div
        className={`overflow-x-auto ${expanded ? "overflow-y-auto" : ""}`}
        style={expanded ? { maxHeight: 680 } : undefined}
      >
        <table className="w-full min-w-[700px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-theme-border-subtle bg-theme-bg-secondary/80 backdrop-blur-sm">
              <TableHeader
                label="#"
                active={sortField === "rank"}
                order={sortOrder}
                onClick={() => onSort("rank")}
              />
              <TableHeader
                label="模型"
                active={sortField === "model"}
                order={sortOrder}
                onClick={() => onSort("model")}
              />
              <TableHeader
                label="输入长度"
                active={sortField === "input_length"}
                order={sortOrder}
                onClick={() => onSort("input_length")}
              />
              <TableHeader
                label="TPS"
                active={sortField === "tps"}
                order={sortOrder}
                onClick={() => onSort("tps")}
                align="right"
              />
              <TableHeader
                label="TTFT"
                active={sortField === "ttft"}
                order={sortOrder}
                onClick={() => onSort("ttft")}
                align="right"
              />
              <TableHeader
                label="样本"
                active={sortField === "samples"}
                order={sortOrder}
                onClick={() => onSort("samples")}
                align="right"
              />
              <TableHeader
                label="评级"
                active={sortField === "rating"}
                order={sortOrder}
                onClick={() => onSort("rating")}
                align="center"
              />
              <th className="pb-3 pt-2 text-xs font-medium text-theme-text-muted w-16 text-right pr-4">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((item, index) => {
              const rank = index + 1;
              const rating = getSpeedRating(item.avg_tps);
              const isSortedTps = sortField === "tps";
              const isSortedTtft = sortField === "ttft";
              const isSortedSamples = sortField === "samples";

              return (
                <tr
                  key={`${item.model}-${item.input_length_bucket ?? "all"}-${index}`}
                  className="border-b border-theme-border-faint transition-colors hover:bg-theme-bg-overlay-subtlest"
                >
                  <td className="py-3 pl-4">
                    <RankBadge rank={rank} />
                  </td>

                  <td className="py-3">
                    <span className="text-sm font-medium text-theme-text-secondary">
                      {formatModelName(item.model)}
                    </span>
                  </td>

                  <td className="py-3">
                    <span className="text-sm text-theme-text-muted">
                      {item.input_length_bucket === null
                        ? "平均"
                        : getInputLengthBucketLabel(item.input_length_bucket)}
                    </span>
                  </td>

                  <td className={`py-3 text-right ${isSortedTps ? "text-theme-accent-success" : ""}`}>
                    <span
                      className={`text-sm font-semibold ${
                        isSortedTps ? "text-theme-accent-success" : "text-theme-text-secondary"
                      }`}
                    >
                      {item.avg_tps.toFixed(1)}
                    </span>
                  </td>

                  <td className={`py-3 text-right ${isSortedTtft ? "text-theme-accent-info" : ""}`}>
                    <span
                      className={`text-sm font-semibold ${
                        isSortedTtft ? "text-theme-accent-info" : "text-theme-text-secondary"
                      }`}
                    >
                      {item.avg_ttft_ms.toFixed(0)}
                    </span>
                    <span className="text-[10px] text-theme-text-muted">ms</span>
                  </td>

                  <td className={`py-3 text-right ${isSortedSamples ? "text-theme-accent-violet" : ""}`}>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`text-xs ${
                          isSortedSamples
                            ? "text-theme-accent-violet font-semibold"
                            : "text-theme-text-muted"
                        }`}
                      >
                        {formatNumber(item.sample_count)}
                      </span>
                      <DataQualityDot quality={item.sample_count > 100 ? "sufficient" : "limited"} />
                    </span>
                  </td>

                  <td className="py-3 text-center">
                    <span
                      className={`text-xs font-medium ${
                        sortField === "rating" ? "text-theme-accent-success" : rating.color
                      }`}
                    >
                      {rating.label}
                    </span>
                  </td>

                  <td className="py-3 pr-4 text-right">
                    <Link
                      href={`/provider/${provider}/model/${encodeURIComponent(item.model)}`}
                      className="inline-flex items-center gap-1 text-xs text-theme-text-muted transition-colors hover:text-theme-accent-primary"
                    >
                      详情
                      <ExternalLink size={12} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 展开/收起按钮 */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center gap-2 rounded-xl border border-theme-border-subtle bg-theme-bg-overlay-subtlest py-3 text-sm font-medium text-theme-text-muted transition-all hover:border-theme-border-subtle hover:bg-theme-bg-overlay-subtle hover:text-theme-text-tertiary"
        >
          {expanded ? (
            <>
              <ChevronUp size={16} />
              <span>收起列表</span>
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              <span>展开全部</span>
              <span className="ml-1 rounded-full bg-theme-bg-overlay-default px-2 py-0.5 text-xs text-theme-text-disabled">
                共 {entries.length} 条
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
