// POST /api/youtube-monitoring
//
// YouTube Data API v3 로 키워드·기간 검색을 수행한다.
//   1) search.list 로 영상 id 를 모으고 (페이지당 50개)
//   2) videos.list 로 통계·길이·태그를 배치 조회한다 (50개씩)
//
// [할당량] search.list 는 호출 1회당 100 유닛을 쓴다. 기본 할당량이 하루 10,000 유닛이라
// 페이지 수를 늘릴수록 하루 검색 가능 횟수가 급격히 줄어든다. 그래서 기본값을 2페이지로 두고
// YOUTUBE_SEARCH_PAGES 로만 올릴 수 있게 했다. (videos.list 는 1 유닛으로 사실상 무시 가능)

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  DEFAULT_SEARCH_PAGES,
  MAX_SEARCH_PAGES,
  formatDuration,
  formatSeoulDateTime,
  isShortsVideo,
  parseDurationToSeconds,
} from "@/lib/youtube-monitoring";
import type {
  YouTubeErrorCode,
  YouTubeMonitoringResponse,
  YouTubeVideo,
} from "@/types/youtube-monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const requestSchema = z
  .object({
    keyword: z.string().trim().min(1, "검색 키워드를 입력해주세요."),
    startDate: z.string().regex(DATE_PATTERN, "시작일 형식이 올바르지 않습니다."),
    endDate: z.string().regex(DATE_PATTERN, "종료일 형식이 올바르지 않습니다."),
  })
  .refine((v) => new Date(v.startDate) <= new Date(v.endDate), {
    message: "종료일은 시작일보다 빠를 수 없습니다.",
    path: ["endDate"],
  });

function fail(code: YouTubeErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** 설정된 검색 페이지 수 (1~MAX_SEARCH_PAGES 로 클램프) */
function resolveSearchPages(): number {
  const raw = Number(process.env.YOUTUBE_SEARCH_PAGES);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_SEARCH_PAGES;
  return Math.min(Math.floor(raw), MAX_SEARCH_PAGES);
}

/** YouTube API 오류 응답을 호스트 에러 코드로 옮긴다 */
function mapApiError(status: number, payload: unknown): {
  code: YouTubeErrorCode;
  message: string;
  status: number;
} {
  const reason =
    (payload as { error?: { errors?: { reason?: string }[]; message?: string } })
      ?.error?.errors?.[0]?.reason ?? "";
  const upstreamMessage =
    (payload as { error?: { message?: string } })?.error?.message ?? "";

  if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
    return {
      code: "QUOTA_EXCEEDED",
      message:
        "오늘의 YouTube API 할당량을 모두 사용했습니다. 내일 다시 시도하거나 Google Cloud 콘솔에서 할당량 증설을 요청해주세요.",
      status: 429,
    };
  }

  if (status === 400 && reason === "keyInvalid") {
    return {
      code: "INVALID_API_KEY",
      message: "YOUTUBE_API_KEY 가 유효하지 않습니다. 키를 다시 확인해주세요.",
      status: 502,
    };
  }

  if (status === 403) {
    return {
      code: "INVALID_API_KEY",
      message:
        "YouTube API 접근이 거부되었습니다. API 키 제한 설정과 'YouTube Data API v3' 사용 설정을 확인해주세요.",
      status: 502,
    };
  }

  return {
    code: "UPSTREAM_ERROR",
    message: upstreamMessage
      ? `YouTube API 오류: ${upstreamMessage}`
      : "YouTube API 호출에 실패했습니다. 잠시 후 다시 시도해주세요.",
    status: 502,
  };
}

/** YouTube API 호출 공통 — 실패 시 매핑된 오류를 던진다 */
async function callYouTubeApi(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const mapped = mapApiError(response.status, payload);
    const error = new Error(mapped.message);
    Object.assign(error, { __youtube: mapped });
    throw error;
  }

  return payload as Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  // 환경변수는 반드시 핸들러 안에서 읽는다 (모듈 최상단 throw 는 빌드를 깨뜨린다)
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return fail(
      "MISSING_API_KEY",
      "YouTube API 키가 설정되지 않았습니다. .env.local 에 YOUTUBE_API_KEY 를 추가한 뒤 서버를 재시작해주세요.",
      500
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      "INVALID_REQUEST",
      parsed.error.errors[0]?.message ?? "요청 형식이 올바르지 않습니다.",
      400
    );
  }

  const { keyword, startDate, endDate } = parsed.data;

  try {
    // ── 1) 영상 id 수집
    const videoIds: string[] = [];
    const maxPages = resolveSearchPages();
    let pageToken: string | undefined;
    /** 조회 상한에 걸려 뒤쪽 결과를 못 가져왔으면 true */
    let capped = false;

    for (let page = 0; page < maxPages; page++) {
      const params = new URLSearchParams({
        part: "id",
        q: keyword,
        type: "video",
        order: "viewCount",
        maxResults: "50",
        // 화면의 날짜 선택은 한국 기준이다. Z(UTC)로 보내면 구간이 9시간 밀려
        // 그날 오전 0~9시 영상이 통째로 빠지고 다음 날 새벽 영상이 섞여 들어온다.
        publishedAfter: `${startDate}T00:00:00+09:00`,
        publishedBefore: `${endDate}T23:59:59+09:00`,
        key: apiKey,
      });
      if (pageToken) params.set("pageToken", pageToken);

      const data = await callYouTubeApi(
        `https://www.googleapis.com/youtube/v3/search?${params}`
      );

      const items = (data.items ?? []) as { id?: { videoId?: string } }[];
      for (const item of items) {
        if (item.id?.videoId) videoIds.push(item.id.videoId);
      }

      pageToken = data.nextPageToken as string | undefined;
      // 다음 페이지가 남았는데 상한에 걸려 멈추면 결과가 잘린 것이다
      if (!pageToken) break;
      if (page === maxPages - 1) capped = true;
    }

    if (videoIds.length === 0) {
      const empty: YouTubeMonitoringResponse = {
        videos: [],
        total: 0,
        keyword,
        startDate,
        endDate,
        capped: false,
      };
      return NextResponse.json(empty);
    }

    // ── 2) 영상 상세 배치 조회
    const videos: YouTubeVideo[] = [];

    for (let i = 0; i < videoIds.length; i += 50) {
      const params = new URLSearchParams({
        part: "snippet,statistics,contentDetails",
        id: videoIds.slice(i, i + 50).join(","),
        key: apiKey,
      });

      const data = await callYouTubeApi(
        `https://www.googleapis.com/youtube/v3/videos?${params}`
      );

      const items = (data.items ?? []) as {
        id: string;
        snippet?: Record<string, unknown>;
        statistics?: Record<string, string>;
        contentDetails?: Record<string, string>;
      }[];

      for (const item of items) {
        const snippet = item.snippet ?? {};
        const statistics = item.statistics ?? {};
        const duration = item.contentDetails?.duration ?? "PT0S";
        const durationSeconds = parseDurationToSeconds(duration);

        const title = (snippet.title as string) ?? "";
        const description = (snippet.description as string) ?? "";
        const tags = (snippet.tags as string[]) ?? [];
        const channelId = (snippet.channelId as string) ?? "";
        const publishedAt = (snippet.publishedAt as string) ?? "";
        const thumbnails = snippet.thumbnails as
          | Record<string, { url?: string }>
          | undefined;

        videos.push({
          videoId: item.id,
          title,
          channelTitle: (snippet.channelTitle as string) ?? "",
          channelId,
          channelUrl: `https://www.youtube.com/channel/${channelId}`,
          videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
          publishedAt,
          publishedAtFormatted: formatSeoulDateTime(publishedAt),
          duration,
          durationSeconds,
          durationFormatted: formatDuration(durationSeconds),
          viewCount: parseInt(statistics.viewCount ?? "0", 10) || 0,
          likeCount: parseInt(statistics.likeCount ?? "0", 10) || 0,
          commentCount: parseInt(statistics.commentCount ?? "0", 10) || 0,
          isShorts: isShortsVideo(durationSeconds, title, description, tags),
          tags,
          description,
          thumbnailUrl:
            thumbnails?.medium?.url ?? thumbnails?.default?.url ?? "",
        });
      }
    }

    const result: YouTubeMonitoringResponse = {
      videos,
      total: videos.length,
      keyword,
      startDate,
      endDate,
      capped,
    };
    return NextResponse.json(result);
  } catch (error) {
    const mapped = (error as { __youtube?: ReturnType<typeof mapApiError> })
      .__youtube;

    if (mapped) return fail(mapped.code, mapped.message, mapped.status);

    console.error("[youtube-monitoring] 실패:", error);
    return fail(
      "UNKNOWN",
      "영상을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
      500
    );
  }
}
