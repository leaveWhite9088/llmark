"use client";

import { X, HelpCircle } from "lucide-react";
import { useState } from "react";
import type { ContributionLevel } from "@/lib/types";

interface LevelInfo {
  level: ContributionLevel;
  label: string;
  min: number;
  max: number | string;
  color: string;
  bgColor: string;
}

const LEVELS: LevelInfo[] = [
  { level: "observer", label: "入门测速员", min: 0, max: 9, color: "text-theme-accent-info", bgColor: "bg-theme-accent-info" },
  { level: "beginner", label: "活跃测速员", min: 10, max: 49, color: "text-theme-accent-success", bgColor: "bg-theme-accent-success" },
  { level: "intermediate", label: "进阶测速员", min: 50, max: 199, color: "text-theme-accent-primary", bgColor: "bg-theme-accent-primary" },
  { level: "advanced", label: "资深测速员", min: 200, max: 499, color: "text-theme-accent-warning", bgColor: "bg-theme-accent-warning" },
  { level: "expert", label: "精英测速官", min: 500, max: 999, color: "text-theme-accent-danger", bgColor: "bg-theme-accent-danger" },
  { level: "legend", label: "首席测速专家", min: 1000, max: "∞", color: "text-theme-accent-purple", bgColor: "bg-theme-accent-purple" },
];

interface LevelInfoModalProps {
  currentLevel?: ContributionLevel;
  trigger?: "button" | "icon";
}

export default function LevelInfoModal({ currentLevel, trigger = "button" }: LevelInfoModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentConfig = currentLevel ? LEVELS.find((l) => l.level === currentLevel) : null;

  return (
    <>
      {trigger === "button" ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-theme-border-subtle bg-theme-bg-quaternary/50 px-3 py-1.5 text-xs text-theme-text-muted transition-colors hover:bg-theme-bg-quaternary hover:text-theme-text-secondary"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>等级说明</span>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center rounded-full p-1 text-theme-text-muted transition-colors hover:bg-theme-bg-quaternary hover:text-theme-text-secondary"
          title="等级说明"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-bg-primary/80 p-4">
          <div className="w-full max-w-sm rounded-xl border border-theme-border-subtle bg-theme-bg-secondary p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-theme-text-secondary">
                测速员进阶体系
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-theme-text-muted transition-colors hover:bg-theme-bg-quaternary hover:text-theme-text-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {currentConfig && (
              <div className="mb-4 rounded-lg border border-theme-border-subtle bg-theme-bg-quaternary/30 p-3">
                <div className="mb-1 text-xs text-theme-text-muted">当前等级</div>
                <div className={`text-lg font-semibold ${currentConfig.color}`}>
                  {currentConfig.label}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {LEVELS.map((item) => {
                const isCurrent = item.level === currentLevel;
                return (
                  <div
                    key={item.level}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                      isCurrent
                        ? "border border-theme-accent-primary/30 bg-theme-accent-primary/10"
                        : "bg-theme-bg-quaternary/50"
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${item.bgColor}`} />
                    <span className={`flex-1 text-sm ${isCurrent ? item.color : "text-theme-text-secondary"}`}>
                      {item.label}
                    </span>
                    <span className="whitespace-nowrap text-xs text-theme-text-muted">
                      {item.min} - {item.max}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-theme-text-muted">
              等级根据累计贡献数自动计算，每 24 小时更新一次。
              达到对应贡献数即可自动升级。
            </p>
          </div>
        </div>
      )}
    </>
  );
}
