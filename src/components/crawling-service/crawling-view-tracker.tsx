"use client";

// 화면에 아무것도 그리지 않는 노출 측정용 센티널.
//
// 요금 섹션(S10)에 이 한 줄만 심으면 섹션 자체를 클라이언트 컴포넌트로 만들지 않고도
// "3초 노출" 기준의 pricing_view 를 잴 수 있다.

import { useEffect, useRef } from "react";
import {
  trackLandingEventOnce,
  type CrawlingLandingEvent,
} from "@/lib/crawling-analytics";

interface CrawlingViewTrackerProps {
  event: CrawlingLandingEvent;
  /** 이 시간만큼 계속 보이고 있어야 발화한다 */
  delayMs?: number;
}

export function CrawlingViewTracker({
  event,
  delayMs = 3000,
}: CrawlingViewTrackerProps) {
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = anchorRef.current;
    if (!node) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => {
            trackLandingEventOnce(event);
            observer.disconnect();
          }, delayMs);
        } else if (timer) {
          // 3초를 채우기 전에 지나쳐 갔다면 노출로 치지 않는다
          clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);

    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [event, delayMs]);

  return <div ref={anchorRef} aria-hidden className="h-px w-full" />;
}
