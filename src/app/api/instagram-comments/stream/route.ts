// POST /api/instagram-comments/stream
//
// 인스타그램 게시물의 댓글을 크롤링해 개행 구분 JSON(NDJSON)으로 흘려보낸다.
//
// [주의] 이 라우트에는 인증이 없다. 화면의 포인트 차감은 클라이언트 측 표시일 뿐
// 실제 사용 제한이 아니며, 여기서 쓰는 INSTAGRAM_COOKIES 는 계정 세션이다.
// 외부에 공개 배포한다면 반드시 별도 접근 제어를 두어야 한다.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  InstagramSessionExpiredError,
  scrapeInstagramCommentsStreaming,
} from "@/lib/instagram-scraper";
import { StreamClosedSignal } from "@/lib/stream-signal";
import type { InstagramStreamChunk } from "@/types/instagram-comment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const requestSchema = z.object({
  postUrl: z
    .string({
      required_error: "인스타그램 게시물 URL을 입력해주세요.",
      invalid_type_error: "인스타그램 게시물 URL을 입력해주세요.",
    })
    .trim()
    .min(1, "인스타그램 게시물 URL을 입력해주세요."),
});

/** 게시물 URL에서 shortcode 를 뽑는다 (/p/, /reel/, 사용자명이 앞에 붙은 형태 모두 지원) */
function parseShortcode(url: string): string | null {
  try {
    const normalized = url.trim().startsWith("http")
      ? url.trim()
      : `https://${url.trim()}`;
    const parsed = new URL(normalized);

    if (parsed.hostname.replace(/^www\./, "") !== "instagram.com") return null;

    const segments = parsed.pathname.split("/").filter(Boolean);
    const index = segments.findIndex((s) => s === "p" || s === "reel");
    if (index !== -1 && segments[index + 1]) return segments[index + 1];

    return null;
  } catch {
    return null;
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: { code: "INVALID_REQUEST", message } }, { status });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      parsed.error.errors[0]?.message ?? "요청 형식이 올바르지 않습니다.",
      400
    );
  }

  const shortcode = parseShortcode(parsed.data.postUrl);
  if (!shortcode) {
    return errorResponse(
      "인스타그램 게시물 주소가 아닙니다. instagram.com/p/게시물코드/ 형식으로 입력해주세요.",
      400
    );
  }

  const encoder = new TextEncoder();
  // start() 와 cancel() 이 함께 보는 플래그
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: InstagramStreamChunk) => {
        if (closed) throw new StreamClosedSignal();
        controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
      };

      const sendFinal = (chunk: InstagramStreamChunk) => {
        try {
          send(chunk);
        } catch {
          // 이미 닫힌 컨트롤러 — unhandled rejection 이 되지 않게 흡수한다
        }
      };

      try {
        send({ type: "start", message: "댓글 수집을 시작합니다..." });

        const result = await scrapeInstagramCommentsStreaming(
          shortcode,
          (batch) => {
            send({
              type: "batch",
              batch: batch.batchNumber,
              comments: batch.comments,
              totalComments: batch.totalCollected,
              isLastBatch: batch.isLastBatch,
            });
          }
        );

        sendFinal({
          type: "complete",
          total: result.total,
          // 중도 종료를 "완료"로만 알리면 사용자가 전부 받은 줄 안다
          message: result.truncated
            ? `${result.total}개까지 수집했습니다. ${result.truncatedReason ?? "전체를 다 훑지 못했습니다."}`
            : `총 ${result.total}개의 댓글을 수집했습니다.`,
          truncated: result.truncated,
        });
      } catch (error) {
        if (error instanceof StreamClosedSignal) {
          // 클라이언트가 끊었다 — 보낼 곳이 없다
        } else if (error instanceof InstagramSessionExpiredError) {
          // 미설정 / 만료를 구분한 문구를 그대로 전달한다 (대처 방법이 다르다)
          sendFinal({
            type: "error",
            errorCode: "SESSION_EXPIRED",
            message: error.message,
          });
        } else {
          console.error("[instagram-comments] 수집 실패:", error);
          sendFinal({
            type: "error",
            errorCode: "UNKNOWN",
            message:
              error instanceof Error
                ? error.message
                : "댓글 수집 중 알 수 없는 오류가 발생했습니다.",
          });
        }
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // 이미 닫힌 경우
        }
      }
    },

    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
