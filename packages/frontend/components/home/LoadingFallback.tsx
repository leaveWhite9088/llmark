// 首页加载状态组件
export default function LoadingFallback() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-64 animate-pulse rounded-theme-3xl bg-theme-bg-secondary" />
    </div>
  );
}
