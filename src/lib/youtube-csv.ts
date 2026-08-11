// 유튜브 모니터링 결과 → CSV.

import { buildTableCsv, csvDateStamp } from "@/lib/table-csv";
import type { YouTubeVideo } from "@/types/youtube-monitoring";

const HEADERS = [
  "구분",
  "제목",
  "채널명",
  "채널 URL",
  "영상 URL",
  "등록일",
  "재생시간",
  "조회수",
  "좋아요수",
  "댓글수",
  "태그",
  "설명",
];

export interface YouTubeCsvOptions {
  keyword: string;
  startDate: string;
  endDate: string;
  /** 조회 상한에 걸려 결과가 잘렸는지 */
  capped?: boolean;
}

/** 화면에 보이는 목록(필터·정렬 적용 후)을 그대로 CSV 로 만든다 */
export function buildYouTubeCsv(
  videos: YouTubeVideo[],
  { keyword, startDate, endDate, capped }: YouTubeCsvOptions
): string {
  return buildTableCsv({
    title: "유튜브 모니터링",
    createdDate: csvDateStamp(),
    meta: [
      `검색 키워드: ${keyword}`,
      `기간: ${startDate} ~ ${endDate}`,
      `영상 수: ${videos.length}건`,
      // 잘린 결과가 전체인 것처럼 보관되지 않도록 파일 안에도 남긴다
      ...(capped
        ? ["※ 조회 상한에 걸려 조회수 상위 일부만 담긴 결과입니다."]
        : []),
    ],
    headers: HEADERS,
    rows: videos.map((v) => [
      v.isShorts ? "Shorts" : "일반영상",
      v.title,
      v.channelTitle,
      v.channelUrl,
      v.videoUrl,
      v.publishedAtFormatted,
      v.durationFormatted,
      v.viewCount,
      v.likeCount,
      v.commentCount,
      v.tags.join(", "),
      v.description,
    ]),
  });
}
