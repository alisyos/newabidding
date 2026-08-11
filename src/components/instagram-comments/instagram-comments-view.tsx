"use client";

import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, Download, Instagram } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UrlCollectForm } from "@/components/common/url-collect-form";
import {
  CollectionProgress,
  type CollectionStatus,
} from "@/components/common/collection-progress";
import { InstagramCommentTable } from "@/components/instagram-comments/instagram-comment-table";
import { SessionExpiredNotice } from "@/components/instagram-comments/session-expired-notice";
import { useNdjsonCollection } from "@/hooks/use-ndjson-collection";
import { buildInstagramCommentCsv } from "@/lib/comment-csv";
import { downloadCsv } from "@/lib/keyword-csv";
import { safeFileName } from "@/lib/download-file";
import { fileDateStamp, urlFileLabel } from "@/lib/table-csv";
import { userName } from "@/lib/users";
import {
  useAgentPrice,
  useCurrentBalance,
  useCurrentUserId,
  usePointsStore,
} from "@/store/points";
import type {
  InstagramComment,
  InstagramErrorCode,
  InstagramStreamChunk,
} from "@/types/instagram-comment";
import type { UserId } from "@/types/user";

/**
 * 과금 대상 에이전트.
 *
 * [주의] 이 포인트 차감은 화면상의 표시일 뿐 실제 사용 제한이 아니다.
 * /api/instagram-comments/stream 에는 인증이 없어 API 를 직접 호출하면 그대로 우회된다.
 */
const AGENT_ID = "instagram-comments" as const;

export function InstagramCommentsView() {
  const [url, setUrl] = useState("");
  const [inputError, setInputError] = useState<string>();
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<InstagramErrorCode | null>(null);
  const [collectedUrl, setCollectedUrl] = useState("");
  /** 중도 종료로 일부만 모인 경우의 안내 문구 */
  const [truncatedNotice, setTruncatedNotice] = useState<string | null>(null);

  // 정산은 비동기 클로저에서 일어나므로 정산에 쓰는 값은 ref 로 함께 들고 간다
  const commentsRef = useRef<InstagramComment[]>([]);
  const streamErrorRef = useRef<string | null>(null);
  const truncatedRef = useRef(false);
  const chargeUserIdRef = useRef<UserId | null>(null);

  const deduct = usePointsStore((s) => s.deduct);
  const balance = useCurrentBalance();
  const currentUserId = useCurrentUserId();
  const unitPrice = useAgentPrice(AGENT_ID);

  const collection = useNdjsonCollection<InstagramStreamChunk, { postUrl: string }>(
    {
      url: "/api/instagram-comments/stream",

      onStart: () => {
        commentsRef.current = [];
        streamErrorRef.current = null;
        truncatedRef.current = false;
        setComments([]);
        setStreamError(null);
        setErrorCode(null);
        setTruncatedNotice(null);
      },

      onChunk: (chunk) => {
        if (chunk.type === "batch") {
          // 마지막 배치는 답글 수가 전역 재계산된 "전체 배열"이다.
          // 누적하면 모든 댓글이 두 번씩 들어가므로 반드시 교체해야 한다.
          commentsRef.current =
            chunk.isLastBatch && chunk.comments.length > 0
              ? chunk.comments
              : [...commentsRef.current, ...chunk.comments];
          setComments(commentsRef.current);
        } else if (chunk.type === "complete") {
          if (chunk.truncated) {
            truncatedRef.current = true;
            setTruncatedNotice(chunk.message);
          }
        } else if (chunk.type === "error") {
          streamErrorRef.current = chunk.message;
          setStreamError(chunk.message);
          setErrorCode(chunk.errorCode);
        }
      },

      // 스트림이 어떤 이유로 끝나든 정확히 한 번 호출된다 → 유일한 정산 지점
      onSettle: ({ aborted, transportError }) => {
        const failed = aborted || !!transportError || !!streamErrorRef.current;
        const count = commentsRef.current.length;

        if (transportError) setStreamError(transportError);

        // 실패(오류·중단)한 실행에는 과금하지 않는다
        if (failed) {
          if (aborted) {
            toast.info(
              count > 0
                ? `수집을 중단했습니다. 지금까지 모인 ${count.toLocaleString()}건은 내려받을 수 있습니다.`
                : "수집을 중단했습니다."
            );
          }
          return;
        }

        if (count === 0) {
          toast.warn(
            "댓글을 하나도 찾지 못했습니다. 게시물에 댓글이 없거나, 인스타그램 페이지 구조가 변경되었을 수 있습니다."
          );
          return;
        }

        const chargeUserId = chargeUserIdRef.current;
        if (!chargeUserId) return;

        if (
          deduct({
            userId: chargeUserId,
            agentId: AGENT_ID,
            amount: unitPrice,
            detail: `댓글 ${count}건`,
          })
        ) {
          const charged = `${userName(chargeUserId)}님 계정에서 ${unitPrice.toLocaleString()}P 차감되었습니다.`;
          // 중도 종료를 "완료"로만 알리면 전부 받은 줄 안다
          if (truncatedRef.current) {
            toast.warn(
              `댓글 ${count.toLocaleString()}건 수집 (중간에 멈춰 일부만 수집) · ${charged}`
            );
          } else {
            toast.success(
              `댓글 ${count.toLocaleString()}건 수집 완료 · ${charged}`
            );
          }
        } else {
          toast.error(
            "포인트가 부족해 차감하지 못했습니다. 관리자 페이지에서 충전해주세요."
          );
        }
      },
    }
  );

  const busy = collection.status === "streaming";

  const handleStart = () => {
    if (!url.trim()) {
      setInputError("인스타그램 게시물 URL을 입력해주세요.");
      return;
    }
    setInputError(undefined);

    if (balance < unitPrice) {
      toast.error(
        `포인트가 부족합니다. (필요 ${unitPrice.toLocaleString()}P · 보유 ${balance.toLocaleString()}P) 관리자 페이지에서 충전해주세요.`
      );
      return;
    }

    chargeUserIdRef.current = currentUserId;
    setCollectedUrl(url.trim());
    void collection.start({ postUrl: url.trim() });
  };

  const handleDownload = () => {
    if (comments.length === 0) {
      toast.error("다운로드할 댓글이 없습니다.");
      return;
    }
    downloadCsv(
      `instagram_comments_${safeFileName(urlFileLabel(collectedUrl))}_${fileDateStamp()}.csv`,
      buildInstagramCommentCsv(comments, {
        postUrl: collectedUrl,
        truncated: !!truncatedNotice,
      })
    );
  };

  const displayError = streamError ?? collection.transportError;
  const sessionExpired = errorCode === "SESSION_EXPIRED";
  const progressStatus: CollectionStatus =
    collection.status === "streaming"
      ? "streaming"
      : displayError || collection.status === "error"
        ? "error"
        : "done";

  return (
    <div className="min-h-[calc(100vh-65px)] bg-muted/20">
      <div className="container mx-auto space-y-6 px-4 py-8">
        {/* 페이지 헤더 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">인스타 댓글 수집</h1>
          <p className="text-sm text-muted-foreground">
            인스타그램 게시물·릴스의 <b>댓글과 답글</b>을 수집합니다. 이벤트 참여자
            확인이나 당첨자 추첨에 쓸 수 있도록 CSV로 내려받으세요.
          </p>
        </div>

        {/* 1. 수집 대상 입력 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. 수집 대상 입력</CardTitle>
            <CardDescription>
              댓글을 수집할 인스타그램 게시물 또는 릴스 주소를 붙여넣으세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UrlCollectForm
              id="postUrl"
              label="게시물 URL"
              placeholder="instagram.com/p/게시물코드/"
              value={url}
              onChange={(next) => {
                setUrl(next);
                setInputError(undefined);
              }}
              onSubmit={handleStart}
              onCancel={collection.cancel}
              error={inputError}
              busy={busy}
              examples={[
                "https://www.instagram.com/p/CxAbCdEfGhI/",
                "https://www.instagram.com/reel/CxAbCdEfGhI/",
              ]}
              unitPrice={unitPrice}
              balance={balance}
            />
          </CardContent>
        </Card>

        {/* 2. 수집 진행 */}
        {collection.status !== "idle" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. 수집 진행</CardTitle>
              <CardDescription>
                댓글 목록을 스크롤하며 나눠서 수집합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {truncatedNotice && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>{truncatedNotice}</span>
                </div>
              )}
              {sessionExpired ? (
                <SessionExpiredNotice
                  message={displayError}
                  onRetry={handleStart}
                />
              ) : (
                <CollectionProgress
                  status={progressStatus}
                  collected={comments.length}
                  // 인스타는 전체 댓글 수를 미리 알 수 없어 불확정 막대를 쓴다
                  percent={undefined}
                  stageLabel="댓글을 불러오는 중입니다. 답글까지 펼쳐 수집합니다..."
                  error={displayError}
                  partial={!!displayError && comments.length > 0}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* 3. 수집 결과 */}
        {comments.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Instagram className="h-5 w-5" />
                  3. 수집 결과
                </CardTitle>
                <CardDescription>
                  총 {comments.length.toLocaleString()}건
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
                CSV 다운로드
              </Button>
            </CardHeader>
            <CardContent>
              <InstagramCommentTable comments={comments} />
            </CardContent>
          </Card>
        )}

        {/* 안내 사항 */}
        <div className="rounded-md border bg-background p-4">
          <h2 className="mb-2 text-sm font-semibold">안내 사항</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              수집에는 서버에 설정된 인스타그램 로그인 세션이 필요합니다. 세션이
              만료되면 갱신 안내가 표시됩니다.
            </li>
            <li>
              댓글이 많으면 수 분이 걸릴 수 있습니다. 수집 중에는 페이지를 벗어나지
              마세요.
            </li>
            <li>
              인스타그램은 자동 수집을 이용약관으로 제한합니다. 본인 계정과 본인
              게시물 범위에서만 사용하세요.
            </li>
            <li>
              수집에 실패하거나 중단하면 포인트가 차감되지 않으며, 이미 모인 결과는
              그대로 내려받을 수 있습니다.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
