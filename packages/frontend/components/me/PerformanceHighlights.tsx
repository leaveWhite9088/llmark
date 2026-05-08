"use client";

import Link from "next/link";
import { Trophy, Zap, Timer, TrendingUp, Target, Layers, ArrowRight, Users } from "lucide-react";
import type { UserSummary, ProfileComparison, ProfileHighlights, HighlightEntry } from "@/lib/types";
import { getProviderName } from "@/constants/brands";

interface PerformanceHighlightsProps {
  summary: UserSummary;
  comparison: ProfileComparison;
  highlights: ProfileHighlights;
}

function HighlightCard({
  icon,
  label,
  entry,
  value,
  unit,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  entry: HighlightEntry | null;
  value?: string | number;
  unit?: string;
  href?: string;
}) {
  if (!entry) {
    return (
      <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/30 p-4">
        <div className="flex items-center gap-2 text-theme-text-muted">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="mt-2 text-sm text-theme-text-muted">暂无数据</p>
      </div>
    );
  }

  const providerName = getProviderName(entry.provider);
  const content = (
    <>
      <div className="flex items-center gap-2 text-theme-text-muted">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-2">
        <p className="text-sm font-medium text-theme-text-primary truncate">
          {entry.model}
        </p>
        <p className="text-xs text-theme-text-muted">{providerName}</p>
        <p className="mt-1 text-lg font-semibold text-theme-accent-primary">
          {value !== undefined ? value : "--"}
          {unit && <span className="ml-0.5 text-xs font-normal text-theme-text-muted">{unit}</span>}
        </p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/30 p-4 transition-all hover:border-theme-accent-primary/30 hover:bg-theme-bg-quaternary/30"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/30 p-4">
      {content}
    </div>
  );
}

function ComparisonBar({
  label,
  myValue,
  globalValue,
  unit,
  invert = false,
}: {
  label: string;
  myValue: number;
  globalValue: number;
  unit?: string;
  invert?: boolean;
}) {
  const maxValue = Math.max(myValue, globalValue, 1);
  const myPercent = (myValue / maxValue) * 100;
  const globalPercent = (globalValue / maxValue) * 100;
  const diff = invert ? globalValue - myValue : myValue - globalValue;
  const isBetter = invert ? diff < 0 : diff > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-theme-text-secondary">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-theme-text-primary">
            {myValue.toFixed(myValue < 10 ? 1 : 0)}
            {unit}
          </span>
          <span className={`text-xs ${isBetter ? "text-theme-accent-success" : "text-theme-text-muted"}`}>
            {isBetter ? "↑" : diff < 0 ? "↓" : "—"}
          </span>
          <span className="text-xs text-theme-text-muted">
            社区 {globalValue.toFixed(globalValue < 10 ? 1 : 0)}{unit}
          </span>
        </div>
      </div>
      <div className="relative h-2 w-full rounded-full bg-theme-bg-quaternary/80 overflow-hidden">
        <div
          className="absolute h-full rounded-full bg-theme-text-muted/30"
          style={{ width: `${globalPercent}%` }}
        />
        <div
          className="absolute h-full rounded-full bg-theme-accent-primary/70"
          style={{ width: `${myPercent}%` }}
        />
      </div>
    </div>
  );
}

export default function PerformanceHighlights({ summary, comparison, highlights }: PerformanceHighlightsProps) {
  return (
    <div className="space-y-4">
      {/* 个人最佳 */}
      <div>
        <h2 className="mb-3 text-base font-medium text-theme-text-primary">个人最佳</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <HighlightCard
            icon={<Trophy size={14} />}
            label="最多贡献"
            entry={highlights.most_contributed_entry}
            value={highlights.most_contributed_entry?.sample_count}
            unit="条"
            href={highlights.most_contributed_entry ? `/model/${encodeURIComponent(highlights.most_contributed_entry.model)}` : undefined}
          />
          <HighlightCard
            icon={<Zap size={14} />}
            label="最快 TPS"
            entry={highlights.fastest_entry}
            value={highlights.fastest_entry?.avg_tps}
            unit="TPS"
            href={highlights.fastest_entry ? `/model/${encodeURIComponent(highlights.fastest_entry.model)}` : undefined}
          />
          <HighlightCard
            icon={<Timer size={14} />}
            label="最低 TTFT"
            entry={highlights.lowest_ttft_entry}
            value={highlights.lowest_ttft_entry?.avg_ttft_ms}
            unit="ms"
            href={highlights.lowest_ttft_entry ? `/model/${encodeURIComponent(highlights.lowest_ttft_entry.model)}` : undefined}
          />
        </div>
      </div>

      {/* 排名 + 对比 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 社区排名 */}
        <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/30 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-theme-text-muted">当前排名</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-theme-accent-primary">
                  #{summary.rank}
                </span>
                <span className="text-sm text-theme-text-muted">
                  / {summary.total_ranked_users || "--"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-theme-text-secondary">
                <Users size={14} className="text-theme-text-muted" />
                <span>
                  超过 <span className="font-semibold text-theme-accent-success">{summary.users_behind_percentage.toFixed(0)}%</span> 的贡献者
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-theme-accent-primary/10 p-3 text-theme-accent-primary">
              <Trophy size={24} />
            </div>
          </div>

          {summary.distance_to_next_rank > 0 && (
            <div className="mt-4 rounded-lg bg-theme-bg-quaternary/50 px-3 py-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-theme-text-muted">距上一名还差</span>
                <span className="font-semibold text-theme-text-primary">{summary.distance_to_next_rank} 条贡献</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-theme-bg-quaternary overflow-hidden">
                <div
                  className="h-full rounded-full bg-theme-accent-primary transition-all"
                  style={{ width: `${Math.max(10, 100 - (summary.distance_to_next_rank / (summary.total_contributions + summary.distance_to_next_rank)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <Link
            href="/leaderboard"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-theme-accent-primary transition-all hover:gap-2"
          >
            查看贡献榜
            <ArrowRight size={12} />
          </Link>
        </div>

        {/* 我的表现 vs 社区平均 */}
        <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/30 p-5">
          <h3 className="mb-4 text-sm font-medium text-theme-text-secondary">
            我的表现 vs 社区平均
          </h3>

          <div className="space-y-4">
            <ComparisonBar
              label="平均 TPS"
              myValue={comparison.my_avg_tps}
              globalValue={comparison.global_avg_tps}
            />
            <ComparisonBar
              label="平均 TTFT"
              myValue={comparison.my_avg_ttft_ms}
              globalValue={comparison.global_avg_ttft_ms}
              unit="ms"
              invert
            />
            <ComparisonBar
              label="模型覆盖数"
              myValue={comparison.my_models_count}
              globalValue={comparison.global_avg_models_count}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
