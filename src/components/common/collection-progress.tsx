"use client";

// 수집 진행 상태 카드 — 네이버 블로그 댓글 수집·인스타 댓글 수집 공용.
//
// 도너 화면은 수집 중에 전체화면 모달로 화면을 덮었는데,
// 호스트에는 그런 차단형 패턴이 없어 인라인 카드로 바꿨다.
// (Dialog 는 확인·수정용으로만 쓴다)

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type CollectionStatus = "streaming" | "done" | "error";

interface CollectionProgressProps {
  status: CollectionStatus;
  /** 지금까지 수집한 건수 */
  collected: number;
  /**
   * 0~100. 총량을 알 수 없으면 undefined 를 넘긴다.
   * (인스타는 전체 댓글 수를 미리 알 수 없어 불확정 막대를 쓴다)
   */
  percent?: number;
  /** 진행 상세 (예: "페이지 4 / 12") */
  stageLabel?: string;
  /** 실패 사유 — status 가 error 일 때만 표시 */
  error?: string | null;
  /** 부분 수집 상태인지 (오류지만 결과가 남아 있는 경우) */
  partial?: boolean;
}

const STATUS_TEXT: Record<CollectionStatus, string> = {
  streaming: "댓글 수집 중...",
  done: "수집 완료",
  error: "수집 중단",
};

export function CollectionProgress({
  status,
  collected,
  percent,
  stageLabel,
  error,
  partial = false,
}: CollectionProgressProps) {
  const indeterminate = status === "streaming" && percent === undefined;

  return (
    <div className="space-y-4">
      {/* 상태 헤더 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {status === "streaming" && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {status === "done" && (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          )}
          {status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
          <span className="text-sm font-medium">{STATUS_TEXT[status]}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {collected.toLocaleString()}
          </span>
          건 수집
          {status === "streaming" && percent !== undefined && ` · ${percent}%`}
        </span>
      </div>

      {/* 진행 막대 */}
      {status === "streaming" && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-primary transition-all duration-300",
              indeterminate && "w-1/3 animate-pulse"
            )}
            style={indeterminate ? undefined : { width: `${percent ?? 0}%` }}
          />
        </div>
      )}

      {stageLabel && status === "streaming" && (
        <p className="text-xs text-muted-foreground">{stageLabel}</p>
      )}

      {/* 완료 안내 */}
      {status === "done" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {collected > 0
            ? "수집이 완료되었습니다. 아래에서 결과를 확인하고 CSV로 내려받으세요."
            : "수집은 끝났지만 댓글을 하나도 찾지 못했습니다. 게시글에 댓글이 없거나, 페이지 구조가 변경되었을 수 있습니다."}
        </div>
      )}

      {/* 실패 안내 */}
      {status === "error" && error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <p className="font-medium">
            {partial ? "수집이 중간에 멈췄습니다" : "수집에 실패했습니다"}
          </p>
          <p className="mt-1 text-xs leading-relaxed">{error}</p>
          {partial && (
            <p className="mt-2 text-xs text-muted-foreground">
              지금까지 모인 {collected.toLocaleString()}건은 그대로 내려받을 수
              있습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
