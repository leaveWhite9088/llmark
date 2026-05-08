"use client";

import { useState } from "react";
import { getProviderBrand } from "@/constants/brands";

type ProviderLogoProps = {
  provider: string;
  size?: number;
  className?: string;
};

export default function ProviderLogo({ provider, size = 32, className = "" }: ProviderLogoProps) {
  const brand = getProviderBrand(provider);
  const [imgError, setImgError] = useState(false);

  // 如果有 logo 图片且未加载失败，使用 img 标签
  if (brand.logo && !imgError) {
    return (
      <img
        src={brand.logo}
        alt={brand.name}
        width={size}
        height={size}
        className={`shrink-0 rounded-lg object-contain ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  // 没有 logo 或加载失败时显示品牌色背景 + 首字母
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg font-bold text-theme-text-primary ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: brand.color,
        fontSize: size > 24 ? '14px' : '10px'
      }}
    >
      {brand.name.charAt(0).toUpperCase()}
    </div>
  );
}
