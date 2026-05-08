import type { Metadata } from "next";

import Navbar from "@/components/Navbar";
import ScrollRestoration from "@/components/ScrollRestoration";
import ThemeProvider from "@/components/theme/ThemeProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "LLMark — 众包 LLM API 性能基准测试平台",
  description: "查看 TPS、TTFT 排行榜，为模型选型提供真实数据支撑",
  icons: {
    icon: "/assets/logo/llmark-logo.png",
    apple: "/assets/logo/llmark-logo.png",
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Navbar />
          <main className="min-h-screen">
            <ScrollRestoration />
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
