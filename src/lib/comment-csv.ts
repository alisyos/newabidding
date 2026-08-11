// 댓글 수집 결과 → CSV.
//
// 도너 코드는 셀을 직접 큰따옴표로 감싸고 본문의 줄바꿈을 공백으로 치환했는데,
// 여기서는 호스트 공용 escapeCsvCell 에 맡긴다. 줄바꿈은 따옴표로 감싸 보존하며
// 엑셀도 그대로 한 셀로 읽는다. (댓글 원문 구조가 사라지지 않는다)

import { buildTableCsv, csvDateStamp } from "@/lib/table-csv";
import { formatSeoulDateTime } from "@/lib/youtube-monitoring";
import type { BlogComment } from "@/types/blog-comment";
import type { InstagramComment } from "@/types/instagram-comment";

const BLOG_HEADERS = [
  "작성일시",
  "구분",
  "닉네임",
  "작성자 URL",
  "공감수",
  "답글수",
  "링크수",
  "첨부 이미지 URL",
  "댓글 내용",
];

/** 네이버 블로그 댓글 CSV */
export function buildBlogCommentCsv(
  comments: BlogComment[],
  options: { blogUrl: string; truncated?: boolean }
): string {
  return buildTableCsv({
    title: "네이버 블로그 댓글 수집",
    createdDate: csvDateStamp(),
    meta: [
      `수집 대상: ${options.blogUrl}`,
      `수집 건수: ${comments.length}건`,
      // 네이버는 댓글 페이지를 역순으로 보여주므로 수집 순서도 그 순서를 따른다
      "정렬: 수집 순서 (마지막 페이지 → 첫 페이지)",
      // 잘린 결과가 전체인 것처럼 보관되지 않도록 파일 안에도 남긴다
      ...(options.truncated
        ? ["※ 페이지 상한에 도달해 일부만 수집된 결과입니다."]
        : []),
    ],
    headers: BLOG_HEADERS,
    rows: comments.map((c) => [
      c.createdAt,
      c.commentType,
      c.nickname,
      c.authorUrl,
      c.likes,
      c.replyCount,
      c.links,
      c.imageUrl,
      c.content,
    ]),
  });
}

const INSTAGRAM_HEADERS = [
  "작성일시",
  "구분",
  "사용자명",
  "프로필 URL",
  "좋아요수",
  "답글수",
  "댓글 내용",
];

/** 인스타그램 댓글 CSV */
export function buildInstagramCommentCsv(
  comments: InstagramComment[],
  options: { postUrl: string; truncated?: boolean }
): string {
  return buildTableCsv({
    title: "인스타 댓글 수집",
    createdDate: csvDateStamp(),
    meta: [
      `수집 대상: ${options.postUrl}`,
      `수집 건수: ${comments.length}건`,
      // 잘린 결과가 전체인 것처럼 보관되지 않도록 파일 안에도 남긴다
      ...(options.truncated
        ? ["※ 수집이 중간에 멈춰 일부만 담긴 결과입니다."]
        : []),
    ],
    headers: INSTAGRAM_HEADERS,
    rows: comments.map((c) => [
      formatSeoulDateTime(c.createdAt) || c.createdAt,
      c.commentType,
      c.username,
      c.profileUrl,
      c.likes,
      c.replyCount,
      c.content,
    ]),
  });
}
