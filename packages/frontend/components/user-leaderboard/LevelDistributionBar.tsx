"use client";

import type { LevelDistributionItem, ContributionLevel } from "@/lib/types";
import LevelInfoModal from "./LevelInfoModal";

const LEVEL_META: Record<string, { label: string; color: string }> = {
  observer: { label: "入门测速员", color: "var(--color-accent-info)" },
  beginner: { label: "活跃测速员", color: "var(--color-accent-success)" },
  intermediate: { label: "进阶测速员", color: "var(--color-accent-primary)" },
  advanced: { label: "资深测速员", color: "var(--color-accent-warning)" },
  expert: { label: "精英测速官", color: "var(--color-accent-danger)" },
  legend: { label: "首席测速专家", color: "var(--color-accent-purple)" },
};

interface LevelDistributionBarProps {
  distribution: LevelDistributionItem[];
  currentLevel?: ContributionLevel;
}

export default function LevelDistributionBar({
  distribution,
  currentLevel,
}: LevelDistributionBarProps) {
  // 按等级顺序排序
  const levelOrder = ["legend", "expert", "advanced", "intermediate", "beginner", "observer"];
  const sorted = [...distribution].sort(
    (a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level)
  );

  return (
    <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-quaternary/20 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-theme-text-muted">
          测速员等级分布
        </h3>
        <LevelInfoModal currentLevel={currentLevel} trigger="icon" />
      </div>

      {/* 堆叠条形图 */}
      <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full">
        {sorted.map((item) => {
          const meta = LEVEL_META[item.level];
          return (
            <div
              key={item.level}
              className="h-full transition-all"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: meta?.color || "#64748b",
              }}
              title={`${meta?.label || item.level}: ${item.percentage}%`}
            />
          );
        })}
      </div>

      {/* 图例 */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {sorted.map((item) => {
          const meta = LEVEL_META[item.level];
          return (
            <div key={item.level} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: meta?.color || "#64748b" }}
              />
              <span className="text-[10px] text-theme-text-muted">
                {meta?.label || item.level}
              </span>
              <span className="text-[10px] text-theme-text-disabled">
                {item.percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
