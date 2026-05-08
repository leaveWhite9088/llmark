import Link from "next/link";
import { BarChart3, ArrowLeft, ExternalLink } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-theme-border-subtle bg-theme-bg-secondary/30 px-6 py-16 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-theme-bg-quaternary"
      >
        <BarChart3 size={28} className="text-theme-text-muted" />
      </div>

      <h2 className="mt-4 text-lg font-medium text-theme-text-primary"
      >
        你还没有留下测速足迹
      </h2>

      <p className="mt-2 max-w-sm text-sm text-theme-text-muted"
      >
        接入 LLMark SDK 后，这里会展示你的贡献记录、热力图和个人测速画像
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3"
      >
        <a
          href="https://github.com/leaveWhite9088/LLMark/tree/main/sdk"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-theme-accent-primary px-4 py-2 text-sm font-medium text-theme-text-on-accent transition-colors hover:bg-theme-accent-primary/90"
        >
          查看 SDK 接入方式
          <ExternalLink size={14} />
        </a>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-theme-border-subtle px-4 py-2 text-sm font-medium text-theme-text-secondary transition-colors hover:bg-theme-bg-quaternary"
        >
          <ArrowLeft size={14} />
          返回排行榜
        </Link>
      </div>
    </div>
  );
}
