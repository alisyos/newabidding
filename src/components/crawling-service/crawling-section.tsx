// 랜딩 섹션 공용 셸.
//
// 기존 도구 페이지의 "min-h-[calc(100vh-65px)] bg-muted/20 → container → 번호 Card" 셸은
// 입력→실행→결과 화면 문법이라 12섹션 세일즈 스크롤에는 맞지 않는다.
// 대신 풀블리드 섹션 + 톤 교차 구조를 쓰고, 공통 골격만 이 컴포넌트로 통일한다.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SectionTone } from "@/types/crawling-landing";

const TONE_CLASS: Record<SectionTone, string> = {
  default: "bg-white text-slate-900",
  muted: "bg-slate-50 text-slate-900",
  dark: "bg-slate-900 text-white",
};

interface CrawlingSectionProps {
  id: string;
  /** 제목 위 작은 라벨 */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  tone?: SectionTone;
  align?: "center" | "left";
  className?: string;
  children: ReactNode;
}

export function CrawlingSection({
  id,
  eyebrow,
  title,
  description,
  tone = "default",
  align = "center",
  className,
  children,
}: CrawlingSectionProps) {
  const dark = tone === "dark";

  return (
    <section
      id={id}
      // 헤더가 지금은 sticky 가 아니지만, 나중에 고정되어도 앵커가 가리지 않도록 여유를 둔다
      className={cn("scroll-mt-20 py-16 md:py-24", TONE_CLASS[tone], className)}
    >
      <div className="container mx-auto px-4">
        <div
          className={cn(
            "mb-10 max-w-3xl md:mb-14",
            align === "center" && "mx-auto text-center"
          )}
        >
          {eyebrow && (
            <p
              className={cn(
                "mb-3 text-sm font-medium",
                dark ? "text-blue-300" : "text-blue-600"
              )}
            >
              {eyebrow}
            </p>
          )}
          <h2 className="text-2xl font-bold leading-snug tracking-tight md:text-3xl">
            {title}
          </h2>
          {description && (
            <p
              className={cn(
                "mt-4 text-base leading-relaxed",
                dark ? "text-slate-300" : "text-slate-600"
              )}
            >
              {description}
            </p>
          )}
        </div>

        {children}
      </div>
    </section>
  );
}
