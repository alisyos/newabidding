// 과거 포인트 사용 내역 시드 데이터 (목업)
//
// [중요] 타임스탬프와 id 는 반드시 고정 상수여야 한다.
// Date.now() / randomUUID 를 쓰면 서버 렌더와 클라이언트 렌더 값이 달라져
// hydration 불일치가 발생한다. (스토어가 skipHydration 이라 첫 렌더는 이 시드를 쓴다)
//
// 사용 이력은 실제로 쓸 수 있는 기능(status: "available") 3개로만 구성한다.
// 준비중 기능의 이력이 있으면 "쓸 수 없는데 이력이 있다"는 모순이 된다.

import type { AgentId } from "@/types/agent";
import type { PointLog } from "@/types/points";
import type { UserBalanceMap, UserId } from "@/types/user";
import { startBalances } from "@/lib/users";

/** 시드 기준 시각 (2026-07-27 00:30 UTC). Date.UTC 는 순수 계산이라 결정론적이다 */
const SEED_BASE_AT = Date.UTC(2026, 6, 27, 0, 30, 0);

interface SeedEntry {
  userId: UserId;
  /** SEED_BASE_AT 로부터의 경과 분 */
  offsetMin: number;
  type: PointLog["type"];
  agentId: AgentId | null;
  detail: string;
  /** 음수=사용, 양수=충전 */
  amount: number;
}

const SEED_ENTRIES: SeedEntry[] = [
  // --- 김서연 (마케팅팀) ---
  { userId: "u-kim", offsetMin: 0, type: "use", agentId: "keyword-expansion", detail: "키워드 24건", amount: -240 },
  { userId: "u-kim", offsetMin: 185, type: "use", agentId: "ad-copy-generator", detail: "네이버·구글 문구 30건", amount: -150 },
  { userId: "u-kim", offsetMin: 1520, type: "charge", agentId: null, detail: "관리자 충전", amount: 50_000 },
  { userId: "u-kim", offsetMin: 2870, type: "use", agentId: "search-keyword-expansion", detail: "키워드 48건", amount: -480 },
  { userId: "u-kim", offsetMin: 5210, type: "use", agentId: "keyword-expansion", detail: "키워드 120건", amount: -1200 },
  { userId: "u-kim", offsetMin: 9640, type: "use", agentId: "ad-copy-generator", detail: "카카오 문구 18건", amount: -90 },

  // --- 이준호 (광고운영팀) — 광고 문구 위주 ---
  { userId: "u-lee", offsetMin: 75, type: "use", agentId: "ad-copy-generator", detail: "네이버 문구 40건", amount: -200 },
  { userId: "u-lee", offsetMin: 1240, type: "use", agentId: "ad-copy-generator", detail: "구글 문구 60건", amount: -300 },
  { userId: "u-lee", offsetMin: 3310, type: "use", agentId: "keyword-expansion", detail: "키워드 35건", amount: -350 },
  { userId: "u-lee", offsetMin: 4880, type: "charge", agentId: null, detail: "관리자 충전", amount: 30_000 },
  { userId: "u-lee", offsetMin: 7150, type: "use", agentId: "ad-copy-generator", detail: "네이버·카카오 문구 52건", amount: -260 },
  { userId: "u-lee", offsetMin: 11020, type: "use", agentId: "search-keyword-expansion", detail: "키워드 62건", amount: -620 },
  { userId: "u-lee", offsetMin: 13400, type: "use", agentId: "ad-copy-generator", detail: "구글 문구 24건", amount: -120 },

  // --- 박지민 (커머스팀) ---
  { userId: "u-park", offsetMin: 420, type: "use", agentId: "keyword-expansion", detail: "키워드 80건", amount: -800 },
  { userId: "u-park", offsetMin: 2050, type: "use", agentId: "keyword-expansion", detail: "키워드 150건", amount: -1500 },
  { userId: "u-park", offsetMin: 4110, type: "use", agentId: "search-keyword-expansion", detail: "키워드 45건", amount: -450 },
  { userId: "u-park", offsetMin: 6720, type: "charge", agentId: null, detail: "분기 예산 배정", amount: 20_000 },
  { userId: "u-park", offsetMin: 9980, type: "use", agentId: "ad-copy-generator", detail: "네이버 문구 22건", amount: -110 },
  { userId: "u-park", offsetMin: 12600, type: "use", agentId: "keyword-expansion", detail: "키워드 96건", amount: -960 },

  // --- 최민석 (데이터분석팀) ---
  { userId: "u-choi", offsetMin: 960, type: "use", agentId: "search-keyword-expansion", detail: "키워드 200건", amount: -2000 },
  { userId: "u-choi", offsetMin: 3480, type: "use", agentId: "search-keyword-expansion", detail: "키워드 130건", amount: -1300 },
  { userId: "u-choi", offsetMin: 5940, type: "use", agentId: "keyword-expansion", detail: "키워드 58건", amount: -580 },
  { userId: "u-choi", offsetMin: 8300, type: "charge", agentId: null, detail: "관리자 충전", amount: 10_000 },
  { userId: "u-choi", offsetMin: 10850, type: "use", agentId: "ad-copy-generator", detail: "구글 문구 16건", amount: -80 },
  { userId: "u-choi", offsetMin: 13950, type: "use", agentId: "search-keyword-expansion", detail: "키워드 74건", amount: -740 },

  // --- 정하윤 (콘텐츠팀) — 잔액이 거의 소진된 케이스 ---
  { userId: "u-jung", offsetMin: 610, type: "use", agentId: "ad-copy-generator", detail: "네이버 문구 36건", amount: -180 },
  { userId: "u-jung", offsetMin: 2740, type: "use", agentId: "keyword-expansion", detail: "키워드 210건", amount: -2100 },
  { userId: "u-jung", offsetMin: 6180, type: "use", agentId: "keyword-expansion", detail: "키워드 320건", amount: -3200 },
  { userId: "u-jung", offsetMin: 9120, type: "use", agentId: "search-keyword-expansion", detail: "키워드 280건", amount: -2800 },
  { userId: "u-jung", offsetMin: 12980, type: "use", agentId: "ad-copy-generator", detail: "카카오 문구 44건", amount: -220 },

  // --- 수집 기능 (실행 1회당 과금) ---
  { userId: "u-kim", offsetMin: 6300, type: "use", agentId: "blog-comments", detail: "댓글 428건", amount: -200 },
  { userId: "u-lee", offsetMin: 8100, type: "use", agentId: "instagram-comments", detail: "댓글 316건", amount: -200 },
  { userId: "u-park", offsetMin: 9400, type: "use", agentId: "youtube-monitoring", detail: '"국민연금" 영상 187건', amount: -100 },
  { userId: "u-choi", offsetMin: 11700, type: "use", agentId: "youtube-monitoring", detail: '"청년적금" 영상 92건', amount: -100 },
  { userId: "u-jung", offsetMin: 12100, type: "use", agentId: "blog-comments", detail: "댓글 651건", amount: -200 },
];

export interface Seed {
  logs: PointLog[];
  balances: UserBalanceMap;
}

/**
 * 시드 로그를 시간순으로 적용하며 balanceAfter 와 최종 잔액을 함께 계산한다.
 * 잔액을 먼저 정하고 로그를 임의로 만들면 사용 내역의 "잔액" 열이
 * 잔액 관리 탭의 현재 잔액과 이어지지 않아 곧바로 가짜 데이터처럼 보인다.
 *
 * 순수 함수이며 호출할 때마다 새 객체를 반환한다. (참조 공유 사고 방지)
 */
export function buildSeed(): Seed {
  const balances = startBalances();
  const ordered = [...SEED_ENTRIES].sort((a, b) => a.offsetMin - b.offsetMin);
  const logs: PointLog[] = [];

  ordered.forEach((entry, i) => {
    const before = balances[entry.userId];
    const after = Math.max(0, before + entry.amount);
    balances[entry.userId] = after;
    logs.push({
      id: `seed-${String(i + 1).padStart(2, "0")}`, // Date.now() 금지 — 고정 id
      at: SEED_BASE_AT + entry.offsetMin * 60_000,
      userId: entry.userId,
      type: entry.type,
      agentId: entry.agentId,
      detail: entry.detail,
      amount: after - before, // 0 하한 보정 후의 실제 증감
      balanceAfter: after,
    });
  });

  // 화면은 최신순으로 보여준다
  return { logs: logs.reverse(), balances };
}

/** 시드 로그 건수 (안내 문구용) */
export const SEED_LOG_COUNT = SEED_ENTRIES.length;
