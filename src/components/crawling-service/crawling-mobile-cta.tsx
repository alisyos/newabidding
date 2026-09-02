"use client";

// 모바일 하단 고정 CTA 바.
//
// 기획서 원칙상 주 CTA 는 S1·S10·S12 3곳뿐이고, 중간 섹션에 CTA 를 흩뿌리면
// "설득 전 요구"가 되어 전환율이 떨어진다. 모바일만 스크롤 30% 이후 고정 바를 붙인다.
//
// 이미 스크롤 진행률을 구독하고 있으므로 scroll_50 / scroll_75 이벤트도 여기서 함께
// 발화시켜 스크롤 리스너를 하나로 유지한다.

import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { CrawlingAnchorLink } from "@/components/crawling-service/crawling-anchor-link";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { trackLandingEventOnce } from "@/lib/crawling-analytics";
import { HERO_PRIMARY_CTA } from "@/lib/crawling-landing";
import { cn } from "@/lib/utils";

export function CrawlingMobileCta() {
  const progress = useScrollProgress();

  useEffect(() => {
    if (progress >= 0.75) {
      trackLandingEventOnce("scroll_50");
      trackLandingEventOnce("scroll_75");
    } else if (progress >= 0.5) {
      trackLandingEventOnce("scroll_50");
    }
  }, [progress]);

  // 문의 폼 근처에서는 숨긴다 — 폼 위에 겹쳐 입력을 방해하면 역효과다
  const visible = progress >= 0.3 && progress < 0.92;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur transition-transform duration-300 md:hidden",
        visible ? "translate-y-0" : "translate-y-full"
      )}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-xs leading-tight text-slate-600">
          <span className="font-medium text-slate-900">무료 사전 기술검토</span>
          <br />
          상담 후 진행하지 않으셔도 비용 없음
        </p>
        <CrawlingAnchorLink
          targetId="contact"
          event="hero_cta_click"
          tabIndex={visible ? undefined : -1}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500",
            !visible && "pointer-events-none"
          )}
        >
          {HERO_PRIMARY_CTA}
          <ArrowRight className="h-4 w-4" />
        </CrawlingAnchorLink>
      </div>
    </div>
  );
}
