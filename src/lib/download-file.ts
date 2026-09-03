// 브라우저 파일 다운로드 공용 헬퍼.
// CSV(text/csv)·워드 문서(application/msword) 등 MIME 이 다른 산출물이 늘어나서
// keyword-csv.ts 에 있던 downloadCsv 의 Blob 생성 부분만 여기로 분리했다.

/** 문자열 콘텐츠를 파일로 내려받는다. 브라우저에서만 호출할 것. */
export function downloadFile(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * base64 data URL(생성 이미지 등)을 파일로 내려받는다. 브라우저에서만 호출할 것.
 * downloadFile 은 문자열 콘텐츠 전용이라 바이너리를 받지 못한다.
 */
export function downloadDataUrl(filename: string, dataUrl: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 파일명에 쓸 수 없는 문자를 제거한다. (한글은 유지)
 * 공백은 언더스코어로 바꾼다.
 */
export function safeFileName(name: string): string {
  return (
    name
      .trim()
      // eslint-disable-next-line no-useless-escape
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 40) || "untitled"
  );
}
