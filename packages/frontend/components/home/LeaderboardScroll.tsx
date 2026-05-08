"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import LeaderboardCard from "@/components/home/LeaderboardCard";
import type { LeaderboardItem } from "@/lib/types";

type LeaderboardScrollProps = {
  items: LeaderboardItem[];
  sortBy: "tps" | "ttft";
};

const DEFAULT_VISIBLE_COUNT = 10;

export default function LeaderboardScroll({
  items,
  sortBy
}: LeaderboardScrollProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const visibleItems = useMemo(() =>
    isExpanded ? items : items.slice(0, DEFAULT_VISIBLE_COUNT),
    [items, isExpanded]
  );
  const hasMore = items.length > DEFAULT_VISIBLE_COUNT;

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`flex flex-col gap-2 transition-all duration-300 ease-in-out ${
          isExpanded
            ? "max-h-[70vh] overflow-y-auto"
            : "max-h-[500px] overflow-hidden"
        }`}
        style={{ scrollbarWidth: "thin" }}
      >
        {visibleItems.map((item, index) => (
          <div
            key={`${item.provider}-${item.model}-${index}`}
            className="transition-all duration-200 ease-out opacity-100"
          >
            <LeaderboardCard
              rank={index + 1}
              item={item}
              sortBy={sortBy}
            />
          </div>
        ))}
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
              <span className="ml-1 rounded-full bg-theme-bg-overlay-default px-2 py-0.5 text-xs text-theme-text-muted">
                共 {items.length} 个
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
