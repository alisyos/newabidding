// GPT 프롬프트 빌더. 가이드 §5의 원칙을 따른다.
// - 매체별 글자수·금지 표현 같은 고정 규칙은 시스템 프롬프트에 하드코딩
// - 업종·키워드·랜딩 URL·프로모션 등 가변 값만 유저 컨텍스트로 주입
// - few-shot 예시로 톤을 고정
//
// ★ 서버 전용 모듈이다. "use client" 컴포넌트에서 import 하지 말 것.

import { MEDIA_SPECS, industryLabel } from "@/lib/ad-copy-spec";
import type {
  AdCopyInput,
  AdMediaKey,
  AdVariantCount,
  EvaluatedAdCopyItem,
} from "@/types/ad-copy";
import { describeViolation } from "@/lib/ad-copy-evaluate";

/** 업종별 추가 심의 지시 (프롬프트 주입용) */
const INDUSTRY_INSTRUCTIONS: Record<string, string> = {
  medical:
    "- 의료광고 사전심의 대상이다. 치료 효과 보증, 완치, 부작용 없음 같은 표현을 쓰지 마라.",
  healthfood:
    "- 건강기능식품이다. 질병 예방·치료 효능을 암시하는 표현을 쓰지 마라.",
  finance:
    "- 금융 상품이다. 금리·수수료를 단정적으로 표기하지 말고, 무조건 승인·수익 보장 표현을 쓰지 마라.",
};

/** 매체별 few-shot 예시 — 규정을 지키면서 CTR 요소를 갖춘 소재 2개씩 */
const FEW_SHOTS: Record<AdMediaKey, string> = {
  naver: `제목 예: "무선이어폰 당일출고" / 이유: 타깃 키워드를 앞에 두고 배송 속도를 구체화
설명 예: "무선이어폰 전 모델 무료배송, 구매 후 1년 A/S까지 지금 확인해보세요." / 이유: 제목이 못 담은 A/S·배송 혜택을 보완하고 CTA로 마무리`,
  kakao: `제목 예: "노트북거치대 3만원대" / 이유: 키워드 + 가격대를 숫자로 제시
설명 예: "알루미늄 노트북거치대, 각도 6단 조절과 무료배송. 오늘 주문 시 당일 출고." / 이유: 소재 스펙과 긴급성을 함께 제시`,
  google: `제목 예: "홈트기구 30% 할인" / 이유: 한글 8자(16카운트)로 한도 내이며 키워드와 할인율을 함께 제시
설명 예: "홈트기구 전 품목 30% 할인, 무료 배송과 1년 품질보증. 지금 견적을 받아보세요." / 이유: 혜택·신뢰·CTA를 한 문장에 담고 다른 제목과 표현이 겹치지 않음`,
};

/** 매체별 시스템 프롬프트 — 규칙 고정 영역 */
export function buildSystemPrompt(media: AdMediaKey, input: AdCopyInput): string {
  const spec = MEDIA_SPECS[media];
  const title = spec.fields.title;
  const desc = spec.fields.description;

  const lengthLines = [
    `- ${spec.counterNote}`,
    `- ${title.label}: 한글 기준 최대 ${title.koEffective}자`,
    desc.minLength
      ? `- ${desc.label}: 한글 기준 ${desc.minLength}자 이상 ${desc.koEffective}자 이하`
      : `- ${desc.label}: 한글 기준 최대 ${desc.koEffective}자`,
  ];
  if (spec.counter === "GOOGLE_CJK_2") {
    lengthLines.push(
      `- 총 카운트는 ${title.label} ${title.limit}, ${desc.label} ${desc.limit}을 넘길 수 없다. 영문·숫자·공백은 1, 한글은 2로 계산된다.`
    );
  }

  const superlativeLine =
    input.superlative.use && input.superlative.evidence.trim()
      ? `- 최상급/배타성 표현(최고, 1위, 최저, 유일, No.1, Best)은 원칙적으로 금지다. 단, 제출된 근거 "${input.superlative.evidence.trim()}"에 해당하는 내용만 전체 문구 중 1회 사용할 수 있다.`
      : "- 최상급/배타성 표현(최고, 1위, 최저, 유일, 국내유일, No.1, Best)을 사용하지 마라. 객관적 증빙이 없으면 반려된다.";

  const industryLine = INDUSTRY_INSTRUCTIONS[input.industry];

  return [
    `너는 ${spec.displayName}(${spec.productName}) 검색광고 카피라이터다. 모든 문구는 한국어로 작성한다.`,
    "",
    "[글자수 규칙 — 가장 중요]",
    ...lengthLines,
    "",
    "[금지 규칙]",
    superlativeLine,
    "- 허위·과장, 부분 사실의 전체화, 경쟁사 비교·비방, 비속어·혐오·차별 표현을 쓰지 마라.",
    `- ${spec.specialCharRule}`,
    "- 랜딩페이지에 없는 혜택을 만들어내지 마라. 입력된 정보 범위 안에서만 작성한다.",
    "- 생성한 문구끼리 표현이 겹치지 않게 하라. 같은 문장 구조를 반복하지 마라.",
    "- 맞춤법과 띄어쓰기를 정확히 지켜라.",
    ...(industryLine ? [industryLine] : []),
    "",
    "[작성 원칙]",
    "- 제목 앞부분에 타깃 키워드를 그대로 포함한다. (검색어와 일치할수록 관련성이 높게 인식된다)",
    '- "저렴한 가격" 대신 "30% 할인", "빠른 배송" 대신 "당일 출고"처럼 구체적 숫자를 쓴다.',
    '- "지금 상담 신청", "무료 견적 받기"처럼 명확한 행동 유도(CTA)를 포함한다.',
    "- 설명은 제목이 다루지 못한 차별점(품질보증·배송·A/S·신뢰 요소)을 보완한다.",
    diversityInstruction(input.diversityLevel),
    "",
    "[예시]",
    FEW_SHOTS[media],
    "",
    "[출력]",
    "지정된 JSON 스키마에 맞춰 출력한다. reason 은 '왜 이 문구인지'를 한 문장으로 쓴다.",
  ].join("\n");
}

/** 값이 있는 항목만 "라벨: 값" 라인으로 만든다 */
function line(label: string, value: string | undefined | null): string | null {
  const v = (value ?? "").trim();
  return v ? `${label}: ${v}` : null;
}

/** 가변 입력값을 담는 유저 프롬프트 */
export function buildUserPrompt(
  media: AdMediaKey,
  input: AdCopyInput,
  counts: AdVariantCount
): string {
  const spec = MEDIA_SPECS[media];

  const promo = [
    input.promotion.discountRate.trim() &&
      `할인 ${input.promotion.discountRate.trim()}`,
    input.promotion.period.trim() && `기간 ${input.promotion.period.trim()}`,
    input.promotion.event.trim() && `이벤트 ${input.promotion.event.trim()}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const price = [
    input.price.itemName.trim(),
    input.price.amount.trim(),
    input.price.qualifier.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const audience = [
    input.targetAudience.gender.trim(),
    input.targetAudience.ageRange.trim(),
    input.targetAudience.interests.trim(),
  ]
    .filter(Boolean)
    .join(" / ");

  const lines = [
    line("업종", industryLabel(input.industry)),
    line("브랜드/상호명", input.brandName),
    line("제품/서비스명", input.productName),
    line("랜딩 URL", input.landingUrl),
    line("타깃 키워드", input.targetKeywords.join(", ")),
    line("핵심 혜택", input.keyBenefits.join(" / ")),
    line("차별점", input.usp),
    line("프로모션", promo),
    line("가격 정보", price),
    line("타깃 고객", audience),
    line("행동유도", input.cta),
    line("톤앤매너", input.toneAndManner),
    line("반드시 포함할 문구", input.mustInclude.join(", ")),
    line("사용 금지 단어", input.excludeWords.join(", ")),
    line("심의필 번호", input.reviewNumber),
  ].filter((l): l is string => l !== null);

  return [
    ...lines,
    "",
    `요청: ${spec.fields.title.label} ${counts.titles}개, ${spec.fields.description.label} ${counts.descriptions}개를 서로 겹치지 않게 생성하라.`,
  ].join("\n");
}

/** 위반 항목만 지적해 재작성시키는 보정 프롬프트 */
export function buildRepairPrompt(
  media: AdMediaKey,
  input: AdCopyInput,
  counts: AdVariantCount,
  violations: EvaluatedAdCopyItem[]
): string {
  return [
    buildUserPrompt(media, input, counts),
    "",
    "직전 결과 중 아래 항목이 규칙을 위반했다. 같은 개수·같은 순서로 전체를 다시 출력하되,",
    "지적된 항목만 규칙에 맞게 고쳐 쓰고 나머지는 그대로 유지하라.",
    "",
    ...violations.map(describeViolation),
  ].join("\n");
}

/**
 * 변형 다양성 → 시스템 프롬프트 지시문.
 *
 * 추론 모델(gpt-5 계열)은 temperature 를 받지 않으므로 샘플링 파라미터 대신
 * 문장으로 다양성을 통제한다. 모델 종류와 무관하게 동작한다.
 */
export function diversityInstruction(
  level: AdCopyInput["diversityLevel"]
): string {
  if (level === "보수적") {
    return "- 검증된 표현 위주로 안정적으로 작성한다. 소구축은 혜택·신뢰에 집중하고 실험적인 표현은 피한다.";
  }
  if (level === "실험적") {
    return "- 각 문구를 서로 최대한 다른 각도로 작성한다. 문장 구조·어순·소구축을 모두 다르게 하고, 규정을 지키는 선에서 과감한 표현을 시도한다.";
  }
  return "- 각 문구는 혜택/가격/신뢰/긴급성/브랜드 소구축을 고르게 분배하되, 문장 구조가 반복되지 않게 한다.";
}
