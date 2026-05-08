"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";

type CustomSelectProps = {
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
  label: string;
};

/**
 * 自定义下拉选择组件
 * 支持键盘导航（上下箭头、回车、Esc）
 */
export default function CustomSelect({
  value,
  options,
  onChange,
  label
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const allOptions = options;
  const selectedOption = options.find((opt) => opt.value === value);
  const selectedLabel = selectedOption?.label || options[0]?.label || "";
  const hasValue = value !== options[0]?.value;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < allOptions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : allOptions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          onChange(allOptions[highlightedIndex].value);
          setIsOpen(false);
        }
        break;
    }
  }, [isOpen, highlightedIndex, allOptions, onChange]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          flex items-center gap-2 rounded-full border px-3 py-2 text-sm
          transition-all duration-200
          ${hasValue
            ? "border-theme-accent-primary/50 bg-theme-accent-primary-subtle text-theme-accent-primary-light"
            : "border-theme-border-light bg-theme-bg-primary text-theme-text-muted hover:border-theme-border-default hover:text-theme-text-secondary"
          }
        `}
      >
        <span className="text-xs text-theme-text-muted">{label}</span>
        <span className="font-medium">{selectedLabel}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[140px] overflow-hidden rounded-xl border border-theme-border-DEFAULT bg-theme-bg-tertiary shadow-xl">
          <div className="max-h-[200px] overflow-auto py-1">
            {allOptions.map((option, index) => (
              <button
                key={option.value || "all"}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`
                  w-full px-3 py-2 text-left text-sm transition-colors
                  ${value === option.value
                    ? "bg-theme-accent-primary-subtle text-theme-accent-primary-light"
                    : index === highlightedIndex
                    ? "bg-theme-bg-quaternary/50 text-theme-text-secondary"
                    : "text-theme-text-tertiary hover:bg-theme-bg-quaternary/50"
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
