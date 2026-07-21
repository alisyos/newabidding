// 쇼핑몰 키워드 확장 목업 데이터 생성기
// 실제 크롤링 없이, 키워드 문자열 기반의 "결정적(deterministic)" 의사난수로
// 매 렌더마다 동일한 결과가 나오도록 생성한다. (Math.random 미사용)

import type {
  CollectionSet,
  DiscoveredTerm,
  KeywordResult,
  MallKey,
  Mall,
  Metrics,
  RegisteredKeyword,
} from "@/types/keyword";

/** 지원 쇼핑몰 9개 — 단일 출처. label 은 example.csv 헤더와 동일. */
export const MALLS: Mall[] = [
  { key: "coupang", label: "쿠팡", fullName: "쿠팡" },
  { key: "gmarket", label: "G마켓", fullName: "G마켓" },
  { key: "auction", label: "옥션", fullName: "옥션" },
  { key: "elevenst", label: "11번가", fullName: "11번가" },
  { key: "ssg", label: "SSG", fullName: "SSG.COM" },
  { key: "lotteon", label: "롯데ON", fullName: "롯데ON" },
  { key: "emart", label: "이마트몰", fullName: "이마트몰" },
  { key: "ali", label: "알리", fullName: "알리익스프레스" },
  { key: "temu", label: "테무", fullName: "테무" },
];

export const MALL_KEYS: MallKey[] = MALLS.map((m) => m.key);

/** 연관/자동완성 검색어 목업용 접미사 풀 */
const TERM_SUFFIXES = [
  "추천",
  "정품",
  "최신",
  "할인",
  "케이스",
  "커버",
  "필름",
  "자급제",
  "가격비교",
  "인기",
  "세트",
  "구성품",
  "액세서리",
  "정리",
  "충전기",
  "거치대",
  "리뷰",
  "후기",
  "특가",
  "새제품",
];

// ---- 결정적 의사난수 유틸 ----

/** 문자열 → 32bit 해시 (seed 생성용) */
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — seed 로 시작하는 결정적 난수 생성기 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeMetrics(rand: () => number): Metrics {
  const impressions = Math.floor(rand() * 120000) + 30;
  const ctr = Math.round(rand() * 600) / 100; // 0.00 ~ 6.00 %
  const clicks = Math.floor((impressions * ctr) / 100);
  const cpc = (Math.floor(rand() * 60) + 3) * 100; // 300 ~ 6,200 원
  const cost = clicks * cpc;
  return { impressions, clicks, ctr, cpc, cost };
}

function makeFlags(rand: () => number, minTrue = 1): Record<MallKey, boolean> {
  const flags = {} as Record<MallKey, boolean>;
  MALL_KEYS.forEach((k) => {
    flags[k] = rand() > 0.62;
  });
  // 최소 minTrue 개는 O 가 되도록 보정 (모두 X 인 무의미한 행 방지)
  if (MALL_KEYS.filter((k) => flags[k]).length < minTrue) {
    flags[MALL_KEYS[Math.floor(rand() * MALL_KEYS.length)]] = true;
  }
  return flags;
}

/** 등록 키워드 1개 → 결정적 목업 수집 결과 */
export function generateResult(kw: RegisteredKeyword): KeywordResult {
  const rand = mulberry32(hashString(kw.keyword) ^ 0x9e3779b9);
  const count = 5 + Math.floor(rand() * 8); // 5 ~ 12 개

  const used = new Set<string>();
  const terms: DiscoveredTerm[] = [];
  let guard = 0;
  while (terms.length < count && guard < count * 5) {
    guard++;
    const suffix = TERM_SUFFIXES[Math.floor(rand() * TERM_SUFFIXES.length)];
    const term = `${kw.keyword}${suffix}`;
    if (used.has(term)) continue;
    used.add(term);
    terms.push({
      term,
      autocomplete: makeFlags(rand),
      related: makeFlags(rand),
      pc: makeMetrics(rand),
      mobile: makeMetrics(rand),
    });
  }

  return { keyword: kw.keyword, targetRank: kw.targetRank, terms };
}

export function generateResults(keywords: RegisteredKeyword[]): KeywordResult[] {
  return keywords.map(generateResult);
}

/** 목업 초기 목록용 사전 생성 항목 개수 (페이징 확인용으로 20개 이상) */
export const SAMPLE_SET_COUNT = 23;

/** 날짜에서 n일 전 문자열(YYYY.MM.DD) */
function daysAgoString(base: Date, days: number): string {
  const d = new Date(base.getTime() - days * 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/**
 * 수집 등록 리스트 초기 목업 데이터 생성.
 * SAMPLE_BULK_KEYWORDS 를 순환 조합해 각 항목당 2~4개 키워드를 담는다.
 * seq 는 1..count, 최신(큰 seq)이 앞에 오도록 내림차순 정렬해 반환한다.
 */
export function generateSampleSets(count: number = SAMPLE_SET_COUNT): CollectionSet[] {
  const base = new Date();
  const sets: CollectionSet[] = [];

  for (let seq = 1; seq <= count; seq++) {
    const size = 2 + (seq % 3); // 2 ~ 4개
    const keywords: RegisteredKeyword[] = [];
    for (let j = 0; j < size; j++) {
      const kw = SAMPLE_BULK_KEYWORDS[(seq + j) % SAMPLE_BULK_KEYWORDS.length];
      keywords.push({
        id: `sample-${seq}-${j}`,
        keyword: kw,
        targetRank: 1 + ((seq + j) % 10),
      });
    }
    sets.push({
      id: `set-${seq}`,
      seq,
      name: `no_${seq}`,
      createdAt: daysAgoString(base, count - seq),
      keywords,
      results: generateResults(keywords),
    });
  }

  // 최신 항목이 위로 오도록 내림차순
  return sets.reverse();
}

/** 대량 등록 목업용 샘플 키워드 목록 */
export const SAMPLE_BULK_KEYWORDS = [
  "삼성갤럭시",
  "아이폰15",
  "무선이어폰",
  "노트북거치대",
  "게이밍마우스",
  "기계식키보드",
  "블루투스스피커",
  "보조배터리",
  "캠핑의자",
  "전기포트",
  "공기청정기",
  "로봇청소기",
  "커피머신",
  "런닝화",
  "백팩",
];
