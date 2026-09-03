// 포인트 과금 관련 타입 정의

import type { AgentId } from "@/types/agent";
import type { UserId } from "@/types/user";

/** 단가가 적용되는 단위 — 표시 라벨과 계산 기준을 함께 결정한다 */
export type PriceUnit = "keyword" | "adCopy" | "run" | "image";

/** 에이전트별 차감 단가 맵 (localStorage 저장 대상) */
export type AgentPriceMap = Record<AgentId, number>;

/** 포인트 변동 로그 1건 */
export interface PointLog {
  id: string;
  /** 발생 시각 (Date.now()) */
  at: number;
  /**
   * 변동이 발생한 사용자.
   * 저장본이 남아 있는 상태에서 사용자 목록을 개편하면
   * 여기에 더 이상 존재하지 않는 id가 들어 있을 수 있다.
   * 표시할 때는 userName() 이 id 그대로 폴백하고, 집계에서는 제외한다.
   */
  userId: UserId;
  /** use=기능 사용 차감, charge=관리자 충전/조정, reset=초기화 */
  type: "use" | "charge" | "reset";
  /** 기능 사용이 아니면 null */
  agentId: AgentId | null;
  /** 내역 설명 (예: "키워드 12건", "관리자 충전") */
  detail: string;
  /** 음수=차감, 양수=충전 */
  amount: number;
  /** 변동 후 잔액 */
  balanceAfter: number;
}
