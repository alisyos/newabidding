"use client";

import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BANNER_MODELS, describeSize } from "@/lib/banner-resize-spec";
import type { BannerModelKey, BannerSize } from "@/types/banner-resize";

interface RunSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: BannerModelKey;
  sizes: BannerSize[];
  cost: number;
  balance: number;
  loading: boolean;
  onConfirm: () => void;
}

/** 기획서 8.2 — 실행 전 요약 */
export function RunSummaryDialog({
  open,
  onOpenChange,
  model,
  sizes,
  cost,
  balance,
  loading,
  onConfirm,
}: RunSummaryDialogProps) {
  const spec = BANNER_MODELS[model];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>생성 내용 확인</DialogTitle>
          <DialogDescription>
            아래 내용으로 배너를 생성합니다. 생성에 성공한 이미지 개수만큼만
            포인트가 차감됩니다.
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">선택 모델</dt>
            <dd className="font-medium">
              {spec.label} ({spec.subLabel})
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">생성 사이즈</dt>
            <dd className="mt-1 space-y-0.5">
              {sizes.map((s) => (
                <p key={s.id} className="font-medium">
                  {describeSize(s)}
                </p>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">총 생성 이미지</dt>
            <dd className="font-medium">{sizes.length}개</dd>
          </div>
          <div className="border-t pt-3">
            <dt className="text-xs text-muted-foreground">예상 차감</dt>
            <dd className="font-medium">
              {cost.toLocaleString()}P{" "}
              <span className="font-normal text-muted-foreground">
                (보유 {balance.toLocaleString()}P)
              </span>
            </dd>
          </div>
        </dl>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            className="gap-1.5"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            생성 시작
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
