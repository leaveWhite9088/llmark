"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <h2 className="text-lg font-semibold text-theme-text-primary">
        出错了
      </h2>
      <p className="mt-2 text-sm text-theme-text-muted">
        {error.message || "页面加载异常，请稍后重试"}
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-theme-accent-primary px-4 py-2 text-sm font-medium text-theme-text-primary transition-colors hover:bg-theme-accent-primary/90"
      >
        重试
      </button>
    </div>
  );
}
