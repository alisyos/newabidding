// 금지·심의 표현 사전 필터. 가이드 §3 (add/adcopy/검색광고_광고문구_가이드.md) 구현.
// LLM 프롬프트 지시만으로는 최상급 표현이 새어 나오므로 사후 정규식 필터로 이중 방어한다.
// 서버(보정 루프)와 클라이언트(경고 표시)가 동일 로직을 공유하는 순수 함수 모듈이다.

import type { AdMediaKey, ProhibitedHit, Severity } from "@/types/ad-copy";

interface ProhibitedRule {
  id: string;
  /** 화면에 노출되는 규칙 이름 */
  name: string;
  re: RegExp;
  severity: Severity;
  /** "all" 이면 전 매체 공통 */
  appliesTo: AdMediaKey[] | "all";
  message: string;
  /** 최상급 근거(superlative.evidence) 제출 시 warning 으로 완화되는 규칙 */
  waivableByEvidence?: boolean;
}

/** 매체 공통 + 매체별 금지 규칙. 규칙 추가는 이 배열에 한 줄만 넣으면 된다. */
export const PROHIBITED_RULES: ProhibitedRule[] = [
  {
    id: "superlative",
    name: "최상급/배타성 표현",
    re: /최고|최상급|최저가|최저\s*가격|국내\s*유일|업계\s*유일|유일한|1\s*위|넘버\s*원|No\.?\s*1|BEST|베스트|최다|최초|압도적/i,
    severity: "error",
    appliesTo: "all",
    waivableByEvidence: true,
    message: "객관적 증빙 없이 사용할 수 없는 최상급 표현입니다.",
  },
  {
    id: "repeat-punct",
    name: "반복 문장부호",
    re: /([!?.])\1{1,}/,
    severity: "error",
    appliesTo: "all",
    message: "문장부호를 연속으로 사용할 수 없습니다.",
  },
  {
    id: "emoji",
    name: "이모지",
    re: /\p{Extended_Pictographic}/u,
    severity: "error",
    appliesTo: "all",
    message: "이모지는 사용할 수 없습니다.",
  },
  {
    id: "deco-symbol",
    name: "장식 기호",
    re: /[☆★○◇□△▲▽♡♥♧♣♨☏☞♬※◈●◆◎▶◀]/,
    severity: "error",
    appliesTo: ["kakao", "google"],
    message: "장식용 기호는 사용할 수 없습니다.",
  },
  {
    id: "emoticon",
    name: "이모티콘",
    re: /\^\^|ㅠㅠ|ㅜㅜ|ㅋㅋ|ㅎㅎ/,
    severity: "error",
    appliesTo: ["kakao", "naver"],
    message: "이모티콘은 사용할 수 없습니다.",
  },
  {
    id: "deco-asterisk",
    name: "장식 별표",
    re: /\*[^*]+\*/,
    severity: "error",
    appliesTo: ["naver", "google"],
    message: "별표로 문구를 감쌀 수 없습니다.",
  },
  {
    id: "all-caps",
    name: "전체 대문자",
    re: /\b[A-Z]{5,}\b/,
    severity: "warning",
    appliesTo: ["google"],
    message: "전체 대문자는 금지입니다. (통용 약어·쿠폰코드·브랜드명은 예외)",
  },
  {
    id: "alt-caps",
    name: "눈속임 대소문자",
    re: /\b[A-Za-z]*(?:[a-z][A-Z]){2,}[A-Za-z]*\b/,
    severity: "warning",
    appliesTo: ["google"],
    message: "대소문자를 교차해서 사용할 수 없습니다.",
  },
  {
    id: "punct-split",
    name: "구두점 분해",
    re: /\b(?:[A-Za-z]\.){3,}/,
    severity: "error",
    appliesTo: ["google"],
    message: "구두점으로 단어를 분해할 수 없습니다.",
  },
  {
    id: "symbol-swap",
    name: "문자 내 기호 치환",
    re: /[A-Za-z]+[@$!]+[A-Za-z]+/,
    severity: "error",
    appliesTo: ["google"],
    message: "문자를 기호로 치환할 수 없습니다.",
  },
  {
    id: "extra-space",
    name: "불필요한 공백",
    re: /\s{2,}/,
    severity: "warning",
    appliesTo: "all",
    message: "연속 공백은 눈속임 간격으로 반려될 수 있습니다.",
  },
];

/** 업종별 추가 심의 규칙 (가이드 §3-4) */
export const INDUSTRY_RULES: Record<string, ProhibitedRule[]> = {
  medical: [
    {
      id: "medical-guarantee",
      name: "의료 효과 보증 표현",
      re: /완치|부작용\s*없|100\s*%\s*(치료|성공|완치)|효과\s*보장/,
      severity: "error",
      appliesTo: "all",
      message: "의료광고 심의상 사용할 수 없는 표현입니다.",
    },
  ],
  healthfood: [
    {
      id: "healthfood-efficacy",
      name: "질병 효능 표현",
      re: /치료|완치|질병\s*예방|의약품|효능/,
      severity: "error",
      appliesTo: "all",
      message: "건강기능식품은 질병 예방·치료 효능 표현이 금지입니다.",
    },
  ],
  finance: [
    {
      id: "finance-guarantee",
      name: "금융 단정 표현",
      re: /무조건\s*승인|100\s*%\s*승인|누구나\s*대출|수익\s*보장/,
      severity: "error",
      appliesTo: "all",
      message: "금융광고는 단정적 승인·수익 보장 표현을 사용할 수 없습니다.",
    },
  ],
};

export interface CheckOptions {
  media: AdMediaKey;
  /** 업종 key (INDUSTRY_RULES 조회용) */
  industry?: string;
  /** 최상급 근거가 제출되었으면 superlative 규칙을 warning 으로 완화 */
  superlativeEvidence?: boolean;
  /** 브랜드 자체 금칙어 (D_표현제어.excludeWords) */
  excludeWords?: string[];
}

/** 정규식 메타문자 이스케이프 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 문구 1건의 금지표현 적발 목록 */
export function checkProhibited(
  text: string,
  opts: CheckOptions
): ProhibitedHit[] {
  const hits: ProhibitedHit[] = [];
  const rules = [
    ...PROHIBITED_RULES,
    ...(INDUSTRY_RULES[opts.industry ?? ""] ?? []),
  ];

  for (const rule of rules) {
    if (rule.appliesTo !== "all" && !rule.appliesTo.includes(opts.media)) {
      continue;
    }
    const m = text.match(rule.re);
    if (!m) continue;

    if (rule.waivableByEvidence && opts.superlativeEvidence) {
      hits.push({
        ruleId: rule.id,
        name: rule.name,
        matched: m[0],
        severity: "warning",
        message: `${rule.message} (근거 제출됨 — 랜딩페이지에도 근거가 노출되어야 합니다)`,
      });
      continue;
    }

    hits.push({
      ruleId: rule.id,
      name: rule.name,
      matched: m[0],
      severity: rule.severity,
      message: rule.message,
    });
  }

  for (const w of opts.excludeWords ?? []) {
    const t = w.trim();
    if (!t) continue;
    if (new RegExp(escapeRegExp(t), "i").test(text)) {
      hits.push({
        ruleId: `exclude:${t}`,
        name: "제외 금칙어",
        matched: t,
        severity: "error",
        message: `등록한 제외 단어 "${t}"가 포함되었습니다.`,
      });
    }
  }

  return hits;
}

/**
 * 중복 문구 index 집합.
 * 구글은 같은 광고그룹·캠페인·계정 내 애셋 간 중복 문구를 금지한다(가이드 §3-3).
 * 공백·기호를 제거하고 소문자로 정규화한 뒤 비교한다.
 */
export function findDuplicateIndexes(texts: string[]): Set<number> {
  const seen = new Map<string, number>();
  const dup = new Set<number>();
  texts.forEach((t, i) => {
    const key = t.replace(/[\s!?.,~·\-_]/g, "").toLowerCase();
    const first = seen.get(key);
    if (first === undefined) {
      seen.set(key, i);
    } else {
      dup.add(first);
      dup.add(i);
    }
  });
  return dup;
}
