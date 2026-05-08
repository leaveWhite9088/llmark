"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-theme-bg-primary px-4 text-center">
          <h2 className="text-xl font-semibold text-theme-text-primary">出错了</h2>
          <p className="mt-2 text-sm text-theme-text-muted">
            {error.message || "页面加载异常，请稍后重试"}
          </p>
          <button
            onClick={reset}
            className="mt-4 rounded-lg bg-theme-accent-primary px-4 py-2 text-sm font-medium text-theme-text-primary"
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
