// 매체별 광고 소재 규격 단일 출처.
// 원본: add/adcopy/search_ad_copy_spec.json (specVersion 1.0.0, 2026-08-04)
// 가이드 §6의 "공식 확정값"만 반영한다. review_required 수치는 검증에 사용하지 않는다.
// 매체마다 필드 명칭이 다르므로(네이버 title / 구글 headline) title·description 2개로 정규화했다.

import type {
  AdDiversityLevel,
  AdMediaKey,
  IndustryOption,
  MediaSpec,
} from "@/types/ad-copy";

/** 매체 표시 순서 단일 출처 */
export const AD_MEDIA_KEYS: AdMediaKey[] = ["naver", "kakao", "google"];

export const MEDIA_SPECS: Record<AdMediaKey, MediaSpec> = {
  naver: {
    key: "naver",
    shortName: "네이버",
    displayName: "네이버 검색광고",
    productKey: "powerlink",
    productName: "파워링크",
    counter: "GRAPHEME_1",
    counterNote: "한글·영문·숫자·공백 모두 1자로 계산합니다.",
    specialCharRule:
      "과도한 특수문자와 반복 기호(!, ^^, *) 사용 금지. 이모지 사용 금지.",
    fields: {
      title: {
        key: "title",
        label: "제목",
        limit: 15,
        koEffective: 15,
        minCount: 1,
        maxCount: 10,
        defaultCount: 5,
      },
      description: {
        key: "description",
        label: "설명",
        limit: 45,
        minLength: 20,
        koEffective: 45,
        minCount: 1,
        maxCount: 10,
        defaultCount: 5,
      },
    },
  },
  kakao: {
    key: "kakao",
    shortName: "카카오",
    displayName: "카카오 키워드광고",
    productKey: "keyword_ad",
    productName: "키워드광고 기본소재",
    counter: "GRAPHEME_1",
    counterNote: "한글·영문·숫자·공백 모두 1자로 계산합니다.",
    specialCharRule:
      "특수문자는 의미 전달 목적일 때만 허용. 반복형(!!!!), 이모티콘(^^, ㅠㅠ), 장식 기호(☆ ○ ◇ ♡) 사용 금지.",
    fields: {
      title: {
        key: "title",
        label: "제목",
        limit: 15,
        koEffective: 15,
        minCount: 1,
        maxCount: 10,
        defaultCount: 5,
      },
      description: {
        key: "description",
        label: "설명문구",
        limit: 45,
        koEffective: 45,
        minCount: 1,
        maxCount: 10,
        defaultCount: 5,
      },
    },
  },
  google: {
    key: "google",
    shortName: "구글",
    displayName: "Google Ads 반응형 검색광고(RSA)",
    productKey: "rsa",
    productName: "반응형 검색광고",
    counter: "GOOGLE_CJK_2",
    counterNote:
      "한도는 고정이며 한글 등 전각 문자는 1자당 2카운트를 소모합니다. (제목 30카운트 = 한글 15자)",
    specialCharRule:
      "연속 반복(!!), 문자 내 기호 치환(fl@wers), 구두점 분해(F.L.O.W.E.R.S), 장식 별표(*text*), 이모지, 전체 대문자 사용 금지.",
    fields: {
      title: {
        key: "title",
        label: "제목(Headline)",
        limit: 30,
        koEffective: 15,
        minCount: 3,
        maxCount: 15,
        defaultCount: 8,
      },
      description: {
        key: "description",
        label: "설명",
        limit: 90,
        koEffective: 45,
        minCount: 2,
        maxCount: 4,
        defaultCount: 4,
      },
    },
  },
};

/** 업종 목록 — 심의 대상 여부와 매체별 등록불가 여부를 함께 관리한다 */
export const INDUSTRIES: IndustryOption[] = [
  { key: "general", label: "일반/기타" },
  { key: "ecommerce", label: "쇼핑/이커머스" },
  { key: "education", label: "교육/학원" },
  { key: "medical", label: "병의원/의료", reviewNumberRequired: true },
  { key: "healthfood", label: "건강기능식품", reviewNumberRequired: true },
  { key: "finance", label: "금융/대출/보험" },
  { key: "beauty", label: "뷰티/미용" },
  { key: "travel", label: "여행/숙박" },
  { key: "realestate", label: "부동산" },
  { key: "itservice", label: "IT/서비스" },
  { key: "gambling", label: "도박/사행성", blockedOn: ["kakao"] },
  { key: "tobacco", label: "담배", blockedOn: ["kakao"] },
  { key: "religion", label: "종교", blockedOn: ["kakao"] },
];

/** 톤앤매너 (D_표현제어.toneAndManner) */
export const TONES = [
  "신뢰형",
  "혜택강조형",
  "긴급형",
  "프리미엄",
  "친근형",
] as const;

/** 행동유도 유형 (C_소구정보.cta) */
export const CTAS = [
  "상담신청",
  "구매하기",
  "무료견적",
  "예약",
  "다운로드",
  "가입",
] as const;

/** 변형 다양성 (E_생성옵션.diversityLevel) */
export const DIVERSITY_LEVELS: AdDiversityLevel[] = ["보수적", "균형", "실험적"];

/** 업종 key → 옵션 조회 */
export function findIndustry(key: string): IndustryOption | undefined {
  return INDUSTRIES.find((i) => i.key === key);
}

/** 업종 key → 표시 라벨 (미등록 key는 그대로 반환) */
export function industryLabel(key: string): string {
  return findIndustry(key)?.label ?? key;
}

/** 선택한 매체 중 해당 업종을 등록할 수 없는 매체 목록 */
export function blockedMediaFor(
  industryKey: string,
  media: AdMediaKey[]
): AdMediaKey[] {
  const blocked = findIndustry(industryKey)?.blockedOn ?? [];
  return media.filter((m) => blocked.includes(m));
}
