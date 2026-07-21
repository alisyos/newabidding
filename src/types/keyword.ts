// 매체(쇼핑몰·검색엔진) 키워드 확장(자동완성·연관검색어) 목업 타입 정의

/** 매체 식별자 (예: coupang, naver) */
export type ChannelKey = string;

/** 매체 메타 정보 */
export interface Channel {
  key: ChannelKey;
  /** CSV 헤더용 짧은 이름 (예: SSG, 알리) — example.csv 와 동일 */
  label: string;
  /** 화면 표시용 풀네임 (예: SSG.COM, 알리익스프레스) */
  fullName: string;
}

/** 등록된 키워드 (개별/대량 공통) */
export interface RegisteredKeyword {
  id: string;
  keyword: string;
  /** 목표 순위 (최소 1) */
  targetRank: number;
}

/** 광고 예상 지표 (PC 또는 모바일) */
export interface Metrics {
  impressions: number; // 예상 노출수
  clicks: number; // 예상 클릭수
  ctr: number; // 예상 CTR (%)
  cpc: number; // 예상 CPC (원)
  cost: number; // 예상 광고비 (원)
}

/** 수집된 연관/자동완성 검색어 1건 */
export interface DiscoveredTerm {
  term: string;
  /** 매체별 자동완성 검색어 노출 여부 */
  autocomplete: Record<ChannelKey, boolean>;
  /** 매체별 연관검색어 노출 여부 */
  related: Record<ChannelKey, boolean>;
  pc: Metrics;
  mobile: Metrics;
}

/** 키워드 1개에 대한 수집 결과 */
export interface KeywordResult {
  keyword: string;
  targetRank: number;
  terms: DiscoveredTerm[];
}

/** 한 번에 등록한 키워드 묶음 = 수집 등록 항목 */
export interface CollectionSet {
  id: string;
  /** 등록 순번 (목록 No. 표기용, 1부터 증가) */
  seq: number;
  /** 다운로드 파일명 등 내부 식별용 이름 (예: "no_1") */
  name: string;
  /** 생성일 (YYYY.MM.DD) */
  createdAt: string;
  keywords: RegisteredKeyword[];
  results: KeywordResult[];
}
