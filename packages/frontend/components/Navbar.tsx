"use client";

import Link from "next/link";
import Image from "next/image";
import { Github, LogOut, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { setDeviceIdCookie, getAuthUrl } from "@/lib/auth";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const navLinkClass = (path: string) => {
    const active = isActive(path);
    return `
      rounded-full px-3 py-2 font-medium transition-colors
      ${active
        ? "text-base text-theme-text-primary bg-theme-bg-quaternary/70"
        : "text-sm text-theme-text-muted hover:bg-theme-bg-quaternary/50 hover:text-theme-text-secondary"
      }
    `;
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-theme-border-subtle bg-theme-bg-primary/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-theme-glow-primary">
            <Image
              src="/assets/logo/llmark-logo.png"
              alt="LLMark Logo"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </span>
          <div>
            <div className="text-base font-semibold tracking-tight text-theme-text-primary">LLMark</div>
            <div className="text-xs text-theme-text-muted">LLM performance from the wild</div>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/" className={navLinkClass("/")}>
            性能榜
          </Link>
          <Link href="/leaderboard" className={navLinkClass("/leaderboard")}>
            贡献榜
          </Link>
          <Link href="/models" className={navLinkClass("/models")}>
            模型
          </Link>
          <Link href="/providers" className={navLinkClass("/providers")}>
            厂商
          </Link>
          <Link href="/me" className={navLinkClass("/me")}>
            我的
          </Link>

          <div className="mx-2 h-6 w-px bg-theme-border-subtle" />

          <ThemeToggle />

          <div className="mx-2 h-6 w-px bg-theme-border-subtle" />

          {loading ? (
            <div className="text-sm text-theme-text-muted">Loading...</div>
          ) : user ? (
            <>
              <Link
                href="/me"
                className="inline-flex items-center gap-2 rounded-full border border-theme-border-default bg-theme-bg-quaternary/50 px-4 py-2 text-sm font-medium text-theme-text-secondary transition-all hover:border-theme-accent-primary/50 hover:bg-theme-accent-primary-subtle hover:text-theme-accent-primary-light"
              >
                <Trophy size={16} />
                @{user.github_username}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-theme-text-muted transition-colors hover:bg-theme-bg-quaternary/50 hover:text-theme-text-secondary"
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setDeviceIdCookie(); window.location.href = getAuthUrl(); }}
              className="inline-flex items-center gap-2 rounded-full bg-theme-bg-quaternary/80 px-4 py-2 text-sm font-semibold text-theme-text-primary transition-all hover:bg-theme-bg-quaternary"
            >
              <Github size={16} />
              GitHub Login
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
