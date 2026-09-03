"use client";

import { CheckSquare, Download, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BannerResultCard } from "@/components/banner-resize/banner-result-card";
import type { BannerModelKey, BannerResultItem } from "@/types/banner-resize";

interface BannerResultGridProps {
  items: BannerResultItem[];
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onCompare: (item: BannerResultItem) => void;
  onRegenerate: (item: BannerResultItem, model: BannerModelKey) => void;
  onDownload: (item: BannerResultItem) => void;
  onDownloadSelected: () => void;
  onDownloadAll: () => void;
  busyIds: Set<string>;
}

/** 결과 카드 그리드 + 다운로드 액션바 */
export function BannerResultGrid({
  items,
  selectedIds,
  onToggle,
  onToggleAll,
  onCompare,
  onRegenerate,
  onDownload,
  onDownloadSelected,
  onDownloadAll,
  busyIds,
}: BannerResultGridProps) {
  const doneItems = items.filter((i) => i.status === "done");
  const allChecked =
    doneItems.length > 0 && doneItems.every((i) => selectedIds.has(i.id));
  const selectedCount = doneItems.filter((i) => selectedIds.has(i.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          생성 완료{" "}
          <span className="font-medium text-foreground">{doneItems.length}</span>건
          {items.length !== doneItems.length && (
            <>
              {" · "}
              <span className="font-medium text-destructive">
                {items.filter((i) => i.status === "error").length}
              </span>
              건 실패
            </>
          )}
          {selectedCount > 0 && ` · 선택 ${selectedCount}건`}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={doneItems.length === 0}
            onClick={() => onToggleAll(!allChecked)}
          >
            {allChecked ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {allChecked ? "전체 해제" : "전체 선택"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={selectedCount === 0}
            onClick={onDownloadSelected}
          >
            <Download className="h-4 w-4" />
            선택 다운로드
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={doneItems.length === 0}
            onClick={onDownloadAll}
          >
            <Download className="h-4 w-4" />
            전체 다운로드
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <BannerResultCard
            key={item.id}
            item={item}
            selected={selectedIds.has(item.id)}
            busy={busyIds.has(item.id)}
            onToggleSelect={(checked) => onToggle(item.id, checked)}
            onCompare={() => onCompare(item)}
            onRegenerate={(model) => onRegenerate(item, model)}
            onDownload={() => onDownload(item)}
          />
        ))}
      </div>
    </div>
  );
}
