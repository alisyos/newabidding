// POST /api/blog-comments/stream
//
// 네이버 블로그 댓글을 크롤링해 개행 구분 JSON(NDJSON)으로 흘려보낸다.
// 페이지를 하나 수집할 때마다 청크를 내보내므로 연결이 유지되고,
// 응답을 한 번에 만드는 방식보다 훨씬 오래(=많이) 수집할 수 있다.
//
// [주의] 이 라우트에는 인증이 없다. 호스트 프로젝트가 목업이라 미들웨어가 없기 때문이며,
// 화면의 포인트 차감은 클라이언트 측 표시일 뿐 실제 사용 제한이 아니다.
// 외부에 공개 배포한다면 별도 접근 제어가 필요하다.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { scrapeNaverBlogCommentsStreaming } from "@/lib/naver-blog-scraper";
import { StreamClosedSignal } from "@/lib/stream-signal";
import type { BlogStreamChunk } from "@/types/blog-comment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const requestSchema = z.object({
  blogUrl: z
    .string({
      required_error: "블로그 URL을 입력해주세요.",
      invalid_type_error: "블로그 URL을 입력해주세요.",
    })
    .trim()
    .min(1, "블로그 URL을 입력해주세요."),
});

/** 네이버 블로그 URL에서 blogId 와 logNo 를 뽑는다 */
function parseBlogUrl(url: string): { blogId: string; logNo: string } | null {
  try {
    const normalized = url.trim().startsWith("http")
      ? url.trim()
      : `https://${url.trim()}`;
    const parsed = new URL(normalized);

    // PC: blog.naver.com/{blogId}/{logNo}
    if (parsed.hostname === "blog.naver.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) return { blogId: parts[0], logNo: parts[1] };
      // blog.naver.com/PostView.naver?blogId=&logNo= 형태도 받아준다
      const blogId = parsed.searchParams.get("blogId");
      const logNo = parsed.searchParams.get("logNo");
      if (blogId && logNo) return { blogId, logNo };
      return null;
    }

    // 모바일: m.blog.naver.com — 경로형과 쿼리형 둘 다 있다
    if (parsed.hostname === "m.blog.naver.com") {
      const blogId = parsed.searchParams.get("blogId");
      const logNo = parsed.searchParams.get("logNo");
      if (blogId && logNo) return { blogId, logNo };

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) return { blogId: parts[0], logNo: parts[1] };
    }

    return null;
  } catch {
    return null;
  }
}

/** 오류 응답 (스트림 시작 전에만 사용) */
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

  const target = parseBlogUrl(parsed.data.blogUrl);
  if (!target) {
    return errorResponse(
      "네이버 블로그 게시글 주소가 아닙니다. blog.naver.com/아이디/글번호 형식으로 입력해주세요.",
      400
    );
  }

  const encoder = new TextEncoder();
  // start() 와 cancel() 이 함께 보는 플래그 — 스트림 객체 바깥에 둬야 한다
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      /**
       * 청크 전송. 클라이언트가 이미 끊었으면 StreamClosedSignal 을 던져
       * 스크래퍼 순회를 중단시킨다 (남은 크롤링을 헛돌리지 않기 위함).
       */
      const send = (chunk: BlogStreamChunk) => {
        if (closed) throw new StreamClosedSignal();
        controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
      };

      /** 종료 직전 마지막 전송 — 이미 닫혔으면 조용히 넘어간다 */
      const sendFinal = (chunk: BlogStreamChunk) => {
        try {
          send(chunk);
        } catch {
          // 닫힌 컨트롤러에 enqueue 하면 또 던진다. 여기서 흡수하지 않으면
          // unhandled rejection 이 된다.
        }
      };

      try {
        send({ type: "start", message: "댓글 수집을 시작합니다..." });

        let totalComments = 0;

        const result = await scrapeNaverBlogCommentsStreaming(
          target.blogId,
          target.logNo,
          (page) => {
            totalComments += page.comments.length;

            // 네이버는 마지막 페이지부터 역순으로 순회하므로
            // "남은 페이지 수"가 아니라 "지금까지 지나온 비율"로 진행률을 낸다.
            const progress =
              page.totalPages > 0
                ? Math.min(
                    100,
                    Math.round(
                      ((page.totalPages - page.pageNumber + 1) / page.totalPages) * 100
                    )
                  )
                : 0;

            send({
              type: "page",
              page: page.pageNumber,
              comments: page.comments,
              totalComments,
              totalPages: page.totalPages,
              progress,
              isLastPage: page.isLastPage,
            });
          }
        );

        sendFinal({
          type: "complete",
          total: result.total,
          // 상한으로 끊긴 경우를 "완료"로만 알리면 사용자가 전부 받은 줄 안다
          message: result.truncated
            ? `페이지 상한(${result.pagesScanned}페이지)에 도달해 ${result.total}개까지만 수집했습니다. 전체 ${result.totalPages}페이지 중 일부입니다.`
            : `총 ${result.total}개의 댓글을 수집했습니다.`,
          truncated: result.truncated,
          totalPages: result.totalPages,
          pagesScanned: result.pagesScanned,
        });
      } catch (error) {
        // 클라이언트가 끊어서 중단된 경우엔 보낼 곳이 없다
        if (!(error instanceof StreamClosedSignal)) {
          console.error("[blog-comments] 수집 실패:", error);
          sendFinal({
            type: "error",
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
      // 클라이언트가 연결을 끊었다. 다음 send() 가 StreamClosedSignal 을 던져
      // 크롤링 순회를 중단시킨다. (이게 없으면 사용자가 떠난 뒤에도 계속 돈다)
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Nginx 등 리버스 프록시의 버퍼링 방지
    },
  });
}
