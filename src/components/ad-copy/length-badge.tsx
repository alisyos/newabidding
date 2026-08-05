"use client";

import { cn } from "@/lib/utils";
import type { CounterMode, FieldMeasure } from "@/types/ad-copy";

interface LengthBadgeProps {
  measure: FieldMeasure;
  /** 카운팅 방식 — GOOGLE_CJK_2 일 때 한글 실질 글자수를 병기한다 */
  mode: CounterMode;
  /** 실제 글자수 (카운팅 방식과 무관) */
  koCount: number;
  /** 하한이 있는 필드의 최소 글자수 (네이버 설명 20자) */
  minLength?: number;
}

/** 매체 카운터 기준 글자수 배지 */
export function LengthBadge({
  measure,
  mode,
  koCount,
  minLength,
}: LengthBadgeProps) {
  const tone =
    measure.status === "over"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : measure.status === "under"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  const title =
    measure.status === "over"
      ? `한도 ${measure.limit} 초과 (${-measure.remaining} 초과)`
      : measure.status === "under"
        ? `최소 ${minLength}자 미달`
        : `한도 ${measure.limit} 이내`;

  return (
    <span
      title={title}
      className={cn(
        "shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        tone
      )}
    >
      {measure.count}/{measure.limit}
      {mode === "GOOGLE_CJK_2" && ` · 한글 ${koCount}자`}
    </span>
  );
}
