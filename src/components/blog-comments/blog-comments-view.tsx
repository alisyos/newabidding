"use client";

import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, Download, MessageSquare } from "lucide-react";
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
import { BlogCommentTable } from "@/components/blog-comments/blog-comment-table";
import { useNdjsonCollection } from "@/hooks/use-ndjson-collection";
import { buildBlogCommentCsv } from "@/lib/comment-csv";
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
import type { BlogComment, BlogStreamChunk } from "@/types/blog-comment";
import type { UserId } from "@/types/user";

/**
 * 과금 대상 에이전트.
 *
 * [주의] 이 포인트 차감은 화면상의 표시일 뿐 실제 사용 제한이 아니다.
 * /api/blog-comments/stream 에는 인증이 없어 API 를 직접 호출하면 그대로 우회된다.
 */
const AGENT_ID = "blog-comments" as const;

interface Progress {
  percent: number;
  page: number;
  totalPages: number;
}

export function BlogCommentsView() {
  const [url, setUrl] = useState("");
  const [inputError, setInputError] = useState<string>();
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [collectedUrl, setCollectedUrl] = useState("");
  /** 페이지 상한으로 잘린 경우의 안내 문구 */
  const [truncatedNotice, setTruncatedNotice] = useState<string | null>(null);

  // 정산은 비동기 클로저에서 일어나므로 state 를 읽으면 오래된 값이 잡힌다.
  // 정산에 쓰는 값은 ref 로 함께 들고 간다.
  const commentsRef = useRef<BlogComment[]>([]);
  const streamErrorRef = useRef<string | null>(null);
  const truncatedRef = useRef(false);
  const chargeUserIdRef = useRef<UserId | null>(null);

  const deduct = usePointsStore((s) => s.deduct);
  const balance = useCurrentBalance();
  const currentUserId = useCurrentUserId();
  const unitPrice = useAgentPrice(AGENT_ID);

  const collection = useNdjsonCollection<BlogStreamChunk, { blogUrl: string }>({
    url: "/api/blog-comments/stream",

    onStart: () => {
      commentsRef.current = [];
      streamErrorRef.current = null;
      truncatedRef.current = false;
      setComments([]);
      setProgress(null);
      setStreamError(null);
      setTruncatedNotice(null);
    },

    onChunk: (chunk) => {
      if (chunk.type === "page") {
        commentsRef.current = [...commentsRef.current, ...chunk.comments];
        setComments(commentsRef.current);
        setProgress({
          percent: chunk.progress,
          page: chunk.page,
          totalPages: chunk.totalPages,
        });
      } else if (chunk.type === "complete") {
        setProgress((prev) => (prev ? { ...prev, percent: 100 } : null));
        if (chunk.truncated) {
          truncatedRef.current = true;
          setTruncatedNotice(chunk.message);
        }
      } else if (chunk.type === "error") {
        streamErrorRef.current = chunk.message;
        setStreamError(chunk.message);
      }
    },

    // 스트림이 어떤 이유로 끝나든 정확히 한 번 호출된다 → 유일한 정산 지점
    onSettle: ({ aborted, transportError }) => {
      const failed = aborted || !!transportError || !!streamErrorRef.current;
      const count = commentsRef.current.length;

      if (transportError) setStreamError(transportError);

      // 실패(오류·중단)한 실행에는 과금하지 않는다.
      // 이미 모인 부분 결과는 그대로 두어 무료로 내려받을 수 있게 한다.
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
        // 셀렉터가 깨져도 "정상 완료 0건"으로 보이므로 성공으로 처리하지 않는다
        toast.warn(
          "댓글을 하나도 찾지 못했습니다. 게시글에 댓글이 없거나, 네이버 페이지 구조가 변경되었을 수 있습니다."
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
        // 상한으로 잘린 경우를 "완료"로만 알리면 전부 받은 줄 안다
        if (truncatedRef.current) {
          toast.warn(
            `댓글 ${count.toLocaleString()}건 수집 (페이지 상한 도달로 일부만 수집) · ${charged}`
          );
        } else {
          toast.success(
            `댓글 ${count.toLocaleString()}건 수집 완료 · ${charged}`
          );
        }
      } else {
        // 수집 결과는 이미 화면에 있으므로 지우지 않고 경고만 띄운다
        toast.error(
          "포인트가 부족해 차감하지 못했습니다. 관리자 페이지에서 충전해주세요."
        );
      }
    },
  });

  const busy = collection.status === "streaming";

  const handleStart = () => {
    if (!url.trim()) {
      setInputError("블로그 URL을 입력해주세요.");
      return;
    }
    setInputError(undefined);

    if (balance < unitPrice) {
      toast.error(
        `포인트가 부족합니다. (필요 ${unitPrice.toLocaleString()}P · 보유 ${balance.toLocaleString()}P) 관리자 페이지에서 충전해주세요.`
      );
      return;
    }

    // 비동기 중에 헤더에서 사용자를 바꿔도 시작 시점 사용자에게 과금한다
    chargeUserIdRef.current = currentUserId;
    setCollectedUrl(url.trim());
    void collection.start({ blogUrl: url.trim() });
  };

  const handleDownload = () => {
    if (comments.length === 0) {
      toast.error("다운로드할 댓글이 없습니다.");
      return;
    }
    downloadCsv(
      `blog_comments_${safeFileName(urlFileLabel(collectedUrl))}_${fileDateStamp()}.csv`,
      buildBlogCommentCsv(comments, {
        blogUrl: collectedUrl,
        truncated: !!truncatedNotice,
      })
    );
  };

  const displayError = streamError ?? collection.transportError;
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
          <h1 className="text-2xl font-bold">네이버 블로그 댓글 수집</h1>
          <p className="text-sm text-muted-foreground">
            네이버 블로그 게시글의 <b>댓글과 답글</b>을 전 페이지에 걸쳐 수집합니다.
            이벤트 당첨자 추첨이나 반응 정리에 쓸 수 있도록 CSV로 내려받으세요.
          </p>
        </div>

        {/* 1. 수집 대상 입력 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. 수집 대상 입력</CardTitle>
            <CardDescription>
              댓글을 수집할 네이버 블로그 게시글 주소를 붙여넣으세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UrlCollectForm
              id="blogUrl"
              label="블로그 URL"
              placeholder="blog.naver.com/아이디/게시글번호"
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
                "blog.naver.com/example_id/223456789012",
                "https://m.blog.naver.com/example_id/223456789012",
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
                페이지를 하나씩 수집하며 실시간으로 결과가 쌓입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {truncatedNotice && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>{truncatedNotice}</span>
                </div>
              )}
              <CollectionProgress
                status={progressStatus}
                collected={comments.length}
                percent={progress?.percent}
                stageLabel={
                  progress && progress.totalPages > 0
                    ? `페이지 ${progress.page} / ${progress.totalPages} 수집 중 (마지막 페이지부터 역순으로 진행합니다)`
                    : "댓글 영역을 확인하고 있습니다..."
                }
                error={displayError}
                partial={!!displayError && comments.length > 0}
              />
            </CardContent>
          </Card>
        )}

        {/* 3. 수집 결과 */}
        {comments.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5" />
                  3. 수집 결과
                </CardTitle>
                <CardDescription>
                  총 {comments.length.toLocaleString()}건 · 수집 순서(마지막 페이지 →
                  첫 페이지)로 표시됩니다.
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
              <BlogCommentTable comments={comments} />
            </CardContent>
          </Card>
        )}

        {/* 안내 사항 */}
        <div className="rounded-md border bg-background p-4">
          <h2 className="mb-2 text-sm font-semibold">안내 사항</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              댓글이 많으면 수 분이 걸릴 수 있습니다. 수집 중에는 페이지를 벗어나지
              마세요.
            </li>
            <li>
              네이버 서버 부담을 줄이기 위해 페이지마다 대기 시간을 두고 진행합니다.
            </li>
            <li>
              한 번에 최대 30페이지까지 수집합니다. 그보다 많으면 일부만 수집됩니다.
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
