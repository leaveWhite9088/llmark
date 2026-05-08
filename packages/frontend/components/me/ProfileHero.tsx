"use client";

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Github, ExternalLink, Flame } from "lucide-react";
import type { AuthUser, ContributionLevel, UserSummary } from "@/lib/types";
import LevelInfoModal from "@/components/user-leaderboard/LevelInfoModal";

interface ProfileHeroProps {
  user: AuthUser;
  contributionLevel: ContributionLevel;
  summary: UserSummary;
}

const LEVEL_CONFIG: Record<ContributionLevel, { label: string; color: string; bgColor: string }> = {
  "observer": { label: "入门测速员", color: "text-theme-accent-info", bgColor: "bg-theme-accent-info" },
  "beginner": { label: "活跃测速员", color: "text-theme-accent-success", bgColor: "bg-theme-accent-success" },
  "intermediate": { label: "进阶测速员", color: "text-theme-accent-primary", bgColor: "bg-theme-accent-primary" },
  "advanced": { label: "资深测速员", color: "text-theme-accent-warning", bgColor: "bg-theme-accent-warning" },
  "expert": { label: "精英测速官", color: "text-theme-accent-danger", bgColor: "bg-theme-accent-danger" },
  "legend": { label: "首席测速专家", color: "text-theme-accent-purple", bgColor: "bg-theme-accent-purple" }
};

export default function ProfileHero({ user, contributionLevel, summary }: ProfileHeroProps) {
  const levelConfig = LEVEL_CONFIG[contributionLevel] || LEVEL_CONFIG["observer"];
  const joinDate = user.created_at
    ? format(new Date(user.created_at), "yyyy年M月d日", { locale: zhCN })
    : "";

  const stats = [
    { value: summary.total_contributions.toLocaleString(), label: "贡献" },
    { value: `#${summary.rank}`, label: "排名" },
    { value: summary.tested_models_count.toString(), label: "模型" },
    { value: summary.tested_providers_count.toString(), label: "厂商" },
    { value: summary.contributions_last_7d.toString(), label: "近7天" },
  ];

  return (
    <section className="rounded-2xl border border-theme-border-subtle bg-theme-bg-secondary p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* 左侧：用户信息 */}
        <div className="flex items-center gap-4">
          {/* GitHub 头像 */}
          <div className="relative">
            {user.github_avatar_url ? (
              <img
                src={user.github_avatar_url}
                alt={user.github_username}
                className="h-16 w-16 rounded-full border-2 border-theme-border-subtle object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-theme-border-subtle bg-theme-bg-quaternary">
                <Github className="h-8 w-8 text-theme-text-muted" />
              </div>
            )}
          </div>

          {/* 用户基本信息 */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-theme-text-primary">
                @{user.github_username}
              </h1>
              {/* 等级徽章 - pill shape */}
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${levelConfig.bgColor}/15 ${levelConfig.color} border border-${levelConfig.bgColor}/20`}
                style={{ borderColor: 'currentColor' }}
              >
                {levelConfig.label}
              </span>
              {/* 连续贡献 streak */}
              {summary.streak_days > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-theme-accent-warning/10 px-2 py-0.5 text-xs font-medium text-theme-accent-warning border border-theme-accent-warning/20">
                  <Flame size={12} />
                  {summary.streak_days} 天
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-theme-text-muted">
              ID: {user.id} · 加入于 {joinDate}
            </p>
          </div>
        </div>

        {/* 右侧：继续贡献按钮 */}
        <a
          href="https://github.com/leaveWhite9088/LLMark/tree/main/sdk"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-full bg-theme-accent-primary px-5 py-2.5 text-sm font-medium text-theme-text-on-accent transition-all hover:bg-theme-accent-primary/90"
        >
          继续贡献
          <ExternalLink size={14} className="transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>

      {/* 底部：紧凑统计条 */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-theme-border-subtle/50 pt-4">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-theme-text-primary">{stat.value}</span>
            <span className="text-xs text-theme-text-muted">{stat.label}</span>
            {i < stats.length - 1 && (
              <span className="ml-2 text-theme-text-disabled">·</span>
            )}
          </div>
        ))}
        <div className="ml-auto">
          <LevelInfoModal currentLevel={contributionLevel} />
        </div>
      </div>
    </section>
  );
}
