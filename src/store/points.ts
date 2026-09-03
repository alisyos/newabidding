// 포인트(크레딧) 전역 스토어
//
// 기능별 차감 단가(전 사용자 공통) · 사용자별 잔액 · 사용 내역을 관리하며,
// 관리자 페이지(/admin)에서 조회·수정한다.
// 목업이므로 서버 없이 localStorage(persist)에 저장한다.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { PRICING_META, defaultPrices } from "@/lib/point-pricing";
import { buildSeed } from "@/lib/point-seed";
import { DEFAULT_USER_ID, isUserId } from "@/lib/users";
import type { AgentId } from "@/types/agent";
import type { AgentPriceMap, PointLog } from "@/types/points";
import { USER_IDS, type UserBalanceMap, type UserId } from "@/types/user";

/** 사용자 1인당 내역 보관 상한 — 한 사람의 활동이 다른 사용자 내역을 밀어내지 않게 한다 */
export const MAX_LOGS_PER_USER = 60;

/** 전체 내역 보관 상한 — localStorage 용량 방어 (300건 ≈ 51KB) */
export const MAX_LOGS = 300;

const STORAGE_KEY = "gptko-points";
/** 스키마를 바꿀 때 이 값을 올리면 옛 저장본이 폐기되고 기본값으로 시작한다 */
const STORAGE_VERSION = 2;

// crypto.randomUUID 는 비보안(http) 컨텍스트에서 없을 수 있어 카운터로 발급한다
let logSeq = 0;
const nextLogId = () => `log-${Date.now().toString(36)}-${(++logSeq).toString(36)}`;

/**
 * 최신 로그를 앞에 붙이되, 해당 사용자 로그를 먼저 사용자별 상한으로 자른다.
 * 전역 상한만 쓰면 활동이 많은 한 사람이 다른 사용자의 내역을 통째로 밀어낸다.
 */
const appendLog = (logs: PointLog[], entry: PointLog): PointLog[] => {
  const mine = logs.filter((l) => l.userId === entry.userId);
  const others = logs.filter((l) => l.userId !== entry.userId);
  const kept = [entry, ...mine].slice(0, MAX_LOGS_PER_USER);
  return [...kept, ...others].sort((a, b) => b.at - a.at).slice(0, MAX_LOGS);
};

/**
 * 잔액 조회 헬퍼.
 * tsconfig 에 noUncheckedIndexedAccess 가 없어 balances[id] 가 number 로 타입되지만,
 * 저장본 병합 후 실제로는 undefined 일 수 있으므로 접근은 항상 이 함수를 거친다.
 */
export function balanceOf(balances: UserBalanceMap, userId: UserId): number {
  const value = balances[userId] as number | undefined;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** 저장본 잔액 맵을 정제 병합 — 알 수 없는 키 제거, 깨진 값 폴백 */
function mergeBalances(
  base: UserBalanceMap,
  saved: Partial<UserBalanceMap> | undefined
): UserBalanceMap {
  const next = { ...base };
  for (const [key, value] of Object.entries(saved ?? {})) {
    if (!isUserId(key)) continue; // 삭제된 사용자 키 무시
    if (typeof value !== "number" || !Number.isFinite(value)) continue; // NaN 방어
    next[key] = Math.max(0, Math.round(value));
  }
  return next;
}

interface DeductArgs {
  /** 과금 대상 사용자 — 비동기 작업은 시작 시점 값을 스냅샷해서 넘긴다 */
  userId: UserId;
  agentId: AgentId;
  amount: number;
  /** 사용 내역의 "내역" 열에 표시 (예: "키워드 12건") */
  detail?: string;
}

interface AddBalanceArgs {
  userId: UserId;
  /** 충전(양수) / 조정 차감(음수) */
  amount: number;
  detail?: string;
}

interface PointsState {
  /** 헤더 스위처로 선택된 사용자. 기능 사용 시 이 사람에게 차감된다 */
  currentUserId: UserId;
  balances: UserBalanceMap;
  /** 단가는 전 사용자 공통 */
  prices: AgentPriceMap;
  logs: PointLog[];

  setCurrentUser: (userId: UserId) => void;
  /** 차감 시도. 잔액이 부족하면 차감·기록 없이 false 반환 */
  deduct: (args: DeductArgs) => boolean;
  /** 충전(양수) / 조정 차감(음수). 잔액은 0 미만으로 내려가지 않는다 */
  addBalance: (args: AddBalanceArgs) => void;
  setPrice: (agentId: AgentId, price: number) => void;
  resetPrices: () => void;
  /** 전 사용자 잔액을 시드 적용 후 기본값으로 (내역은 유지) */
  resetBalances: () => void;
  clearLogs: () => void;
  /** 잔액·단가·현재 사용자·내역을 모두 앱 최초 상태(샘플 내역 포함)로 */
  resetAll: () => void;
}

const initialSeed = buildSeed();

export const usePointsStore = create<PointsState>()(
  persist(
    (set, get) => ({
      currentUserId: DEFAULT_USER_ID,
      balances: initialSeed.balances,
      prices: defaultPrices(),
      logs: initialSeed.logs,

      setCurrentUser: (userId) => set({ currentUserId: userId }),

      deduct: ({ userId, agentId, amount, detail }) => {
        if (!Number.isFinite(amount) || amount < 0) return true;
        const balance = balanceOf(get().balances, userId);
        if (balance < amount) return false;

        const balanceAfter = balance - amount;
        set((s) => ({
          balances: { ...s.balances, [userId]: balanceAfter },
          // 단가 0(무료) 설정도 확인할 수 있도록 0P 사용까지 기록한다
          logs: appendLog(s.logs, {
            id: nextLogId(),
            at: Date.now(),
            userId,
            type: "use",
            agentId,
            detail: detail ?? "",
            amount: -amount,
            balanceAfter,
          }),
        }));
        return true;
      },

      addBalance: ({ userId, amount, detail }) => {
        if (!Number.isFinite(amount) || amount === 0) return;
        set((s) => {
          const before = balanceOf(s.balances, userId);
          const balanceAfter = Math.max(0, before + Math.round(amount));
          const delta = balanceAfter - before; // 0 하한 보정 후의 실제 증감
          return {
            balances: { ...s.balances, [userId]: balanceAfter },
            logs: appendLog(s.logs, {
              id: nextLogId(),
              at: Date.now(),
              userId,
              type: "charge",
              agentId: null,
              detail: detail ?? (delta >= 0 ? "관리자 충전" : "관리자 조정 차감"),
              amount: delta,
              balanceAfter,
            }),
          };
        });
      },

      setPrice: (agentId, price) =>
        set((s) => ({ prices: { ...s.prices, [agentId]: price } })),

      resetPrices: () => set({ prices: defaultPrices() }),

      // 모듈 스코프의 initialSeed 를 재사용하면 객체 참조를 공유해
      // 이후 갱신이 초기값을 오염시키므로 매번 새로 만든다.
      resetBalances: () =>
        set((s) => {
          const balances = buildSeed().balances;
          const at = Date.now();

          // 잔액만 바꾸고 내역을 남기지 않으면 사용 내역의 최신 balanceAfter 가
          // 잔액 관리 탭의 현재 잔액과 어긋난다. 사용자마다 초기화 기록을 1건씩 남긴다.
          let logs = s.logs;
          for (const userId of USER_IDS) {
            logs = appendLog(logs, {
              id: nextLogId(),
              at,
              userId,
              type: "reset",
              agentId: null,
              detail: "전체 잔액 초기화",
              // 증감은 0으로 둔다. 잔액 관리 탭의 총 사용/총 충전 집계가
              // 타입이 아니라 amount 의 부호로 분류하기 때문에(user-balance-table.tsx),
              // 실제 증감을 넣으면 초기화가 사용·충전 실적으로 잡힌다.
              amount: 0,
              balanceAfter: balanceOf(balances, userId),
            });
          }

          return { balances, logs };
        }),

      clearLogs: () => set({ logs: [] }),

      resetAll: () => {
        const fresh = buildSeed();
        set({
          currentUserId: DEFAULT_USER_ID,
          balances: fresh.balances,
          prices: defaultPrices(),
          logs: fresh.logs,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      // SSR 불일치 방지: 서버·클라이언트 첫 렌더는 항상 기본값으로 맞추고
      // 복원은 PointsHydrator 가 마운트 후 수동 실행한다.
      skipHydration: true,
      partialize: (s) => ({
        currentUserId: s.currentUserId,
        balances: s.balances,
        prices: s.prices,
        logs: s.logs,
      }),
      // v1 저장본은 단일 balance + userId 없는 logs 라 누구의 값인지 복원할 수 없다.
      // undefined 를 반환하면 merge 의 persisted 가 undefined 가 되어 초기 상태가 남는다.
      migrate: (persisted, version) => (version < 2 ? undefined : persisted),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<
          Pick<PointsState, "currentUserId" | "balances" | "prices" | "logs">
        >;
        return {
          ...current,
          // 저장된 사용자가 목록에서 사라졌으면 기본 사용자로 폴백
          currentUserId: isUserId(p.currentUserId)
            ? p.currentUserId
            : DEFAULT_USER_ID,
          balances: mergeBalances(current.balances, p.balances),
          // 기본 merge 는 얕은 병합이라 prices 가 저장본으로 통째 교체된다.
          // 나중에 추가된 에이전트의 단가가 undefined 가 되지 않도록 키 단위로 보강한다.
          prices: { ...current.prices, ...(p.prices ?? {}) },
          // 저장본이 있으면 그대로 쓴다. "내역 비우기"로 만든 빈 배열도 배열이므로
          // 유지되어 샘플 내역이 되살아나지 않는다.
          logs: Array.isArray(p.logs) ? p.logs.slice(0, MAX_LOGS) : current.logs,
        };
      },
    }
  )
);

/** 현재 선택된 사용자 id */
export function useCurrentUserId(): UserId {
  return usePointsStore((s) => s.currentUserId);
}

/** 현재 사용자의 잔액 — 헤더 배지·각 기능 화면용 */
export function useCurrentBalance(): number {
  return usePointsStore((s) => balanceOf(s.balances, s.currentUserId));
}

/**
 * 특정 에이전트의 현재 단가를 구독한다.
 * 저장본에 값이 없거나 깨진 경우 기본 단가로 폴백한다. (NaN 방어)
 */
export function useAgentPrice(agentId: AgentId): number {
  return usePointsStore((s) => {
    const price = s.prices[agentId];
    return typeof price === "number" && Number.isFinite(price)
      ? price
      : PRICING_META[agentId].defaultPrice;
  });
}

/** 등록 키워드 수 → 필요 포인트 */
export function costForKeywords(count: number, unitPrice: number): number {
  return count * unitPrice;
}

/** 매체별 생성 개수 계획 → 필요 포인트 (제목 + 설명 전부 합산) */
export function costForAdCopy(
  plan: { titles: number; descriptions: number }[],
  unitPrice: number
): number {
  return plan.reduce(
    (sum, p) => sum + (p.titles + p.descriptions) * unitPrice,
    0
  );
}

/** 생성 성공한 이미지 개수 → 필요 포인트 (이미지 1건당 과금) */
export function costForImages(count: number, unitPrice: number): number {
  return count * unitPrice;
}
