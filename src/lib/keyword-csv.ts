// example.csv 와 동일한 구조의 CSV 문자열을 생성/다운로드한다.
// 인코딩: 브라우저 제약상 UTF-8 + BOM 으로 내보낸다(엑셀에서 한글 정상 표시).

import type { Channel, KeywordResult, Metrics } from "@/types/keyword";
import { channelKeys } from "@/lib/channels";
import { downloadFile } from "@/lib/download-file";

/** 천단위 콤마 포맷 */
export function formatNumber(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** CTR 포맷 (x.xx %) */
export function formatCtr(n: number): string {
  return `${n.toFixed(2)} %`;
}

/** CSV 셀 이스케이프 — 콤마/따옴표/개행 포함 시 큰따옴표로 감싼다 */
function cell(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function metricCells(m: Metrics): string[] {
  return [
    formatNumber(m.impressions),
    formatNumber(m.clicks),
    formatCtr(m.ctr),
    formatNumber(m.cpc),
    formatNumber(m.cost),
  ];
}

export interface CsvOptions {
  /** CSV 1행 제목 (예: 쇼핑몰 키워드 확장) */
  title: string;
  channels: Channel[];
}

/** 결과 → example.csv 구조의 CSV 문자열 */
export function buildCsv(
  results: KeywordResult[],
  createdDate: string,
  { title, channels }: CsvOptions
): string {
  const rows: string[][] = [];
  const emptyN = (n: number) => Array(n).fill("");
  const keys = channelKeys(channels);
  // 매체 그룹은 첫 칸이 그룹명이므로 나머지 칸을 공백으로 채운다
  const channelPad = channels.length - 1;

  // 1행 제목, 2행 생성일, 3행 공백
  rows.push([title]);
  rows.push([`생성일: ${createdDate}`]);
  rows.push([]);

  // 4행: 그룹 헤더
  rows.push([
    "키워드",
    "연관 키워드",
    "자동 완성 검색어",
    ...emptyN(channelPad),
    "연관 키워드",
    ...emptyN(channelPad),
    "목표 순위",
    "PC",
    ...emptyN(4),
    "모바일",
    ...emptyN(4),
  ]);

  // 5행: 서브 헤더
  const channelLabels = channels.map((c) => c.label);
  const metricHeaders = [
    "예상 노출수",
    "예상 클릭수",
    "예상 CTR",
    "예상 CPC",
    "예상 광고비",
  ];
  rows.push([
    "",
    "",
    ...channelLabels,
    ...channelLabels,
    "",
    ...metricHeaders,
    ...metricHeaders,
  ]);

  // 데이터 행
  results.forEach((result) => {
    result.terms.forEach((term) => {
      rows.push([
        result.keyword,
        term.term,
        ...keys.map((k) => (term.autocomplete[k] ? "O" : "X")),
        ...keys.map((k) => (term.related[k] ? "O" : "X")),
        String(result.targetRank),
        ...metricCells(term.pc),
        ...metricCells(term.mobile),
      ]);
    });
  });

  const body = rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return `﻿${body}`; // BOM
}

/** 양식(템플릿) CSV — 키워드/목표순위 2열 */
export function buildTemplateCsv(): string {
  const rows = [
    ["키워드", "목표순위"],
    ["삼성갤럭시", "1"],
    ["무선이어폰", "1"],
    ["노트북거치대", "3"],
  ];
  const body = rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return `﻿${body}`;
}

export { cell as escapeCsvCell };

/** CSV 문자열을 파일로 다운로드 (Blob 처리는 download-file.ts 공용 헬퍼에 위임) */
export function downloadCsv(filename: string, csv: string): void {
  downloadFile(filename, csv, "text/csv;charset=utf-8;");
}
