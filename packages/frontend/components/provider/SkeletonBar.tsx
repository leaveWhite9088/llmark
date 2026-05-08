// 厂商页面骨架屏条形
export default function SkeletonBar() {
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <div className="h-4 w-16 animate-pulse rounded bg-theme-bg-quaternary" />
          <div className="h-4 w-8 animate-pulse rounded bg-theme-bg-quaternary" />
        </div>
        <div className="h-2 w-full rounded-full bg-theme-bg-quaternary">
          <div className="h-2 w-2/3 animate-pulse rounded-full bg-theme-bg-quaternary/50" />
        </div>
      </div>
    </div>
  );
}
