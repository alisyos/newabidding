// S6 기술 대응력 · S7 진행 프로세스 · S8 도입 사례.
//
// "능력 증명" 단계 3섹션. 기획서 기준 이탈 사유 1위가 S6 구간의 자기 검열이므로
// 난이도를 먼저 인정한 뒤 해결책을 붙이는 2단 카드 구조를 유지한다.

import { CrawlingSection } from "@/components/crawling-service/crawling-section";
import {
  CASE_NOTE,
  CASE_STUDIES,
  PROCESS_NOTE,
  PROCESS_STEPS,
  TECH_CHALLENGES,
  TECH_HEADLINE,
} from "@/lib/crawling-landing";
import { cn } from "@/lib/utils";

/** S6 — 이런 것도 됩니다 */
export function CrawlingTechCapability() {
  return (
    <CrawlingSection
      id="tech"
      eyebrow="기술 대응력"
      title={TECH_HEADLINE}
      description="아래는 견적 문의를 망설이게 만드는 대표적인 다섯 가지입니다. 전부 저희가 매일 다루는 문제입니다."
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {TECH_CHALLENGES.map(({ title, icon: Icon, concern, solution }) => (
          <article
            key={title}
            className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            {/* 1단: 고객이 실제로 하는 말 */}
            <div className="border-b border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              </div>
              <p className="mt-3 text-sm italic leading-relaxed text-slate-500">
                &ldquo;{concern}&rdquo;
              </p>
            </div>

            {/* 2단: 해결책 */}
            <div className="p-5">
              <p className="text-sm leading-relaxed text-slate-700">{solution}</p>
            </div>
          </article>
        ))}
      </div>
    </CrawlingSection>
  );
}

/** S7 — 진행 프로세스 5단계. 무료 사전 기술검토가 리드 확보 장치다. */
export function CrawlingProcess() {
  return (
    <CrawlingSection
      id="process"
      tone="muted"
      eyebrow="진행 프로세스"
      title="상담부터 운영까지 5단계"
      description="준비하실 것은 사이트 주소와 필요한 항목뿐입니다."
    >
      <ol className="grid gap-4 md:grid-cols-5">
        {PROCESS_STEPS.map(({ step, title, detail, duration, highlight }) => (
          <li
            key={step}
            className={cn(
              "flex flex-col rounded-xl border bg-white p-5",
              highlight
                ? "border-blue-500 shadow-md ring-1 ring-blue-500/20"
                : "border-slate-200"
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full text-sm font-bold",
                  highlight
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                {step}
              </span>
              {highlight && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                  무료
                </span>
              )}
            </div>

            <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600">
              {detail}
            </p>
            <p className="mt-4 text-xs font-medium text-slate-400">{duration}</p>
          </li>
        ))}
      </ol>

      <p className="mx-auto mt-8 max-w-2xl rounded-lg bg-blue-50 p-4 text-center text-sm leading-relaxed text-blue-900">
        {PROCESS_NOTE}
      </p>
    </CrawlingSection>
  );
}

/** S8 — 도입 사례 3건. 타겟 3종에 1:1 대응한다. */
export function CrawlingCases() {
  return (
    <CrawlingSection
      id="cases"
      eyebrow="도입 사례"
      title="같은 문제를 이렇게 해결했습니다"
      description="타겟별로 한 건씩 정리했습니다. 상황이 비슷하다면 진행 방식도 크게 다르지 않습니다."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {CASE_STUDIES.map(
          ({ targetLabel, profile, icon: Icon, before, after, metrics, disclaimer }) => (
            <article
              key={targetLabel}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-blue-600" />
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {targetLabel}
                </span>
              </div>
              <p className="mt-3 text-sm font-bold text-slate-900">{profile}</p>

              <div className="mt-5 space-y-3">
                <div className="rounded-lg bg-rose-50 p-4">
                  <p className="text-xs font-bold text-rose-700">Before</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-rose-900">
                    {before}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-4">
                  <p className="text-xs font-bold text-emerald-700">After</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-emerald-900">
                    {after}
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-5">
                {metrics.map((metric) => (
                  <div key={metric.label} className="text-center">
                    <dt className="sr-only">{metric.label}</dt>
                    <dd>
                      <p className="text-sm font-bold tabular-nums text-slate-900">
                        {metric.value}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                        {metric.label}
                      </p>
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-auto pt-4 text-[10px] text-slate-400">
                {disclaimer}
              </p>
            </article>
          )
        )}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">{CASE_NOTE}</p>
    </CrawlingSection>
  );
}
