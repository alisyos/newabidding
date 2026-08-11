// 에이전트별 포인트 단가 메타데이터
//
// localStorage(persist)에는 "숫자 단가"만 저장하고,
// 단위 라벨과 기본 단가는 이 파일의 코드 상수로 둔다.
// (라벨 문구를 수정했는데 저장된 옛 값이 계속 표시되는 것을 막기 위함)

import { AGENT_IDS, type AgentId } from "@/types/agent";
import type { AgentPriceMap, PriceUnit } from "@/types/points";

/** 단위별 표시 라벨 */
export const UNIT_LABEL: Record<PriceUnit, string> = {
  keyword: "키워드 1건당",
  adCopy: "문구 1건당",
  run: "실행 1회당",
};

interface PricingMeta {
  unit: PriceUnit;
  defaultPrice: number;
}

/**
 * 에이전트별 단가 메타 (단일 출처).
 * Record<AgentId, _> 이므로 AGENT_IDS 에 id를 추가하면
 * 여기를 채우기 전까지 빌드가 실패한다. (단가 누락 방지)
 */
export const PRICING_META: Record<AgentId, PricingMeta> = {
  "keyword-expansion": { unit: "keyword", defaultPrice: 10 },
  "search-keyword-expansion": { unit: "keyword", defaultPrice: 10 },
  "blog-comments": { unit: "run", defaultPrice: 200 },
  "instagram-comments": { unit: "run", defaultPrice: 200 },
  "youtube-monitoring": { unit: "run", defaultPrice: 100 },
  "ad-copy-generator": { unit: "adCopy", defaultPrice: 5 },
  "creative-brief": { unit: "run", defaultPrice: 300 },
  "rank-tracking": { unit: "run", defaultPrice: 100 },
  "product-name-optimizer": { unit: "run", defaultPrice: 50 },
  "review-analysis": { unit: "run", defaultPrice: 200 },
  "competitor-monitoring": { unit: "run", defaultPrice: 300 },
  "ad-keyword-recommend": { unit: "run", defaultPrice: 80 },
  "category-trend": { unit: "run", defaultPrice: 150 },
};

/** 관리자가 설정할 수 있는 단가 상한 */
export const MAX_PRICE = 100_000;

/** 기본 단가 맵 — 항상 새 객체를 반환한다 (참조 공유 사고 방지) */
export function defaultPrices(): AgentPriceMap {
  return Object.fromEntries(
    AGENT_IDS.map((id) => [id, PRICING_META[id].defaultPrice])
  ) as AgentPriceMap;
}

/** 해당 에이전트의 단위 표시 라벨 */
export function unitLabelOf(id: AgentId): string {
  return UNIT_LABEL[PRICING_META[id].unit];
}

/** 해당 에이전트의 기본 단가 */
export function defaultPriceOf(id: AgentId): number {
  return PRICING_META[id].defaultPrice;
}
