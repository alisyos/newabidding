"use client";

import { useEffect, useState } from "react";

/**
 * 문서 전체 대비 스크롤 진행률(0~1)을 돌려준다.
 *
 * 랜딩페이지 모바일 고정 CTA(30% 이후 노출)와 scroll_50 / scroll_75 전환 이벤트가
 * 같은 값을 쓰므로 훅 하나로 묶어 스크롤 리스너 중복을 막는다.
 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      // 콘텐츠가 화면보다 짧으면 0으로 나누게 되므로 방어한다
      if (scrollable <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.min(1, Math.max(0, window.scrollY / scrollable)));
    };

    // rAF 스로틀 — 스크롤마다 레이아웃을 읽으면 프레임이 떨어진다
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    // 새로고침으로 중간 위치가 복원된 경우를 위해 마운트 직후 1회 계산한다
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return progress;
}
