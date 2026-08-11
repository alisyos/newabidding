// 유튜브 모니터링(/youtube-monitoring) 타입 정의

/** 검색 조건 */
export interface YouTubeSearchInput {
  keyword: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
}

/** 검색된 영상 1건 */
export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  channelUrl: string;
  videoUrl: string;
  /** ISO 8601 */
  publishedAt: string;
  /** yyyy.MM.dd HH:mm (Asia/Seoul) */
  publishedAtFormatted: string;
  /** ISO 8601 기간 (PT1H30M15S) */
  duration: string;
  durationSeconds: number;
  /** H:MM:SS 또는 M:SS */
  durationFormatted: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  /** 60초 이하이거나 #shorts 표기가 있으면 true */
  isShorts: boolean;
  tags: string[];
  description: string;
  thumbnailUrl: string;
}

/** POST /api/youtube-monitoring 요청 본문 */
export type YouTubeMonitoringRequest = YouTubeSearchInput;

/** POST /api/youtube-monitoring 성공 응답 */
export interface YouTubeMonitoringResponse {
  videos: YouTubeVideo[];
  total: number;
  keyword: string;
  startDate: string;
  endDate: string;
  /**
   * 조회 상한(YOUTUBE_SEARCH_PAGES)에 걸려 뒤쪽 결과를 못 가져왔으면 true.
   * 이때는 이 목록을 해당 기간의 전체 결과로 안내하면 안 된다.
   */
  capped: boolean;
}

/** 실패 사유 */
export type YouTubeErrorCode =
  | "MISSING_API_KEY"
  | "INVALID_REQUEST"
  | "QUOTA_EXCEEDED"
  | "INVALID_API_KEY"
  | "UPSTREAM_ERROR"
  | "UNKNOWN";

/** 실패 응답 (호스트 공통 규약) */
export interface YouTubeErrorResponse {
  error: { code: YouTubeErrorCode; message: string };
}

/** 결과 목록 필터 */
export type VideoTypeFilter = "all" | "video" | "shorts";

/** 결과 목록 정렬 기준 */
export type VideoSortBy = "date" | "viewCount" | "likeCount" | "commentCount";
