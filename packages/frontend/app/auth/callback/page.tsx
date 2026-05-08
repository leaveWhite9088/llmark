"use client";

import { Suspense, useEffect } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { clearLegacyToken } from "@/lib/auth";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    clearLegacyToken();
    router.replace(error ? `/?auth_error=${encodeURIComponent(error)}` : "/");
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 text-theme-text-tertiary">
      登录中...
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center px-4 text-theme-text-tertiary">
          登录中...
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
