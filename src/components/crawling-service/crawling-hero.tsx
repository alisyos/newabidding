// S1 히어로 + S2 신뢰 바.
//
// 둘 다 첫 화면 블록이고 다크 톤을 공유하므로 한 파일에 둔다.
// "헤드라인 → 숫자 증거" 가 한 시선에 들어오게 이어 붙였다.
//
// 다크 배경 위에서는 Card·Button 의 라이트 전용 CSS 변수가 흰 박스로 튀므로
// 이 파일에서는 raw Tailwind 클래스로 직접 스타일을 준다.

import { ArrowRight } from "lucide-react";
import { CrawlingAnchorLink } from "@/components/crawling-service/crawling-anchor-link";
import { ExcelSheetMock } from "@/components/crawling-service/crawling-result-preview";
import {
  CLIENT_PLACEHOLDERS,
  CLIENT_PLACEHOLDER_NOTE,
  HERO_BADGES,
  HERO_HEADLINE,
  HERO_PRIMARY_CTA,
  HERO_SECONDARY_CTA,
  HERO_SUBCOPY,
  POSITIONING,
  TRUST_STATS,
} from "@/lib/crawling-landing";

export function CrawlingHero() {
  return (
    <>
      <section id="hero" className="scroll-mt-20 bg-slate-900 text-white">
        <div className="container mx-auto grid items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2 lg:gap-16">
          {/* 좌: 카피 + CTA */}
          <div>
            <p className="mb-5 inline-flex items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
              맞춤형 크롤링 개발 · 운영 대행
            </p>

            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">
              {HERO_HEADLINE[0]}
              <br />
              {HERO_HEADLINE[1]}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
              {HERO_SUBCOPY}
            </p>

            {/* 신뢰 배지 3종 */}
            <ul className="mt-7 flex flex-wrap gap-2">
              {HERO_BADGES.map(({ label, icon: Icon }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200"
                >
                  <Icon className="h-3.5 w-3.5 text-blue-300" />
                  {label}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <CrawlingAnchorLink
                targetId="contact"
                event="hero_cta_click"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-blue-600 px-7 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                {HERO_PRIMARY_CTA}
                <ArrowRight className="h-4 w-4" />
              </CrawlingAnchorLink>

              <CrawlingAnchorLink
                targetId="cases"
                className="text-sm text-slate-300 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {HERO_SECONDARY_CTA}
              </CrawlingAnchorLink>
            </div>

            {/* 포지셔닝 문장 */}
            <div className="mt-10 border-l-2 border-blue-500 pl-4">
              <p className="text-sm text-slate-400">
                {POSITIONING.lead}{" "}
                <span className="font-medium text-white">
                  {POSITIONING.emphasis}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">{POSITIONING.detail}</p>
            </div>
          </div>

          {/* 우: 실제 산출물 (추상 일러스트 대신 결과물 자체를 보여준다) */}
          <div className="lg:pl-4">
            <div className="rotate-1 transition-transform duration-300 hover:rotate-0">
              <ExcelSheetMock />
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">
              실제 전달되는 산출물 예시 — 컬럼 구성은 요청에 맞춰 조정합니다.
            </p>
          </div>
        </div>
      </section>

      {/* S2 신뢰 바 */}
      <section id="trust" className="scroll-mt-20 border-b bg-white py-10">
        <div className="container mx-auto px-4">
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {TRUST_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <p className="text-3xl font-bold tabular-nums text-slate-900">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
                </dd>
              </div>
            ))}
          </dl>

          {/* 로고 사용 동의 확보 전이므로 업종 표기로 대체한다 */}
          <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {CLIENT_PLACEHOLDERS.map((name) => (
              <li
                key={name}
                className="grid h-10 place-items-center rounded-md bg-slate-100 px-2 text-center text-xs text-slate-400"
              >
                {name}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center text-xs text-slate-400">
            {CLIENT_PLACEHOLDER_NOTE}
          </p>
        </div>
      </section>
    </>
  );
}
