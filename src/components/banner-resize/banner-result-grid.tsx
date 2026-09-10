"use client";

import { CheckSquare, Download, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/common/select-field";
import { BannerResultCard } from "@/components/banner-resize/banner-result-card";
import { OUTPUT_FORMATS } from "@/lib/banner-canvas";
import { formatBytes } from "@/lib/banner-resize-spec";
import type {
  BannerModelKey,
  BannerOutputFormat,
  BannerResultItem,
} from "@/types/banner-resize";

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
  format: BannerOutputFormat;
  onFormatChange: (format: BannerOutputFormat) => void;
  /** 완료된 결과 중 첫 건의 PNG 용량 (바이트). 절감 안내 문구용 */
  pngBytes?: number;
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
  format,
  onFormatChange,
  pngBytes,
}: BannerResultGridProps) {
  const doneItems = items.filter((i) => i.status === "done");
  const allChecked =
    doneItems.length > 0 && doneItems.every((i) => selectedIds.has(i.id));
  const selectedCount = doneItems.filter((i) => selectedIds.has(i.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
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

          {/* 미리보기는 PNG 지만, 저장 포맷에 따라 용량이 크게 갈린다 */}
          {pngBytes !== undefined && (
            <p className="text-xs text-muted-foreground">
              {format === "png"
                ? `현재 PNG · 약 ${formatBytes(pngBytes)}. JPG q85 로 저장하면 대부분 지면의 용량 기준 안으로 들어옵니다.`
                : `PNG 약 ${formatBytes(pngBytes)} → ${OUTPUT_FORMATS[format].label.split(" ")[0]} 로 저장하면 크게 줄어듭니다. (RGB 로 플래튼되어 투명 영역은 흰색이 됩니다)`}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="w-[210px]">
            <SelectField
              id="br-out-format"
              label="다운로드 포맷"
              value={format}
              onChange={(v) => onFormatChange(v as BannerOutputFormat)}
              options={(Object.keys(OUTPUT_FORMATS) as BannerOutputFormat[]).map(
                (k) => ({
                  value: k,
                  label: OUTPUT_FORMATS[k].label,
                })
              )}
            />
          </div>

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
