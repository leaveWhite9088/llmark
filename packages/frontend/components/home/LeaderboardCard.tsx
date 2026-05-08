import Link from "next/link";
import type { LeaderboardItem } from "@/lib/types";
import { getProviderBrand } from "@/constants/brands";
import ProviderLogo from "@/components/ui/ProviderLogo";
import { getInputLengthBucketLabel } from "@/lib/inputLength";
import { formatNumber } from "@/lib/utils";


type LeaderboardCardProps = {
  rank: number;
  item: LeaderboardItem;
  sortBy: "tps" | "ttft";
};

// 排名样式 - 简洁克制
function getRankBadge(rank: number) {
  if (rank === 1) {
    return (
      <div className="flex h-6 w-6 items-center justify-center text-sm font-semibold text-theme-accent-warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex h-6 w-6 items-center justify-center text-sm font-semibold text-theme-text-tertiary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <circle cx="12" cy="12" r="9" />
          <text x="12" y="16" textAnchor="middle" fill="currentColor" stroke="none" fontSize="10" fontWeight="600">2</text>
        </svg>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex h-6 w-6 items-center justify-center text-sm font-semibold text-theme-accent-warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
          <text x="12" y="15" textAnchor="middle" fill="currentColor" stroke="none" fontSize="8" fontWeight="600">3</text>
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-6 w-6 items-center justify-center text-xs font-medium text-theme-text-disabled">
      {rank}
    </div>
  );
}

export default function LeaderboardCard({
  rank,
  item,
  sortBy,
}: LeaderboardCardProps) {
  const isLimited = item.data_quality === "limited";
  const brand = getProviderBrand(item.provider);

  return (
    <div
      className="group relative flex items-center gap-3 rounded-theme-xl border border-theme-border-subtle bg-theme-bg-quaternary/30 py-3 px-4 transition-all hover:border-theme-border-default hover:bg-theme-bg-quaternary/50"
    >
      {/* 左侧强调条 - 仅前三显示 */}
      <div
        className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full transition-all ${
          rank === 1
            ? "bg-theme-accent-warning"
            : rank === 2
            ? "bg-theme-text-tertiary"
            : rank === 3
            ? "bg-theme-accent-warning"
            : "bg-transparent group-hover:bg-theme-border-default"
        }`}
      />

      {/* 排名 */}
      <div className="shrink-0 pl-2">{getRankBadge(rank)}</div>

      {/* Logo */}
      <div className="shrink-0">
        <ProviderLogo provider={item.provider} size={24} />
      </div>

      {/* 模型信息 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-theme-text-muted">{brand.name}</span>
          <span className="text-theme-text-disabled">/</span>
          <span className="truncate text-sm font-medium text-theme-text-secondary">
            {item.model}
          </span>
        </div>
      </div>

      {/* 输入长度 */}
      <span className="hidden shrink-0 rounded-md bg-theme-bg-quaternary/50 px-2 py-1 text-xs font-medium text-theme-text-muted sm:block">
        {getInputLengthBucketLabel(item.input_length_bucket)}
      </span>

      {/* 数据指标 */}
      <div className="flex shrink-0 items-center gap-5">
        {/* TPS */}
        <div className="w-16 text-right">
          <span
            className={`text-sm font-semibold ${
              sortBy === "tps" ? "text-theme-accent-success" : "text-theme-text-muted"
            }`}
          >
            {item.avg_tps.toFixed(1)}
          </span>
          <span className="ml-1 text-xs text-theme-text-disabled">tps</span>
        </div>

        {/* TTFT */}
        <div className="w-14 text-right">
          <span
            className={`text-sm font-semibold ${
              sortBy === "ttft" ? "text-theme-accent-info" : "text-theme-text-muted"
            }`}
          >
            {item.avg_ttft_ms.toFixed(0)}
          </span>
          <span className="ml-1 text-xs text-theme-text-disabled">ms</span>
        </div>

        {/* 样本数 */}
        <div className="hidden w-12 text-right sm:block">
          <span className="text-xs text-theme-text-disabled">
            {formatNumber(item.sample_count)}
          </span>
        </div>
      </div>

      {/* 数据质量指示 */}
      <div className="shrink-0">
        <div
          className={`h-2 w-2 rounded-full ${
            isLimited ? "bg-theme-accent-warning/50" : "bg-theme-accent-success"
          }`}
          title={isLimited ? "数据量有限" : "数据充足"}
        />
      </div>

      {/* 操作按钮 */}
      <div className="shrink-0 flex items-center gap-1.5">
        <Link
          href={`/model/${encodeURIComponent(item.model)}`}
          className="rounded-md bg-theme-bg-quaternary px-2 py-1 text-xs font-medium text-theme-text-secondary transition-colors hover:bg-theme-accent-primary/20 hover:text-theme-accent-primary"
        >
          看模型
        </Link>
        <Link
          href={`/provider/${item.provider}`}
          className="rounded-md bg-theme-bg-quaternary px-2 py-1 text-xs font-medium text-theme-text-secondary transition-colors hover:bg-theme-accent-primary/20 hover:text-theme-accent-primary"
        >
          看厂商
        </Link>
        <Link
          href={`/provider/${item.provider}/model/${encodeURIComponent(item.model)}`}
          className="rounded-md bg-theme-accent-primary/10 px-2 py-1 text-xs font-medium text-theme-accent-primary transition-colors hover:bg-theme-accent-primary/20"
        >
          看详细
        </Link>
      </div>
    </div>
  );
}
