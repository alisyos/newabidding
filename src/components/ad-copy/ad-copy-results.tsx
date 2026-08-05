"use client";

import { CheckSquare, Copy, Download, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdCopyMediaPanel } from "@/components/ad-copy/ad-copy-media-panel";
import { flattenItems } from "@/lib/ad-copy-evaluate";
import { MEDIA_SPECS } from "@/lib/ad-copy-spec";
import { cn } from "@/lib/utils";
import type { AdMediaKey, EvaluatedMediaResult } from "@/types/ad-copy";

interface AdCopyResultsProps {
  results: EvaluatedMediaResult[];
  activeMedia: AdMediaKey | null;
  onActiveMediaChange: (media: AdMediaKey) => void;
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  /** 현재 탭의 전체 선택/해제 */
  onToggleAll: (ids: string[], checked: boolean) => void;
  onCopy: (text: string) => void;
  onCopySelected: () => void;
  onDownloadCsv: () => void;
  /** 선택된 문구 총 개수 (전 매체 합산) */
  selectedCount: number;
}

/** 매체별 탭 + 액션바 + 결과 패널 */
export function AdCopyResults({
  results,
  activeMedia,
  onActiveMediaChange,
  selectedIds,
  onToggle,
  onToggleAll,
  onCopy,
  onCopySelected,
  onDownloadCsv,
  selectedCount,
}: AdCopyResultsProps) {
  const active = results.find((r) => r.media === activeMedia) ?? results[0];
  if (!active) return null;

  const activeIds = flattenItems(active).map((i) => i.id);
  const allChecked =
    activeIds.length > 0 && activeIds.every((id) => selectedIds.has(id));

  return (
    <div className="space-y-4">
      {/* 매체 탭 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border p-1">
          {results.map((r) => (
            <button
              key={r.media}
              type="button"
              onClick={() => onActiveMediaChange(r.media)}
              className={cn(
                "flex items-center gap-1.5 rounded px-4 py-1.5 text-sm font-medium transition-colors",
                active.media === r.media
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {MEDIA_SPECS[r.media].shortName}
              {r.errorCount > 0 && (
                <span
                  title={`검토 필요 ${r.errorCount}건`}
                  className="rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground"
                >
                  {r.errorCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 액션바 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            선택 {selectedCount}개
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onToggleAll(activeIds, !allChecked)}
          >
            {allChecked ? (
              <Square className="h-4 w-4" />
            ) : (
              <CheckSquare className="h-4 w-4" />
            )}
            {allChecked ? "전체 해제" : "전체 선택"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onCopySelected}
          >
            <Copy className="h-4 w-4" />
            선택 복사
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onDownloadCsv}
          >
            <Download className="h-4 w-4" />
            CSV 다운로드
          </Button>
        </div>
      </div>

      <AdCopyMediaPanel
        result={active}
        selectedIds={selectedIds}
        onToggle={onToggle}
        onCopy={onCopy}
      />
    </div>
  );
}
