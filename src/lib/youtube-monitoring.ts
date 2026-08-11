// 유튜브 모니터링 순수 헬퍼 — 서버·클라이언트 양쪽에서 쓸 수 있다.

import type {
  VideoSortBy,
  VideoTypeFilter,
  YouTubeSearchInput,
  YouTubeVideo,
} from "@/types/youtube-monitoring";

/** 한 번에 조회할 수 있는 검색 페이지 수 상한 (페이지당 영상 50개) */
export const MAX_SEARCH_PAGES = 6;

/**
 * 기본 검색 페이지 수.
 *
 * YouTube Data API 의 search.list 는 호출 1회당 100 유닛을 쓴다.
 * 기본 할당량이 하루 10,000 유닛이므로 6페이지(600 유닛)로 잡으면
 * 하루 16번밖에 검색할 수 없다. 기본값은 2페이지(영상 100개, 약 200 유닛)로 두고
 * 더 필요하면 YOUTUBE_SEARCH_PAGES 로 올리게 한다.
 */
export const DEFAULT_SEARCH_PAGES = 2;

/** 결과 목록 필터 라벨 */
export const VIDEO_TYPE_LABEL: Record<VideoTypeFilter, string> = {
  all: "전체",
  video: "일반영상",
  shorts: "Shorts",
};

/** 결과 목록 정렬 라벨 */
export const VIDEO_SORT_LABEL: Record<VideoSortBy, string> = {
  viewCount: "조회수순",
  date: "최신순",
  likeCount: "좋아요순",
  commentCount: "댓글수순",
};

/**
 * ISO 8601 기간 → 초.
 *
 * 24시간이 넘는 영상(라이브 아카이브 등)은 일(day) 성분이 붙은 "P1DT2H30M" 형태로 온다.
 * 이걸 놓치면 0초로 계산되어 25시간짜리 영상이 Shorts(60초 이하)로 분류되고,
 * "일반영상" 필터에서 통째로 사라진다.
 */
export function parseDurationToSeconds(duration: string): number {
  const match = duration.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
  );
  if (!match) return 0;

  const [, days, hours, minutes, seconds] = match;
  return (
    parseInt(days || "0", 10) * 86400 +
    parseInt(hours || "0", 10) * 3600 +
    parseInt(minutes || "0", 10) * 60 +
    parseInt(seconds || "0", 10)
  );
}

/** 초 → H:MM:SS 또는 M:SS */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Shorts 판별.
 * 유튜브가 Shorts 여부를 API 로 알려주지 않아 길이와 해시태그로 추정한다.
 */
export function isShortsVideo(
  durationSeconds: number,
  title: string,
  description: string,
  tags: string[]
): boolean {
  if (durationSeconds <= 60) return true;
  const haystack = [title, description, ...tags].join(" ").toLowerCase();
  return haystack.includes("#shorts") || tags.some((t) => t.toLowerCase() === "shorts");
}

/**
 * 서버·클라이언트가 같은 값을 내도록 타임존을 한국으로 고정해 포맷한다.
 * (date-fns 의 format() 은 실행 환경 로컬 타임존을 따라가 SSR 불일치를 만든다)
 */
export function formatSeoulDateTime(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;

  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`;
}

/** 오늘(한국 기준) 기준 offsetDays 만큼 이동한 날짜를 YYYY-MM-DD 로 반환 */
export function seoulDateString(offsetDays = 0): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** 검색 조건 검증 — 호스트 규약(필드명 → 오류 문구 맵) */
export function validateSearchInput(
  input: YouTubeSearchInput
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.keyword.trim()) errors.keyword = "검색 키워드를 입력해주세요.";
  if (!input.startDate) errors.startDate = "시작일을 선택해주세요.";
  if (!input.endDate) errors.endDate = "종료일을 선택해주세요.";

  if (
    input.startDate &&
    input.endDate &&
    new Date(input.startDate) > new Date(input.endDate)
  ) {
    errors.endDate = "종료일은 시작일보다 빠를 수 없습니다.";
  }

  return errors;
}

/** 필터·정렬을 적용한 목록을 만든다 (원본은 건드리지 않는다) */
export function filterAndSortVideos(
  videos: YouTubeVideo[],
  filter: VideoTypeFilter,
  sortBy: VideoSortBy
): YouTubeVideo[] {
  const filtered = videos.filter((v) => {
    if (filter === "shorts") return v.isShorts;
    if (filter === "video") return !v.isShorts;
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }
    return b[sortBy] - a[sortBy];
  });
}
