"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { describeSize, formatRatio } from "@/lib/banner-resize-spec";
import type { BannerResultItem, BannerSource } from "@/types/banner-resize";

interface BannerCompareDialogProps {
  item: BannerResultItem | null;
  source: BannerSource | null;
  onClose: () => void;
}

const CHECKER =
  "bg-[linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%,transparent_75%,hsl(var(--muted))_75%),linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%,transparent_75%,hsl(var(--muted))_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px]";

/** 확대 미리보기 + 원본 비교 (기획서 11.2) */
export function BannerCompareDialog({
  item,
  source,
  onClose,
}: BannerCompareDialogProps) {
  const open = Boolean(item?.imageDataUrl);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {item ? describeSize(item.size) : "미리보기"}
          </DialogTitle>
          <DialogDescription>
            왼쪽이 업로드한 원본, 오른쪽이 생성 결과입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <figure className="space-y-2">
            <figcaption className="text-xs font-medium text-muted-foreground">
              원본{" "}
              {source && `· ${source.width}×${source.height} · ${formatRatio(source.width, source.height)}`}
            </figcaption>
            <div className={`flex items-center justify-center rounded-md p-3 ${CHECKER}`}>
              {source && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={source.dataUrl}
                  alt="원본 배너"
                  className="max-h-[50vh] max-w-full object-contain"
                />
              )}
            </div>
          </figure>

          <figure className="space-y-2">
            <figcaption className="text-xs font-medium text-muted-foreground">
              생성 결과{" "}
              {item &&
                `· ${item.size.width}×${item.size.height} · ${formatRatio(item.size.width, item.size.height)}`}
            </figcaption>
            <div className={`flex items-center justify-center rounded-md p-3 ${CHECKER}`}>
              {item?.imageDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageDataUrl}
                  alt={`${describeSize(item.size)} 생성 결과`}
                  className="max-h-[50vh] max-w-full object-contain"
                />
              )}
            </div>
          </figure>
        </div>
      </DialogContent>
    </Dialog>
  );
}
