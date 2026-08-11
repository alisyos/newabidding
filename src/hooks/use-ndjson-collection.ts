"use client";

// NDJSON 스트리밍 수집의 생명주기를 관리하는 훅.
//
// 청크를 어떻게 해석할지(누적/교체/진행률)는 화면마다 다르므로 onChunk 에 맡기고,
// 여기서는 공통 문제만 다룬다:
//   - 상태 전이 (idle → streaming → done/error)
//   - 중단(AbortController) 과 언마운트 정리
//   - "정확히 한 번" 호출되는 정산 지점 제공
//
// 포인트 차감을 onSettle 에 두는 이유: 스트림은 complete 청크로 끝날 수도 있고,
// error 청크·네트워크 끊김·사용자 중단으로 끝날 수도 있다. 차감 로직이 여러 갈래에
// 흩어지면 이중 차감이나 누락이 생긴다. 종료 경로를 하나로 모은다.

import { useCallback, useEffect, useRef, useState } from "react";
import { readNdjsonStream } from "@/lib/ndjson-stream";

export type CollectionRunStatus = "idle" | "streaming" | "done" | "error";

/** 스트림이 어떻게 끝났는지 */
export interface SettleOutcome {
  /** 사용자가 중단했거나 화면을 벗어났다 */
  aborted: boolean;
  /** 전송 계층 오류 (HTTP 4xx/5xx·네트워크). 도메인 오류는 onChunk 로 전달된다 */
  transportError: string | null;
}

interface UseNdjsonCollectionOptions<TChunk> {
  /** POST 엔드포인트 */
  url: string;
  /** 청크 1건 처리 */
  onChunk: (chunk: TChunk) => void;
  /** 요청 직전 1회 — 이전 결과 초기화용 */
  onStart?: () => void;
  /** 스트림이 어떤 이유로든 끝났을 때 정확히 1회 호출된다 */
  onSettle: (outcome: SettleOutcome) => void;
}

interface UseNdjsonCollectionResult<TBody> {
  status: CollectionRunStatus;
  /** 전송 계층 오류 메시지 */
  transportError: string | null;
  start: (body: TBody) => Promise<void>;
  /** 진행 중인 수집을 중단한다 */
  cancel: () => void;
}

export function useNdjsonCollection<TChunk, TBody>(
  options: UseNdjsonCollectionOptions<TChunk>
): UseNdjsonCollectionResult<TBody> {
  const [status, setStatus] = useState<CollectionRunStatus>("idle");
  const [transportError, setTransportError] = useState<string | null>(null);

  // 비동기 루프가 오래된 콜백을 읽지 않도록 매 렌더마다 최신값으로 갱신한다
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const abortRef = useRef<AbortController | null>(null);
  const settledRef = useRef(true);
  const unmountedRef = useRef(false);

  /** 언마운트 시 진행 중인 요청을 끊는다 (서버도 cancel() 로 크롤링을 멈춘다) */
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      abortRef.current?.abort();
    };
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const start = useCallback(async (body: TBody) => {
    // 이전 요청이 남아 있으면 정리하고 시작한다
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    settledRef.current = false;

    setStatus("streaming");
    setTransportError(null);
    optionsRef.current.onStart?.();

    let transportMessage: string | null = null;

    try {
      const response = await fetch(optionsRef.current.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        // 스트림 시작 전 실패는 호스트 공통 오류 형식으로 온다
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(
          payload?.error?.message ??
            `요청이 실패했습니다. (HTTP ${response.status})`
        );
      }

      await readNdjsonStream<TChunk>(response, (chunk) =>
        optionsRef.current.onChunk(chunk)
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        transportMessage =
          error instanceof Error
            ? error.message
            : "수집 중 알 수 없는 오류가 발생했습니다.";
      }
    } finally {
      // 이 start() 호출이 여전히 최신인 경우에만 상태를 건드린다
      const isCurrent = abortRef.current === controller;
      const aborted = controller.signal.aborted;

      // 언마운트로 끊긴 경우엔 정산도 상태 갱신도 하지 않는다.
      // (이미 떠난 화면의 수집 중단 토스트가 다음 페이지에 뜨는 것을 막는다)
      if (isCurrent && !settledRef.current && !unmountedRef.current) {
        settledRef.current = true;

        if (!aborted) {
          setTransportError(transportMessage);
          setStatus(transportMessage ? "error" : "done");
        } else {
          setStatus("error");
        }

        optionsRef.current.onSettle({
          aborted,
          transportError: transportMessage,
        });
      }
    }
  }, []);

  return { status, transportError, start, cancel };
}
