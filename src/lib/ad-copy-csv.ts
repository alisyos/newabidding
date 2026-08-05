// 광고문구 생성 결과 → CSV 문자열.
// 인코딩·이스케이프 규칙은 keyword-csv.ts 와 동일하게 UTF-8 + BOM, \r\n 을 쓴다.

import { escapeCsvCell } from "@/lib/keyword-csv";
import { flattenItems } from "@/lib/ad-copy-evaluate";
import { MEDIA_SPECS, industryLabel } from "@/lib/ad-copy-spec";
import type { AdCopyInput, EvaluatedMediaResult } from "@/types/ad-copy";

const LENGTH_STATUS_LABEL: Record<string, string> = {
  ok: "정상",
  over: "초과",
  under: "미달",
};

export interface AdCopyCsvOptions {
  /** CSV 1행 제목 */
  title: string;
  /** 생성일 (YYYY.MM.DD) */
  createdDate: string;
  input: AdCopyInput;
  /** 선택된 항목만 내보낼 때의 id 집합. 비어 있으면 전체를 내보낸다. */
  selectedIds?: Set<string>;
}

/** 검증 완료 결과 → CSV 문자열 */
export function buildAdCopyCsv(
  results: EvaluatedMediaResult[],
  { title, createdDate, input, selectedIds }: AdCopyCsvOptions
): string {
  const rows: string[][] = [];

  rows.push([title]);
  rows.push([`생성일: ${createdDate}`]);
  rows.push([`업종: ${industryLabel(input.industry)}`]);
  rows.push([`타깃 키워드: ${input.targetKeywords.join(", ")}`]);
  rows.push([]);

  rows.push([
    "매체",
    "상품유형",
    "구분",
    "순번",
    "광고문구",
    "글자수",
    "한도",
    "카운팅",
    "길이상태",
    "중복",
    "경고",
    "소구축",
    "생성이유",
  ]);

  for (const result of results) {
    if (result.status === "error") continue;
    const spec = MEDIA_SPECS[result.media];

    for (const item of flattenItems(result)) {
      if (selectedIds && selectedIds.size > 0 && !selectedIds.has(item.id)) {
        continue;
      }
      const fieldSpec = spec.fields[item.field];
      rows.push([
        spec.shortName,
        spec.productName,
        fieldSpec.label,
        String(item.seq),
        item.text,
        String(item.measure.count),
        String(item.measure.limit),
        spec.counter === "GOOGLE_CJK_2" ? "한글 2카운트" : "1자 1카운트",
        LENGTH_STATUS_LABEL[item.measure.status] ?? item.measure.status,
        item.duplicate ? "중복" : "",
        item.hits.map((h) => `${h.name}("${h.matched}")`).join(" / "),
        item.angle,
        item.reason,
      ]);
    }
  }

  const body = rows.map((r) => r.map(escapeCsvCell).join(",")).join("\r\n");
  return `﻿${body}`; // BOM
}
