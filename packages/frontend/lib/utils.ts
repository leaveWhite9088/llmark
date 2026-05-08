/**
 * 通用工具函数
 */

/**
 * 格式化数字，大于 1000 显示为 k 格式
 * @param num 数字
 * @returns 格式化后的字符串
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

// ==================== 速度评级工具 ====================

import type { SpeedRating } from "./types";

export type { SpeedRating };

/**
 * 根据 TPS 获取速度评级
 * @param tps 每秒 token 数
 * @returns 评级标签和颜色
 */
export function getSpeedRating(tps: number): SpeedRating {
  if (tps > 150) return { label: "极快", color: "text-theme-accent-success" };
  if (tps > 100) return { label: "快", color: "text-theme-accent-info" };
  if (tps >= 50) return { label: "中", color: "text-theme-accent-warning" };
  return { label: "慢", color: "text-theme-accent-danger" };
}

/**
 * 获取速度评级分数（用于排序）
 * @param tps 每秒 token 数
 * @returns 评级分数 1-4
 */
export function getRatingScore(tps: number): number {
  if (tps > 150) return 4; // 极快
  if (tps > 100) return 3; // 快
  if (tps >= 50) return 2; // 中
  return 1; // 慢
}

