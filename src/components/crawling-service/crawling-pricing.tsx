// S10 요금 3패키지 + 2차 CTA.
//
// 구간형("~부터") 노출 전략이다. 세 타겟 모두 예산 승인이 필요한 실무자라
// 가격이 없으면 내부 보고서를 쓸 수 없어 문의 자체를 미룬다.
// 단, PRICING_NOTICE 를 반드시 함께 노출해야 표기 금액이 상한선으로 굳지 않는다.

import { Check } from "lucide-react";
import { CrawlingAnchorLink } from "@/components/crawling-service/crawling-anchor-link";
import { CrawlingSection } from "@/components/crawling-service/crawling-section";
import { CrawlingViewTracker } from "@/components/crawling-service/crawling-view-tracker";
import {
  PRICING_CTA,
  PRICING_NOTICE,
  PRICING_PACKAGES,
} from "@/lib/crawling-landing";
import { cn } from "@/lib/utils";

export function CrawlingPricing() {
  return (
    <CrawlingSection
      id="pricing"
      tone="muted"
      eyebrow="요금 안내"
      title="필요한 만큼만 시작하세요"
      description="한 번만 받아보실지, 계속 돌릴지에 따라 구성이 달라집니다."
    >
      {/* 3초 이상 노출되면 pricing_view 발화 */}
      <CrawlingViewTracker event="pricing_view" delayMs={3000} />

      <div className="grid gap-6 md:grid-cols-3">
        {PRICING_PACKAGES.map(
          ({ name, subtitle, price, priceNote, target, features, featured }) => (
            <article
              key={name}
              className={cn(
                "relative flex flex-col rounded-xl border bg-white p-6",
                featured
                  ? "border-blue-600 shadow-lg ring-1 ring-blue-600/20 md:-mt-3 md:mb-3"
                  : "border-slate-200"
              )}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                  가장 많이 선택
                </span>
              )}

              <h3 className="text-lg font-bold text-slate-900">{name}</h3>
              <p className="mt-1 text-xs text-slate-500">{subtitle}</p>

              <p className="mt-5">
                <span className="text-3xl font-bold tabular-nums text-slate-900">
                  {price}
                </span>
                <span className="ml-1 text-sm text-slate-500">{priceNote}</span>
              </p>

              <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
                {target}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        featured ? "text-blue-600" : "text-slate-400"
                      )}
                    />
                    <span className="text-sm leading-relaxed text-slate-700">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <CrawlingAnchorLink
                targetId="contact"
                className={cn(
                  "mt-7 inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                  featured
                    ? "bg-blue-600 text-white hover:bg-blue-500"
                    : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                )}
              >
                {PRICING_CTA}
              </CrawlingAnchorLink>
            </article>
          )
        )}
      </div>

      {/* 기획서 필수 병기 — 단가 방어 장치 */}
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-slate-500">
        {PRICING_NOTICE}
      </p>
    </CrawlingSection>
  );
}
