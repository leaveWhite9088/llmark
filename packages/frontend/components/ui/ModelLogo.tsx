"use client";

import { useState } from "react";
import Image from "next/image";
import { getModelBrand } from "@/constants/brands";

interface ModelLogoProps {
  model: string;
  size?: number;
  className?: string;
  showFallback?: boolean;
}

/**
 * 模型 Logo 组件
 * 优先显示模型专属 logo，没有则显示厂商 logo
 * 如果都没有，则显示模型名称首字母
 */
export default function ModelLogo({
  model,
  size = 24,
  className = "",
  showFallback = true,
}: ModelLogoProps) {
  const [error, setError] = useState(false);
  const brand = getModelBrand(model);

  // 如果有有效 logo 且未加载失败，显示图片
  if (brand.effectiveLogo && !error) {
    return (
      <div
        className={`relative flex-shrink-0 overflow-hidden rounded-md ${className}`}
        style={{ width: size, height: size }}
        title={brand.name}
      >
        <Image
          src={brand.effectiveLogo}
          alt={brand.name}
          fill
          className="object-contain"
          onError={() => setError(true)}
          sizes={`${size}px`}
        />
      </div>
    );
  }

  // 如果没有 logo 或加载失败，显示首字母 fallback
  if (showFallback) {
    const initial = brand.name.charAt(0).toUpperCase();
    return (
      <div
        className={`flex flex-shrink-0 items-center justify-center rounded-md font-semibold text-theme-text-primary ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: brand.color,
          fontSize: size * 0.5,
        }}
        title={brand.name}
      >
        {initial}
      </div>
    );
  }

  return null;
}
