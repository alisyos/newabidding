// 사용자(목업) 타입 정의

/**
 * 등록된 사용자 id 목록.
 * 사용자를 추가하면 여기에 id를 먼저 넣어야 한다.
 * (잔액 맵이 Record<UserId, number> 이므로 초기 잔액 누락 시 빌드가 실패한다)
 */
export const USER_IDS = ["u-kim", "u-lee", "u-park", "u-choi", "u-jung"] as const;

export type UserId = (typeof USER_IDS)[number];

/** 목업 권한 — 화면 배지 표시용이며 접근 제어는 하지 않는다 */
export type UserRole = "admin" | "member";

export interface User {
  id: UserId;
  name: string;
  team: string;
  email: string;
  role: UserRole;
  /** 가입일 — 표시 전용 문자열. Date 파싱을 거치지 않아 타임존 이슈가 없다 */
  joinedAt: string;
  /** 시드 로그 적용 "이전"의 출발 잔액. 실제 표시 잔액은 시드 적용 후 값이다 */
  startBalance: number;
}

/** 사용자별 포인트 잔액 맵 (localStorage 저장 대상) */
export type UserBalanceMap = Record<UserId, number>;
