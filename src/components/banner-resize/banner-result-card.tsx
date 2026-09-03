"use client";

import {
  AlertTriangle,
  Download,
  Loader2,
  Maximize2,
  RotateCcw,
  Shuffle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BANNER_MODELS, formatRatio } from "@/lib/banner-resize-spec";
import { cn } from "@/lib/utils";
import type { BannerModelKey, BannerResultItem } from "@/types/banner-resize";

interface BannerResultCardProps {
  item: BannerResultItem;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onCompare: () => void;
  onRegenerate: (model: BannerModelKey) => void;
  onDownload: () => void;
  busy: boolean;
}

/** 규격 1건 결과 카드 (기획서 11.1) */
export function BannerResultCard({
  item,
  selected,
  onToggleSelect,
  onCompare,
  onRegenerate,
  onDownload,
  busy,
}: BannerResultCardProps) {
  const spec = BANNER_MODELS[item.model];
  const otherModel: BannerModelKey =
    item.model === "gpt-image-2" ? "nano-banana-2" : "gpt-image-2";
  const pending = item.status === "pending";
  const failed = item.status === "error";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 transition-colors",
        selected ? "border-primary/50 bg-primary/5" : "bg-background"
      )}
    >
      <div className="flex items-center gap-2">
        {item.status === "done" && (
          <Checkbox
            id={`br-sel-${item.id}`}
            checked={selected}
            onCheckedChange={(v) => onToggleSelect(v === true)}
            aria-label={`${item.size.width}×${item.size.height} 선택`}
          />
        )}
        <span className="text-sm font-semibold">
          {item.size.width} × {item.size.height}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatRatio(item.size.width, item.size.height)}
        </span>
        <span className="ml-auto rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
          {spec.subLabel}
        </span>
      </div>

      <div className="flex min-h-[140px] items-center justify-center rounded-md bg-[linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%,transparent_75%,hsl(var(--muted))_75%),linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%,transparent_75%,hsl(var(--muted))_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-3">
        {pending ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            생성 중...
          </span>
        ) : failed ? (
          <span className="px-2 text-center text-sm text-destructive">
            생성 실패
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageDataUrl}
            alt={`${item.size.width}×${item.size.height} 배너`}
            className="max-h-[180px] max-w-full object-contain"
          />
        )}
      </div>

      {failed && item.errorMessage && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          {item.errorMessage}
        </p>
      )}

      {item.warnings.length > 0 && (
        <ul className="space-y-1">
          {item.warnings.map((w, i) => (
            <li
              key={i}
              className="flex items-start gap-1.5 text-xs text-muted-foreground"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap gap-2 border-t pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={busy || item.status !== "done"}
          onClick={onCompare}
        >
          <Maximize2 className="h-3.5 w-3.5" />
          원본 비교
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={busy}
          onClick={() => onRegenerate(item.model)}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {failed ? "다시 생성" : "재생성"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={busy}
          onClick={() => onRegenerate(otherModel)}
          title={`${BANNER_MODELS[otherModel].subLabel}로 다시 생성`}
        >
          <Shuffle className="h-3.5 w-3.5" />
          {BANNER_MODELS[otherModel].subLabel}로
        </Button>
        <Button
          type="button"
          size="sm"
          className="ml-auto gap-1.5"
          disabled={busy || item.status !== "done"}
          onClick={onDownload}
        >
          <Download className="h-3.5 w-3.5" />
          다운로드
        </Button>
      </div>
    </div>
  );
}
