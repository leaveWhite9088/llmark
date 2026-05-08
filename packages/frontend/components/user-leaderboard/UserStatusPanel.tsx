"use client";

import { LogIn, MapPin } from "lucide-react";
import Image from "next/image";
import type { AuthUser, ContributionLevel } from "@/lib/types";
import { setDeviceIdCookie, getAuthUrl } from "@/lib/auth";

const LEVEL_META: Record<string, { label: string; color: string }> = {
  observer: { label: "入门测速员", color: "var(--color-accent-info)" },
  beginner: { label: "活跃测速员", color: "var(--color-accent-success)" },
  intermediate: { label: "进阶测速员", color: "var(--color-accent-primary)" },
  advanced: { label: "资深测速员", color: "var(--color-accent-warning)" },
  expert: { label: "精英测速官", color: "var(--color-accent-danger)" },
  legend: { label: "首席测速专家", color: "var(--color-accent-purple)" },
};

interface UserStatusPanelProps {
  user: AuthUser | null;
  currentUserRank?: number;
  contributionLevel?: ContributionLevel;
  onScrollToRank?: () => void;
}

export default function UserStatusPanel({
  user,
  currentUserRank,
  contributionLevel,
  onScrollToRank,
}: UserStatusPanelProps) {
  const hasRank = currentUserRank != null;

  // 未登录
  if (!user) {
    return (
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); setDeviceIdCookie(); window.location.href = getAuthUrl(); }}
        className="flex items-center gap-2 rounded-lg border border-theme-border-light bg-theme-bg-quaternary/50 px-4 py-2 text-sm font-medium text-theme-text-tertiary transition-colors duration-150 hover:border-theme-accent-primary/30 hover:bg-theme-accent-primary/10 hover:text-theme-accent-primary"
      >
        <LogIn className="h-4 w-4" />
        <span>使用 GitHub 登录</span>
      </a>
    );
  }

  const levelMeta = contributionLevel ? LEVEL_META[contributionLevel] : null;

  return (
    <div className="flex items-center gap-3">
      {/* 头像 */}
      <div className="relative h-8 w-8 overflow-hidden rounded-full bg-theme-bg-quaternary">
        {user.github_avatar_url ? (
          <Image
            src={user.github_avatar_url}
            alt={user.github_username}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-theme-text-muted">
            {user.github_username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* 用户名 */}
      <span className="hidden text-sm font-medium text-theme-text-secondary sm:inline">
        {user.github_username}
      </span>

      {/* 等级标签 */}
      {levelMeta && (
        <div className="hidden items-center gap-1 md:flex">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: levelMeta.color }}
          />
          <span className="text-[10px] text-theme-text-muted">{levelMeta.label}</span>
        </div>
      )}

      {/* 排名 */}
      {hasRank ? (
        <button
          onClick={onScrollToRank}
          className="flex items-center gap-1.5 rounded-lg border border-theme-accent-primary/30 bg-theme-accent-primary/10 px-3 py-1.5 text-sm font-medium text-theme-accent-primary transition-colors duration-150 hover:bg-theme-accent-primary/20"
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>#{currentUserRank}</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 rounded-lg border border-theme-border-light bg-theme-bg-quaternary/50 px-3 py-1.5 text-sm font-medium text-theme-text-tertiary">
          <MapPin className="h-3.5 w-3.5" />
          <span>暂无排名</span>
        </div>
      )}
    </div>
  );
}
