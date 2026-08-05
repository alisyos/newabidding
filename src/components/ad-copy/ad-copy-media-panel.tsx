"use client";

import { AlertCircle, Info, RefreshCw } from "lucide-react";
import { AdCopyItemRow } from "@/components/ad-copy/ad-copy-item-row";
import { MEDIA_SPECS } from "@/lib/ad-copy-spec";
import type { EvaluatedAdCopyItem, EvaluatedMediaResult } from "@/types/ad-copy";

interface AdCopyMediaPanelProps {
  result: EvaluatedMediaResult;
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onCopy: (text: string) => void;
}

/** 매체 1개의 제목·설명 결과 패널 */
export function AdCopyMediaPanel({
  result,
  selectedIds,
  onToggle,
  onCopy,
}: AdCopyMediaPanelProps) {
  const spec = MEDIA_SPECS[result.media];

  if (result.status === "error") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">{spec.displayName} 생성에 실패했습니다.</p>
          <p className="mt-0.5 text-xs">{result.errorMessage}</p>
        </div>
      </div>
    );
  }

  const section = (
    title: string,
    items: EvaluatedAdCopyItem[],
    limitNote: string
  ) => (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{limitNote}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {items.length}개
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <AdCopyItemRow
            key={item.id}
            item={item}
            checked={selectedIds.has(item.id)}
            onToggle={onToggle}
            onCopy={onCopy}
          />
        ))}
      </div>
    </div>
  );

  const titleSpec = spec.fields.title;
  const descSpec = spec.fields.description;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">
          {spec.displayName} · {spec.productName} — {spec.counterNote}
        </span>
        {result.repaired && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
            <RefreshCw className="h-3 w-3" />
            규정 위반으로 1회 재생성됨
          </span>
        )}
      </div>

      {section(
        titleSpec.label,
        result.titles,
        `최대 ${titleSpec.limit}카운트${
          spec.counter === "GOOGLE_CJK_2"
            ? ` (한글 ${titleSpec.koEffective}자)`
            : ""
        }`
      )}

      {section(
        descSpec.label,
        result.descriptions,
        descSpec.minLength
          ? `${descSpec.minLength}~${descSpec.limit}자`
          : `최대 ${descSpec.limit}카운트${
              spec.counter === "GOOGLE_CJK_2"
                ? ` (한글 ${descSpec.koEffective}자)`
                : ""
            }`
      )}
    </div>
  );
}
