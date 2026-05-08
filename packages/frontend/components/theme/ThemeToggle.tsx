"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-theme-border-subtle bg-theme-bg-quaternary/50 text-theme-text-muted transition-colors hover:bg-theme-bg-quaternary hover:text-theme-text-secondary"
      aria-label={resolvedTheme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
    >
      {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
