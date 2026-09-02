"use client";

// 앵커 이동 + 전환 이벤트 발화를 한 곳에서 처리한다.
//
// globals.css 에 html { scroll-behavior: smooth } 를 넣으면 전 페이지에 영향이 가므로
// 이 랜딩에서만 scrollIntoView 로 처리한다. href 는 그대로 남겨 두어
// JS 가 실패하거나 크롤러가 읽을 때도 앵커가 동작하게 했다.

import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  trackLandingEvent,
  type CrawlingLandingEvent,
} from "@/lib/crawling-analytics";

interface CrawlingAnchorLinkProps {
  targetId: string;
  /** 클릭 시 발화할 전환 이벤트 */
  event?: CrawlingLandingEvent;
  className?: string;
  /** 화면에서 숨겨진 상태일 때 키보드 포커스를 빼기 위해 -1 을 넘긴다 */
  tabIndex?: number;
  children: ReactNode;
}

export function CrawlingAnchorLink({
  targetId,
  event,
  className,
  tabIndex,
  children,
}: CrawlingAnchorLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(targetId);
    if (!target) return; // 대상이 없으면 기본 앵커 동작에 맡긴다

    e.preventDefault();
    if (event) trackLandingEvent(event);

    // 모션 최소화를 선호하는 사용자에게는 즉시 이동시킨다
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      tabIndex={tabIndex}
      className={cn(className)}
    >
      {children}
    </a>
  );
}
