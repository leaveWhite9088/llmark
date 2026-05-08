// 厂商页面骨架屏卡片
export default function SkeletonCard() {
  return (
    <div className="rounded-theme-xl border border-theme-border-subtle bg-theme-bg-quaternary/30 p-4">
      <div className="mb-2 h-4 w-20 animate-pulse rounded bg-theme-bg-quaternary" />
      <div className="h-8 w-16 animate-pulse rounded bg-theme-bg-quaternary" />
    </div>
  );
}
