// 최종 소재 기획안 문서 빌더.
//
// docx 라이브러리를 새로 넣지 않기 위해 워드가 그대로 여는 HTML 문서를 만든다.
// (application/msword + .doc 확장자로 저장하면 한글 워드/한컴오피스에서 서식이 유지된다)
// 한글이 깨지지 않도록 뷰에서 BOM 을 붙여 내보낸다.

import { industryLabel } from "@/lib/ad-copy-spec";
import { mediaLabel, sortMedia } from "@/lib/creative-brief-spec";
import type {
  BriefSelection,
  CreativeBriefInput,
  CreativeBriefResult,
} from "@/types/creative-brief";

export interface BriefDocMeta {
  title: string;
  createdDate: string;
}

/** 사용자 입력이 그대로 마크업이 되지 않도록 이스케이프한다 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 줄바꿈까지 살린 본문 텍스트 */
function richText(value: string): string {
  const v = value.trim();
  if (!v) return '<span class="empty">—</span>';
  return escapeHtml(v).replace(/\n/g, "<br />");
}

/** 브리프 요약 표에 들어갈 행 목록 */
function briefRows(input: CreativeBriefInput, meta: BriefDocMeta): [string, string][] {
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

  return [
    ["광고주", input.advertiser],
    ["업종", industryLabel(input.industry)],
    ["브랜드/제품", input.productName],
    ["매체", sortMedia(input.media).map(mediaLabel).join(", ")],
    ["타깃", target],
    ["오디언스", input.audienceDescription],
    ["캠페인 목적", input.objective],
    ["톤앤매너", input.toneAndManner.join(", ")],
    ["핵심 메시지/USP", input.keyMessages.join(" / ")],
    ["작성일", meta.createdDate],
  ].filter(([, v]) => v.trim()) as [string, string][];
}

/**
 * 최종 소재 기획안 문서(HTML).
 * 선택·수정한 안을 본문에, 나머지 안은 부록에 담는다.
 */
export function buildCreativeBriefDoc(
  input: CreativeBriefInput,
  result: CreativeBriefResult,
  selection: BriefSelection,
  meta: BriefDocMeta
): string {
  const rows = briefRows(input, meta)
    .map(
      ([k, v]) =>
        `<tr><th>${escapeHtml(k)}</th><td>${richText(v)}</td></tr>`
    )
    .join("");

  const section = (heading: string, body: string) =>
    `<h2>${escapeHtml(heading)}</h2><div class="body">${body}</div>`;

  // 부록 — 선택하지 않은 대안
  const altList = (
    heading: string,
    items: { label: string; text: string }[]
  ): string => {
    if (items.length === 0) return "";
    const lis = items
      .map(
        (i) =>
          `<li><span class="alt-label">${escapeHtml(i.label)}</span> ${richText(i.text)}</li>`
      )
      .join("");
    return `<h3>${escapeHtml(heading)}</h3><ul class="alt">${lis}</ul>`;
  };

  const altHeadlines = result.headlines
    .map((h, i) => ({ i, h }))
    .filter(({ i }) => i !== selection.headlineIndex)
    .map(({ i, h }) => ({ label: `안 ${i + 1}`, text: h.text }));

  const altBodies = result.bodyCopies
    .map((b, i) => ({ i, b }))
    .filter(({ i }) => i !== selection.bodyIndex)
    .map(({ i, b }) => ({ label: `안 ${i + 1}`, text: b.text }));

  const altConcepts = result.concepts
    .map((c, i) => ({ i, c }))
    .filter(({ i }) => i !== selection.conceptIndex)
    .map(({ i, c }) => ({
      label: `안 ${i + 1} · ${c.name}`,
      text: `${c.direction}\n핵심 메시지: ${c.keyMessage}\n비주얼 디렉션: ${c.visualDirection}`,
    }));

  const appendix =
    altHeadlines.length + altBodies.length + altConcepts.length > 0
      ? `<h2>부록 — 검토한 대안</h2>
${altList("헤드라인", altHeadlines)}
${altList("바디카피", altBodies)}
${altList("콘셉트 방향", altConcepts)}`
      : "";

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(meta.title)}</title>
<style>
@page { size: A4; margin: 20mm; }
body { font-family: 'Pretendard', '맑은 고딕', 'Malgun Gothic', sans-serif; font-size: 11pt; line-height: 1.7; color: #1a1a1a; }
h1 { font-size: 20pt; margin: 0 0 4pt; border-bottom: 2px solid #1a1a1a; padding-bottom: 8pt; }
h2 { font-size: 13pt; margin: 22pt 0 6pt; padding-left: 8pt; border-left: 4px solid #1a1a1a; }
h3 { font-size: 11pt; margin: 14pt 0 4pt; color: #444; }
p.subtitle { margin: 6pt 0 18pt; color: #666; font-size: 9.5pt; }
table { border-collapse: collapse; width: 100%; margin-bottom: 8pt; }
th, td { border: 1px solid #cfcfcf; padding: 6pt 9pt; text-align: left; vertical-align: top; font-size: 10pt; }
th { width: 22%; background: #f2f2f2; font-weight: bold; }
div.body { padding: 2pt 0 0 12pt; }
span.empty { color: #999; }
ul.alt { margin: 0; padding-left: 20pt; }
ul.alt li { margin-bottom: 6pt; font-size: 10pt; color: #444; }
span.alt-label { font-weight: bold; color: #1a1a1a; }
</style>
</head>
<body>
<h1>${escapeHtml(meta.title)}</h1>
<p class="subtitle">작성일 ${escapeHtml(meta.createdDate)}${
    input.advertiser ? ` · ${escapeHtml(input.advertiser)}` : ""
  }</p>

<h2>1. 브리프 요약</h2>
<table>${rows}</table>

${section("2. 헤드라인", richText(selection.headlineText))}
${section("3. 바디카피", richText(selection.bodyText))}
${section(
  "4. 콘셉트 방향",
  `<p><strong>콘셉트명</strong> ${richText(selection.conceptName)}</p>
<p>${richText(selection.conceptDirection)}</p>
<p><strong>핵심 메시지</strong> ${richText(selection.conceptKeyMessage)}</p>`
)}
${section("5. 비주얼 디렉션", richText(selection.visualDirection))}
${selection.memo.trim() ? section("6. AE 메모", richText(selection.memo)) : ""}

${appendix}
</body>
</html>`;
}

/** 클립보드 복사용 평문 버전 */
export function buildCreativeBriefText(
  input: CreativeBriefInput,
  selection: BriefSelection,
  meta: BriefDocMeta
): string {
  const lines: string[] = [
    meta.title,
    `작성일 ${meta.createdDate}`,
    "",
    "[브리프 요약]",
    ...briefRows(input, meta).map(([k, v]) => `${k}: ${v}`),
    "",
    "[헤드라인]",
    selection.headlineText,
    "",
    "[바디카피]",
    selection.bodyText,
    "",
    "[콘셉트 방향]",
    `콘셉트명: ${selection.conceptName}`,
    selection.conceptDirection,
    `핵심 메시지: ${selection.conceptKeyMessage}`,
    "",
    "[비주얼 디렉션]",
    selection.visualDirection,
  ];

  if (selection.memo.trim()) {
    lines.push("", "[AE 메모]", selection.memo.trim());
  }

  return lines.join("\n");
}
