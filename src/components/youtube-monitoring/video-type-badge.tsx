// Shorts / 일반영상 구분 배지.
// 이 프로젝트에는 공용 Badge 컴포넌트가 없어 admin 의 TypeBadge 스타일을 따랐다.

import { cn } from "@/lib/utils";

interface VideoTypeBadgeProps {
  isShorts: boolean;
}

export function VideoTypeBadge({ isShorts }: VideoTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        isShorts ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"
      )}
    >
      {isShorts ? "Shorts" : "일반영상"}
    </span>
  );
}
