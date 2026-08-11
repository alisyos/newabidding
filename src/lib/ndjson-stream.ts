// 개행 구분 JSON(NDJSON) 스트림 리더.
//
// 네이버 블로그 댓글 수집과 인스타 댓글 수집이 같은 전송 방식을 쓴다.
// 서버가 청크 하나를 보낼 때마다 연결이 살아 있음이 확인되어
// 서버리스 함수 타임아웃에 걸리지 않고 오래 수집할 수 있다.

/** 응답 본문이 없을 때(HEAD, 204 등) 던지는 오류 문구 */
const NO_BODY_MESSAGE = "서버 응답 본문이 비어 있습니다.";

export interface ReadNdjsonOptions {
  /**
   * JSON 파싱에 실패한 줄을 알린다.
   * 한 줄이 깨져도 스트림 전체를 중단하지 않는다 (다음 줄은 정상일 수 있다).
   */
  onParseError?: (line: string, error: unknown) => void;
}

/**
 * 응답 본문을 줄 단위로 읽어 청크마다 onChunk 를 호출한다.
 *
 * - 마지막 불완전한 줄은 버퍼에 남겼다가 다음 조각과 이어 붙인다.
 * - 스트림이 끝나면 버퍼에 남은 줄도 마저 처리한다.
 *   (서버가 마지막 개행을 빠뜨려도 청크를 잃지 않게 한다)
 */
export async function readNdjsonStream<TChunk>(
  response: Response,
  onChunk: (chunk: TChunk) => void,
  options: ReadNdjsonOptions = {}
): Promise<void> {
  if (!response.body) throw new Error(NO_BODY_MESSAGE);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      onChunk(JSON.parse(trimmed) as TChunk);
    } catch (error) {
      options.onParseError?.(trimmed, error);
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // 마지막 조각은 아직 완성되지 않았을 수 있다

      for (const line of lines) handleLine(line);
    }

    buffer += decoder.decode(); // 디코더에 남은 바이트 flush
    handleLine(buffer);
  } finally {
    reader.releaseLock();
  }
}
