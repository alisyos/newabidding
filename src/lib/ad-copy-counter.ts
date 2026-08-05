// 매체별 글자수 카운터. 가이드 §2 (add/adcopy/검색광고_광고문구_가이드.md) 구현.
// 서버(보정 루프)와 클라이언트(검증 배지)가 동일 로직을 공유하므로 순수 함수만 둔다.
//
// 같은 "테스트문구"라도 네이버는 5자, 구글은 10카운트로 계산된다.

import type { AdFieldSpec, CounterMode, FieldMeasure, LengthStatus } from "@/types/ad-copy";

/** 네이버·카카오: 모든 문자 1카운트 (공백 포함, 서로게이트 페어 안전) */
export function countGrapheme1(str: string): number {
  return Array.from(str).length;
}

/** 구글: ASCII=1, 전각 CJK=2 */
export function countGoogleCjk2(str: string): number {
  let n = 0;
  // 코드포인트 단위 순회 — str[i] 인덱싱을 쓰면 서로게이트 페어가 깨진다
  for (const ch of str) {
    const cp = ch.codePointAt(0) ?? 0;
    const isCjk =
      (cp >= 0xac00 && cp <= 0xd7a3) || // 한글 음절
      (cp >= 0x1100 && cp <= 0x11ff) || // 한글 자모
      (cp >= 0x3130 && cp <= 0x318f) || // 한글 호환 자모
      (cp >= 0x4e00 && cp <= 0x9fff) || // CJK 통합한자
      (cp >= 0x3040 && cp <= 0x30ff) || // 히라가나/가타카나
      (cp >= 0xff00 && cp <= 0xff60); // 전각 영숫자/기호
    n += isCjk ? 2 : 1;
  }
  return n;
}

/** 카운팅 방식에 맞춰 글자수 계산 */
export function countByMode(str: string, mode: CounterMode): number {
  return mode === "GOOGLE_CJK_2" ? countGoogleCjk2(str) : countGrapheme1(str);
}

/**
 * 필드 스펙 기준 글자수 측정.
 * 네이버 설명(최소 20자)처럼 하한이 있는 필드는 under 도 판정한다.
 */
export function measureField(
  text: string,
  field: AdFieldSpec,
  mode: CounterMode
): FieldMeasure {
  const count = countByMode(text, mode);
  const status: LengthStatus =
    count > field.limit
      ? "over"
      : field.minLength !== undefined && count < field.minLength
        ? "under"
        : "ok";
  return { count, limit: field.limit, remaining: field.limit - count, status };
}

/** 카운팅 방식과 무관한 실제 글자수 (배지에 한글 실질 글자수를 병기할 때 사용) */
export function koCharCount(str: string): number {
  return countGrapheme1(str);
}
