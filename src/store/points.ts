// 포인트(크레딧) 전역 스토어
// 키워드 확장 시 등록 키워드 1개당 POINT_PER_KEYWORD 포인트가 차감된다.
// 목업이므로 초기 잔액은 하드코딩된 상수를 사용한다.

import { create } from "zustand";

/** 등록 키워드 1개당 차감 포인트 */
export const POINT_PER_KEYWORD = 10;

/** 초기(목업) 잔액 */
const INITIAL_BALANCE = 100_000;

interface PointsState {
  balance: number;
  /**
   * 포인트 차감 시도. 잔액이 부족하면 차감하지 않고 false 반환.
   * 성공 시 차감 후 true 반환.
   */
  deduct: (amount: number) => boolean;
  /** 잔액을 초기값으로 되돌린다. */
  reset: () => void;
}

export const usePointsStore = create<PointsState>((set, get) => ({
  balance: INITIAL_BALANCE,
  deduct: (amount) => {
    if (amount <= 0) return true;
    if (get().balance < amount) return false;
    set((state) => ({ balance: state.balance - amount }));
    return true;
  },
  reset: () => set({ balance: INITIAL_BALANCE }),
}));

/** 등록 키워드 수 → 필요 포인트 */
export function costForKeywords(count: number): number {
  return count * POINT_PER_KEYWORD;
}
