"use client";

import { Trophy, TrendingUp, Zap } from "lucide-react";
import type { UserLeaderboardHighlight } from "@/lib/types";
import Image from "next/image";

interface HighlightsBarProps {
  weeklyStar: UserLeaderboardHighlight | null;
  fastestRiser: UserLeaderboardHighlight | null;
  topTps: UserLeaderboardHighlight | null;
}

function HighlightItem({
  icon: Icon,
  label,
  user,
  value,
  colorClass,
  bgClass,
}: {
  icon: React.ElementType;
  label: string;
  user: UserLeaderboardHighlight | null;
  value?: string;
  colorClass: string;
  bgClass: string;
}) {
  if (!user) return null;
  return (
    <div className="flex flex-1 items-center gap-3 rounded-xl border border-theme-border-subtle bg-theme-bg-quaternary/20 p-4 transition-colors hover:bg-theme-bg-quaternary/40">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bgClass}`}>
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wider text-theme-text-muted">
          {label}
        </div>
        <div className="mt-1 flex items-center gap-2">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.username}
              width={20}
              height={20}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-theme-bg-quaternary text-[10px] font-medium text-theme-text-muted">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="truncate text-sm font-medium text-theme-text-secondary">
            {user.username}
          </span>
        </div>
        {value && (
          <div className={`mt-1 text-lg font-bold ${colorClass}`}>{value}</div>
        )}
      </div>
    </div>
  );
}

export default function HighlightsBar({
  weeklyStar,
  fastestRiser,
  topTps,
}: HighlightsBarProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <HighlightItem
        icon={Trophy}
        label="本周之星"
        user={weeklyStar}
        value={weeklyStar?.contributions_7d ? `+${weeklyStar.contributions_7d}` : undefined}
        colorClass="text-theme-accent-warning"
        bgClass="bg-theme-accent-warning/10"
      />
      <HighlightItem
        icon={TrendingUp}
        label="上升最快"
        user={fastestRiser}
        value={fastestRiser?.rank_change ? `↑${fastestRiser.rank_change}` : undefined}
        colorClass="text-theme-accent-success"
        bgClass="bg-theme-accent-success/10"
      />
      <HighlightItem
        icon={Zap}
        label="TPS 最高"
        user={topTps}
        value={topTps?.avg_tps ? `${topTps.avg_tps.toFixed(1)}` : undefined}
        colorClass="text-theme-accent-primary"
        bgClass="bg-theme-accent-primary/10"
      />
    </div>
  );
}
