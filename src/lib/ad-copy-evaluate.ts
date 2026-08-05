// 생성 결과 검증 — 카운터(ad-copy-counter)와 필터(ad-copy-filter)를 묶어
// "문구 + 글자수 + 위반 + 중복" 형태의 파생 데이터를 만든다.
//
// 서버(API 라우트의 보정 루프)와 클라이언트(결과 배지)가 이 모듈을 함께 쓰므로
// 검증 로직의 단일 출처가 유지된다. 순수 함수만 두고 Node/브라우저 API를 쓰지 않는다.

import { measureField, koCharCount } from "@/lib/ad-copy-counter";
import { checkProhibited, findDuplicateIndexes } from "@/lib/ad-copy-filter";
import { MEDIA_SPECS } from "@/lib/ad-copy-spec";
import type {
  AdCopyGeneratedItem,
  AdCopyInput,
  AdCopyMediaResult,
  AdFieldKey,
  AdMediaKey,
  EvaluatedAdCopyItem,
  EvaluatedMediaResult,
} from "@/types/ad-copy";

const FIELD_KEYS: AdFieldKey[] = ["title", "description"];

/** 한 매체·한 필드의 문구 목록을 검증한다 */
function evaluateItems(
  items: AdCopyGeneratedItem[],
  media: AdMediaKey,
  field: AdFieldKey,
  input: AdCopyInput
): EvaluatedAdCopyItem[] {
  const spec = MEDIA_SPECS[media];
  const fieldSpec = spec.fields[field];
  const duplicates = findDuplicateIndexes(items.map((i) => i.text));

  return items.map((item, index) => {
    const measure = measureField(item.text, fieldSpec, spec.counter);
    const hits = checkProhibited(item.text, {
      media,
      industry: input.industry,
      superlativeEvidence:
        input.superlative.use && input.superlative.evidence.trim().length > 0,
      excludeWords: input.excludeWords,
    });
    const duplicate = duplicates.has(index);

    return {
      ...item,
      id: `${media}-${field}-${index}`,
      media,
      field,
      seq: index + 1,
      measure,
      koCount: koCharCount(item.text),
      hits,
      duplicate,
      hasError:
        measure.status !== "ok" ||
        duplicate ||
        hits.some((h) => h.severity === "error"),
    };
  });
}

/** 매체 1개 결과 검증 */
export function evaluateMediaResult(
  result: AdCopyMediaResult,
  input: AdCopyInput
): EvaluatedMediaResult {
  const titles = evaluateItems(result.titles, result.media, "title", input);
  const descriptions = evaluateItems(
    result.descriptions,
    result.media,
    "description",
    input
  );

  return {
    media: result.media,
    status: result.status,
    errorMessage: result.errorMessage,
    repaired: result.repaired,
    titles,
    descriptions,
    errorCount: [...titles, ...descriptions].filter((i) => i.hasError).length,
  };
}

/** 전체 응답 검증 */
export function evaluateResults(
  results: AdCopyMediaResult[],
  input: AdCopyInput
): EvaluatedMediaResult[] {
  return results.map((r) => evaluateMediaResult(r, input));
}

/** 매체 결과의 제목+설명을 순서대로 펼친다 */
export function flattenItems(
  result: EvaluatedMediaResult
): EvaluatedAdCopyItem[] {
  return [...result.titles, ...result.descriptions];
}

/** 위반 1건을 보정 프롬프트용 한 줄로 요약한다 */
export function describeViolation(item: EvaluatedAdCopyItem): string {
  const spec = MEDIA_SPECS[item.media];
  const fieldSpec = spec.fields[item.field];
  const reasons: string[] = [];

  if (item.measure.status === "over") {
    reasons.push(`글자수 초과(${item.measure.count}/${fieldSpec.limit})`);
  }
  if (item.measure.status === "under") {
    reasons.push(
      `글자수 미달(${item.measure.count}/최소 ${fieldSpec.minLength})`
    );
  }
  if (item.duplicate) reasons.push("다른 문구와 중복");
  for (const h of item.hits) {
    if (h.severity === "error") reasons.push(`${h.name}("${h.matched}")`);
  }

  return `- [${fieldSpec.label} ${item.seq}] "${item.text}" → 위반: ${reasons.join(", ")}`;
}

/**
 * 보정이 필요한 항목만 추린다 (error 등급만 — warning 은 재생성하지 않는다).
 * API 라우트의 1회 보정 루프에서 사용한다.
 */
export function collectViolations(
  result: AdCopyMediaResult,
  input: AdCopyInput
): EvaluatedAdCopyItem[] {
  const evaluated = evaluateMediaResult(result, input);
  return FIELD_KEYS.flatMap((f) =>
    (f === "title" ? evaluated.titles : evaluated.descriptions).filter(
      (i) => i.hasError
    )
  );
}
