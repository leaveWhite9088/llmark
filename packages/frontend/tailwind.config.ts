import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // 使用 CSS 变量定义主题色
        theme: {
          // 背景色
          bg: {
            primary: "var(--color-bg-primary)",
            secondary: "var(--color-bg-secondary)",
            tertiary: "var(--color-bg-tertiary)",
            quaternary: "var(--color-bg-quaternary)",
            overlay: {
              subtlest: "var(--color-bg-overlay-subtlest)",
              subtle: "var(--color-bg-overlay-subtle)",
              DEFAULT: "var(--color-bg-overlay-default)",
            },
          },
          // 文字色
          text: {
            primary: "var(--color-text-primary)",
            secondary: "var(--color-text-secondary)",
            tertiary: "var(--color-text-tertiary)",
            muted: "var(--color-text-muted)",
            disabled: "var(--color-text-disabled)",
          },
          // 边框色
          border: {
            faint: "var(--color-border-faint)",
            subtle: "var(--color-border-subtle)",
            light: "var(--color-border-light)",
            DEFAULT: "var(--color-border-default)",
            medium: "var(--color-border-medium)",
            strong: "var(--color-border-strong)",
            focus: "var(--color-border-focus)",
          },
          // 强调色
          accent: {
            primary: "var(--color-accent-primary)",
            "primary-light": "var(--color-accent-primary-light)",
            "primary-dark": "var(--color-accent-primary-dark)",
            success: "var(--color-accent-success)",
            info: "var(--color-accent-info)",
            warning: "var(--color-accent-warning)",
            danger: "var(--color-accent-danger)",
            purple: "var(--color-accent-purple)",
          }
        },

        // 保留 slate 色板用于兼容性
        // 但新代码应优先使用 theme 前缀的颜色
      },
      borderRadius: {
        "theme-sm": "var(--radius-sm)",
        "theme-md": "var(--radius-md)",
        "theme-lg": "var(--radius-lg)",
        "theme-xl": "var(--radius-xl)",
        "theme-2xl": "var(--radius-2xl)",
        "theme-3xl": "var(--radius-3xl)",
      },
      spacing: {
        "theme-1": "var(--space-1)",
        "theme-2": "var(--space-2)",
        "theme-3": "var(--space-3)",
        "theme-4": "var(--space-4)",
        "theme-5": "var(--space-5)",
        "theme-6": "var(--space-6)",
        "theme-8": "var(--space-8)",
        "theme-10": "var(--space-10)",
        "theme-12": "var(--space-12)",
      },
      fontSize: {
        "theme-xs": "var(--text-xs)",
        "theme-sm": "var(--text-sm)",
        "theme-base": "var(--text-base)",
        "theme-lg": "var(--text-lg)",
        "theme-xl": "var(--text-xl)",
        "theme-2xl": "var(--text-2xl)",
      },
      zIndex: {
        "theme-dropdown": "var(--z-dropdown)",
        "theme-sticky": "var(--z-sticky)",
        "theme-modal": "var(--z-modal)",
        "theme-popover": "var(--z-popover)",
        "theme-tooltip": "var(--z-tooltip)",
        "theme-toast": "var(--z-toast)",
      },
      boxShadow: {
        "theme-sm": "var(--shadow-sm)",
        "theme-md": "var(--shadow-md)",
        "theme-lg": "var(--shadow-lg)",
        "theme-xl": "var(--shadow-xl)",
        "theme-glow-primary": "var(--shadow-glow-primary)",
        "theme-glow-success": "var(--shadow-glow-success)",
      },
    },
  },
  plugins: [],
};

export default config;
