"use client";

import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, Minus, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import type { UserLeaderboardItem, ContributionLevel } from "@/lib/types";
import Image from "next/image";

interface UserLeaderboardTableProps {
  users: UserLeaderboardItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  currentUserId?: number;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const LEVEL_META: Record<ContributionLevel, { label: string; color: string }> = {
  observer: { label: "入门测速员", color: "var(--color-accent-info)" },
  beginner: { label: "活跃测速员", color: "var(--color-accent-success)" },
  intermediate: { label: "进阶测速员", color: "var(--color-accent-primary)" },
  advanced: { label: "资深测速员", color: "var(--color-accent-warning)" },
  expert: { label: "精英测速官", color: "var(--color-accent-danger)" },
  legend: { label: "首席测速专家", color: "var(--color-accent-purple)" },
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center">
        <span className="text-lg font-bold text-theme-accent-warning">1</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center">
        <span className="text-lg font-bold text-theme-text-secondary">2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center">
        <span className="text-lg font-bold text-theme-accent-warning-light">3</span>
      </div>
    );
  }
  if (rank <= 10) {
    return (
      <div className="flex items-center">
        <span className="text-sm font-semibold text-theme-text-disabled w-4 text-right">
          {rank}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center">
      <span className="text-sm text-theme-text-disabled w-4 text-right">
        {rank}
      </span>
    </div>
  );
}

function RankChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-theme-accent-success">
        <ArrowUp className="h-3 w-3" />
        {change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-theme-accent-danger">
        <ArrowDown className="h-3 w-3" />
        {Math.abs(change)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-theme-text-disabled">
      <Minus className="h-3 w-3" />
    </span>
  );
}

function LevelDot({ level }: { level: ContributionLevel }) {
  const meta = LEVEL_META[level];
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{ backgroundColor: meta?.color || "#64748b" }}
      title={meta?.label || level}
    />
  );
}

export default function UserLeaderboardTable({
  users,
  pagination,
  onPageChange,
  onPageSizeChange,
  currentUserId,
}: UserLeaderboardTableProps) {
  const [sortBy, setSortBy] = useState<"rank" | "contributions" | "models" | "tps" | "ttft">("rank");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: "rank" | "contributions" | "models" | "tps" | "ttft") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (field: "rank" | "contributions" | "models" | "tps" | "ttft") => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  // 客户端排序
  const sortedUsers = useMemo(() => {
    const sorted = [...users];
    const dir = sortOrder === "asc" ? 1 : -1;
    switch (sortBy) {
      case "contributions":
        sorted.sort((a, b) => (a.total_contributions - b.total_contributions) * dir);
        break;
      case "models":
        sorted.sort((a, b) => (a.models_tested - b.models_tested) * dir);
        break;
      case "tps":
        sorted.sort((a, b) => (a.avg_tps - b.avg_tps) * dir);
        break;
      case "ttft":
        sorted.sort((a, b) => (a.avg_ttft_ms - b.avg_ttft_ms) * dir);
        break;
      case "rank":
      default:
        sorted.sort((a, b) => (a.rank - b.rank) * dir);
        break;
    }
    return sorted;
  }, [users, sortBy, sortOrder]);

  const thBase = "pb-3 pt-2 text-xs font-medium text-theme-text-muted";
  const thSort = "cursor-pointer select-none hover:text-theme-text-secondary transition-colors";

  return (
    <div className="rounded-xl border border-theme-border-subtle bg-theme-bg-secondary/80 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="border-b border-theme-border-subtle">
              <th className={`${thBase} w-12 pl-4 text-left`}>#</th>
              <th className={`${thBase} min-w-[180px] text-left`}>用户</th>
              <th
                className={`${thBase} ${thSort} w-28 text-right`}
                onClick={() => handleSort("contributions")}
              >
                <span className="inline-flex items-center gap-1">
                  贡献数{getSortIcon("contributions")}
                </span>
              </th>
              <th
                className={`${thBase} ${thSort} w-20 text-right`}
                onClick={() => handleSort("models")}
              >
                <span className="inline-flex items-center gap-1">
                  模型{getSortIcon("models")}
                </span>
              </th>
              <th
                className={`${thBase} ${thSort} w-28 text-right`}
                onClick={() => handleSort("tps")}
              >
                <span className="inline-flex items-center gap-1">
                  TPS{getSortIcon("tps")}
                </span>
              </th>
              <th
                className={`${thBase} ${thSort} w-28 text-right`}
                onClick={() => handleSort("ttft")}
              >
                <span className="inline-flex items-center gap-1">
                  TTFT{getSortIcon("ttft")}
                </span>
              </th>
              <th className={`${thBase} w-16 pr-4 text-right`}>趋势</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => {
              const isCurrentUser = user.user_id === currentUserId;

              return (
                <tr
                  key={user.user_id}
                  id={`user-rank-${user.rank}`}
                  className={`border-b border-theme-border-faint transition-colors hover:bg-theme-bg-overlay-subtlest ${
                    isCurrentUser ? "bg-theme-accent-primary/[0.03] border-l-2 border-l-theme-accent-primary" : ""
                  }`}
                >
                  {/* 排名 */}
                  <td className="py-3 pl-4">
                    <RankBadge rank={user.rank} />
                  </td>

                  {/* 用户信息 */}
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-8 w-8 overflow-hidden rounded-full bg-theme-bg-quaternary">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.username}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-theme-text-muted">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-theme-text-secondary">
                            {user.username}
                          </span>
                          {isCurrentUser && (
                            <span className="rounded-full bg-theme-accent-primary/10 px-2 py-0.5 text-[10px] text-theme-accent-primary">
                              你
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <LevelDot level={user.contribution_level} />
                          <span className="text-[10px] text-theme-text-disabled">
                            {LEVEL_META[user.contribution_level]?.label || user.contribution_level}
                          </span>
                          {user.streak_days >= 7 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-theme-accent-warning">
                              <Flame className="h-3 w-3" />
                              {user.streak_days}天
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 贡献数 */}
                  <td className="py-3 text-right">
                    <span className="text-sm font-semibold text-theme-text-secondary">
                      {user.total_contributions.toLocaleString()}
                    </span>
                  </td>

                  {/* 模型数 */}
                  <td className="py-3 text-right">
                    <span className="text-sm text-theme-text-muted">
                      {user.models_tested}
                    </span>
                  </td>

                  {/* TPS */}
                  <td className="py-3 text-right">
                    <span className="text-sm text-theme-text-muted">
                      {user.avg_tps.toFixed(1)}
                    </span>
                  </td>

                  {/* TTFT */}
                  <td className="py-3 text-right">
                    <span className="text-sm text-theme-text-muted">
                      {user.avg_ttft_ms}
                    </span>
                    <span className="text-[10px] text-theme-text-disabled">ms</span>
                  </td>

                  {/* 趋势 */}
                  <td className="py-3 pr-4 text-right">
                    <RankChangeIndicator change={user.rank_change} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between border-t border-theme-border-subtle px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-theme-text-muted">
          <span>每页</span>
          <select
            value={pagination.page_size}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-theme-border-subtle bg-theme-bg-quaternary/50 px-2 py-1 text-xs text-theme-text-secondary outline-none focus:border-theme-accent-primary"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>条</span>
          <span className="ml-2 text-theme-text-disabled">
            共 {pagination.total} 条 · {pagination.page} / {pagination.total_pages} 页
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="flex h-8 items-center gap-1 rounded-md border border-theme-border-subtle bg-theme-bg-quaternary/50 px-3 text-xs text-theme-text-secondary transition-colors hover:bg-theme-bg-quaternary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            上一页
          </button>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages}
            className="flex h-8 items-center gap-1 rounded-md border border-theme-border-subtle bg-theme-bg-quaternary/50 px-3 text-xs text-theme-text-secondary transition-colors hover:bg-theme-bg-quaternary disabled:cursor-not-allowed disabled:opacity-50"
          >
            下一页
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
