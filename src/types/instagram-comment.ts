// 인스타 댓글 수집(/instagram-comments) 타입 정의

/** 수집된 댓글 1건 */
export interface InstagramComment {
  /** 작성일시 (ISO 8601. 표시할 때 Asia/Seoul 로 포맷한다) */
  createdAt: string;
  /** 구분 — "댓글" | "답글" */
  commentType: string;
  /** @ 없는 사용자명 */
  username: string;
  /** 프로필 URL */
  profileUrl: string;
  /** 좋아요 수 */
  likes: number;
  /** 이 댓글에 달린 답글 수 */
  replyCount: number;
  /** 댓글 내용 */
  content: string;
}

/** POST /api/instagram-comments/stream 요청 본문 */
export interface InstagramCommentsRequest {
  /** instagram.com/p/{shortcode}/ 또는 /reel/{shortcode}/ */
  postUrl: string;
}

/** 스트리밍 실패 사유 */
export type InstagramErrorCode = "SESSION_EXPIRED" | "UNKNOWN";

/**
 * 스트리밍 응답 청크 (개행 구분 JSON).
 *
 * [중요] isLastBatch 가 true 인 batch 는 답글 수를 전역 재계산한 "전체 배열"이다.
 * 클라이언트는 이때 누적(append)이 아니라 교체(replace)해야 한다.
 */
export type InstagramStreamChunk =
  | { type: "start"; message: string }
  | {
      type: "batch";
      batch: number;
      comments: InstagramComment[];
      /** 지금까지 누적 수집 건수 */
      totalComments: number;
      isLastBatch: boolean;
    }
  | {
      type: "complete";
      total: number;
      message: string;
      /**
       * 끝까지 훑지 못하고 끝났으면 true.
       * 이때는 "전부 수집했다"고 안내하면 안 된다.
       */
      truncated: boolean;
    }
  | { type: "error"; errorCode: InstagramErrorCode; message: string };
