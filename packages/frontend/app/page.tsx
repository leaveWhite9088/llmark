import { Suspense } from "react";
import LoadingFallback from "@/components/home/LoadingFallback";
import HomePageContent from "@/components/home/HomePageContent";

// 包装组件 - 提供 Suspense boundary 给 useSearchParams
export default function HomePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomePageContent />
    </Suspense>
  );
}
