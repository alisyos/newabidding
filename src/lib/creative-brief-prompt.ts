// 광고 소재 기획 프롬프트 빌더.
// - 산출물 정의·톤 지시문·매체 특성 같은 고정 규칙은 시스템 프롬프트에 둔다
// - 광고주·타깃·참조 자료 등 가변 값만 유저 컨텍스트로 주입한다
//
// ★ 서버 전용 모듈이다. "use client" 컴포넌트에서 import 하지 말 것.

import { industryLabel } from "@/lib/ad-copy-spec";
import {
  CREATIVE_MEDIA,
  OBJECTIVE_INSTRUCTIONS,
  TONE_INSTRUCTIONS,
  sortMedia,
} from "@/lib/creative-brief-spec";
import type { CreativeBriefInput } from "@/types/creative-brief";

/** 톤앤매너별 구체 지시문. 목록에 없는 값이면 톤 이름만 전달한다. */
export function toneInstruction(tone: string): string {
  return TONE_INSTRUCTIONS[tone] ?? `${tone} — 이 톤의 어휘와 리듬을 유지한다.`;
}

/** 고정 규칙 영역 */
export function buildSystemPrompt(input: CreativeBriefInput): string {
  const media = sortMedia(input.media);
  const mediaLines = media.map((k) => `- ${CREATIVE_MEDIA[k].label}: ${CREATIVE_MEDIA[k].hint}`);

  const toneLines = input.toneAndManner
    .filter((t) => t.trim())
    .map((t) => `- ${toneInstruction(t)}`);

  const excludeLine =
    input.excludeWords.length > 0
      ? `- 다음 단어·표현은 어떤 산출물에도 쓰지 마라: ${input.excludeWords.join(", ")}`
      : null;
  const mustLine =
    input.mustInclude.length > 0
      ? `- 다음 문구는 헤드라인 또는 바디카피 중 최소 한 곳에 자연스럽게 포함해라: ${input.mustInclude.join(", ")}`
      : null;

  return [
    "너는 15년 경력의 광고대행사 크리에이티브 디렉터 겸 카피라이터다.",
    "AE가 준 브리프를 읽고 소재 기획안 초안을 만든다. 모든 산출물은 한국어로 작성한다.",
    "",
    "[산출물 정의]",
    "- 헤드라인: 소재에서 가장 먼저 읽히는 한 줄. 40자 이내. 설명이 아니라 시선을 멈추게 하는 문장이어야 한다.",
    "- 바디카피: 헤드라인을 뒷받침하는 1~3문장. 120자 이내. 헤드라인이 던진 것을 구체적 편익과 근거로 받아낸다.",
    "- 콘셉트 방향: 이 캠페인이 무엇을 말하는 캠페인인지 정의하는 전략적 축. 콘셉트명(8자 내외), 방향 설명(2~3문장), 핵심 메시지 한 줄로 구성한다.",
    "- 비주얼 디렉션: 콘셉트를 화면으로 옮기기 위한 지시. 장면·피사체·모델·색감·카메라 앵글·자막 처리 중 최소 4가지를 구체적으로 적는다. '감성적으로' 같은 추상어만 쓰지 마라.",
    "",
    "[톤앤매너 지침]",
    ...(toneLines.length > 0 ? toneLines : ["- 지정된 톤이 없다. 업종과 타깃에 가장 자연스러운 톤을 골라 일관되게 유지해라."]),
    "",
    "[캠페인 목적]",
    `- ${OBJECTIVE_INSTRUCTIONS[input.objective] ?? input.objective}`,
    "",
    "[매체 특성]",
    ...(mediaLines.length > 0 ? mediaLines : ["- 매체 미지정. 범용 소재로 작성해라."]),
    "",
    "[다양성 규칙]",
    "- 헤드라인 각 안은 서로 다른 소구축을 써라. (감성 공감 / 기능·편익 / 사회적 증거·신뢰 / 호기심·질문 / 대비·반전 중 선택)",
    "- 바디카피 각 안도 서로 다른 전개 방식을 써라. (장면 묘사 / 근거 나열 / 질문 후 답 / 사용자 화법)",
    "- 콘셉트 방향 각 안은 서로 다른 전략적 축이어야 한다. 표현만 바꾼 같은 콘셉트를 두 개 내지 마라.",
    "- 안끼리 같은 표현이나 같은 문장 구조를 반복하지 마라.",
    "",
    "[금지 규칙]",
    "- 객관적 근거 없는 최상급 표현(최고, 1위, 유일, No.1)을 쓰지 마라.",
    "- 확인되지 않은 수치·효능·수상 이력을 지어내지 마라. 브리프에 없는 사실은 만들지 않는다.",
    "- 경쟁사를 비방하거나 특정 집단을 비하하지 마라.",
    ...(excludeLine ? [excludeLine] : []),
    ...(mustLine ? [mustLine] : []),
    "",
    "[출력]",
    "- 지정된 JSON 스키마로만 답한다. 스키마 밖의 설명 문장을 덧붙이지 마라.",
    "- reason 에는 그 안을 낸 전략적 이유를 한 문장으로 적는다. 문구를 그대로 반복하지 마라.",
    "- tone 에는 그 안에 실제로 적용한 톤을 한 단어로 적는다.",
  ].join("\n");
}

/** `라벨: 값` 한 줄 (값이 비면 생략) */
function line(label: string, value: string | undefined | null): string | null {
  const v = (value ?? "").trim();
  return v ? `${label}: ${v}` : null;
}

/** 가변 컨텍스트 영역 */
export function buildUserPrompt(input: CreativeBriefInput): string {
  const media = sortMedia(input.media).map((k) => CREATIVE_MEDIA[k].label);
  const target = [
    input.targetAudience.ageRange,
    input.targetAudience.gender && input.targetAudience.gender !== "무관"
      ? input.targetAudience.gender
      : "",
    input.targetAudience.interests,
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ");

  const briefLines = [
    line("광고주", input.advertiser),
    line("업종", industryLabel(input.industry)),
    line("브랜드/제품", input.productName),
    line("매체", media.join(", ")),
    line("타깃", target),
    line("오디언스", input.audienceDescription),
    line("캠페인 목적", input.objective),
    line("톤앤매너", input.toneAndManner.join(", ")),
    line("핵심 메시지/USP", input.keyMessages.join(" / ")),
    line("필수 포함 문구", input.mustInclude.join(", ")),
    line("사용 금지어", input.excludeWords.join(", ")),
  ].filter(Boolean) as string[];

  const blocks: string[] = ["[브리프]", ...briefLines];

  const ref = input.referencePlan.trim();
  if (ref) {
    blocks.push(
      "",
      "[참조 — 동일 업종 과거 소재 기획안]",
      "아래 자료는 톤과 구조를 참고하기 위한 것이다. 문구를 그대로 복제하지 말고, 접근 방식만 참고해 새로 써라.",
      ref
    );
  }

  const guide = input.copyGuide.trim();
  if (guide) {
    blocks.push(
      "",
      "[참조 — 브랜드 카피 가이드]",
      "아래 가이드의 어휘 규칙과 금지 표현은 반드시 지켜라.",
      guide
    );
  }

  const { headlines, bodyCopies, concepts } = input.variantCount;
  blocks.push(
    "",
    `요청: 헤드라인 ${headlines}안, 바디카피 ${bodyCopies}안, 콘셉트 방향 ${concepts}안(각각 비주얼 디렉션 포함)을 서로 겹치지 않게 생성하라.`
  );

  return blocks.join("\n");
}
