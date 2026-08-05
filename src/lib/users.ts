// 목업 사용자 프로필
//
// point-pricing.ts 와 같은 원칙: localStorage 에는 "잔액 숫자"만 저장하고
// 이름·소속 같은 프로필은 코드 상수로 둔다.
// (프로필까지 저장하면 이름을 고쳐도 저장본의 옛 값이 계속 덮어쓴다)

import { USER_IDS, type User, type UserBalanceMap, type UserId } from "@/types/user";

/**
 * 사용자 프로필 단일 출처.
 * Record<UserId, _> 이므로 USER_IDS 에 id를 추가하면 여기를 채워야 빌드된다.
 */
export const USER_META: Record<UserId, User> = {
  "u-kim": {
    id: "u-kim",
    name: "김서연",
    team: "마케팅팀",
    email: "seoyeon.kim@gptko.co.kr",
    role: "admin",
    joinedAt: "2025.03.02",
    startBalance: 150_000,
  },
  "u-lee": {
    id: "u-lee",
    name: "이준호",
    team: "광고운영팀",
    email: "junho.lee@gptko.co.kr",
    role: "member",
    joinedAt: "2025.05.19",
    startBalance: 120_000,
  },
  "u-park": {
    id: "u-park",
    name: "박지민",
    team: "커머스팀",
    email: "jimin.park@gptko.co.kr",
    role: "member",
    joinedAt: "2025.08.11",
    startBalance: 90_000,
  },
  "u-choi": {
    id: "u-choi",
    name: "최민석",
    team: "데이터분석팀",
    email: "minseok.choi@gptko.co.kr",
    role: "member",
    joinedAt: "2026.01.06",
    startBalance: 60_000,
  },
  "u-jung": {
    id: "u-jung",
    name: "정하윤",
    team: "콘텐츠팀",
    email: "hayoon.jung@gptko.co.kr",
    role: "member",
    joinedAt: "2026.04.20",
    // 잔액이 얼마 남지 않은 케이스 — "포인트 부족" 동작을 바로 시연할 수 있게 한다
    // (시드 사용 8,500P 적용 후 3,500P)
    startBalance: 12_000,
  },
};

/** 화면 노출 순서 (USER_IDS 순서 유지) */
export const USERS: User[] = USER_IDS.map((id) => USER_META[id]);

/** 앱 최초 진입 시의 현재 사용자 — 서버/클라이언트 첫 렌더가 반드시 이 값으로 일치해야 한다 */
export const DEFAULT_USER_ID: UserId = "u-kim";

/** 저장본 등 외부에서 들어온 값이 유효한 UserId 인지 확인 */
export function isUserId(value: unknown): value is UserId {
  return (
    typeof value === "string" && (USER_IDS as readonly string[]).includes(value)
  );
}

/** id로 프로필 조회 (알 수 없는 id면 기본 사용자) */
export function userOf(id: UserId): User {
  return USER_META[id] ?? USER_META[DEFAULT_USER_ID];
}

/** 표시용 이름 — 알 수 없는 id는 id 그대로 노출해 데이터를 숨기지 않는다 */
export function userName(id: string): string {
  return isUserId(id) ? USER_META[id].name : id;
}

/** 표시용 소속 */
export function userTeam(id: string): string {
  return isUserId(id) ? USER_META[id].team : "";
}

/** 이름 첫 글자 (아바타 대체) */
export function userInitial(id: UserId): string {
  return userOf(id).name.slice(0, 1);
}

/** 시드 적용 전 출발 잔액 맵 — 항상 새 객체를 반환한다 (참조 공유 사고 방지) */
export function startBalances(): UserBalanceMap {
  return Object.fromEntries(
    USER_IDS.map((id) => [id, USER_META[id].startBalance])
  ) as UserBalanceMap;
}
