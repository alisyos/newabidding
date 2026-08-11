// 네이버 블로그 댓글 수집(/blog-comments) 타입 정의

/** 수집된 댓글 1건 */
export interface BlogComment {
  /** 작성일시 (네이버 표기 그대로. 예: "2026.01.15. 14:30") */
  createdAt: string;
  /** 구분 — "댓글" | "답글" */
  commentType: string;
  /** 작성자 닉네임 */
  nickname: string;
  /** 작성자 블로그 URL. 없으면 빈 문자열 */
  authorUrl: string;
  /** 공감수 */
  likes: number;
  /** 본문에 포함된 링크 수 */
  links: number;
  /**
   * 이 댓글에 달린 답글 수.
   * 스크래퍼가 페이지 단위로 세므로, 답글이 다음 페이지로 넘어가면 실제보다 적게 잡힐 수 있다.
   */
  replyCount: number;
  /** 첨부 이미지 URL. 없으면 빈 문자열 */
  imageUrl: string;
  /** 댓글 내용 */
  content: string;
}

/** POST /api/blog-comments/stream 요청 본문 */
export interface BlogCommentsRequest {
  /** blog.naver.com/{blogId}/{logNo} 또는 m.blog.naver.com?blogId=&logNo= */
  blogUrl: string;
}

/**
 * 스트리밍 응답 청크 (개행 구분 JSON).
 *
 * 네이버는 댓글 페이지를 역순(마지막 페이지부터)으로 보여주므로
 * page 청크는 큰 페이지 번호부터 도착한다. 누적 결과도 그 순서를 따른다.
 */
export type BlogStreamChunk =
  | { type: "start"; message: string }
  | {
      type: "page";
      /** 현재 수집한 페이지 번호 */
      page: number;
      comments: BlogComment[];
      /** 지금까지 누적 수집 건수 */
      totalComments: number;
      /** 전체 페이지 수 (0이면 판별 실패) */
      totalPages: number;
      /** 0~100 */
      progress: number;
      isLastPage: boolean;
    }
  | {
      type: "complete";
      total: number;
      message: string;
      /**
       * 페이지 상한에 걸려 뒤쪽 페이지를 남겨두고 끝났으면 true.
       * 이때는 "전부 수집했다"고 안내하면 안 된다.
       */
      truncated: boolean;
      /** 감지된 전체 페이지 수 */
      totalPages: number;
      /** 실제로 순회한 페이지 수 */
      pagesScanned: number;
    }
  | { type: "error"; message: string };
