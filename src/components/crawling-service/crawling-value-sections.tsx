// S3 문제 공감 · S4 수집 가능 대상 · S5 결과물 형태.
//
// 설득 흐름상 "공감 → 무엇을 → 어떤 형태로" 한 묶음이고 셋 다 CrawlingSection + 그리드로
// 구조가 동형이라 한 파일에 두되, 컴포넌트 경계는 유지해 view 에서 개별 배치한다.

import { CrawlingSection } from "@/components/crawling-service/crawling-section";
import {
  DashboardMock,
  ExcelSheetMock,
  SlackAlertMock,
} from "@/components/crawling-service/crawling-result-preview";
import {
  OUTPUT_FORMATS,
  PAIN_POINTS,
  SOURCE_CATEGORIES,
  SOURCE_NOTE,
} from "@/lib/crawling-landing";

/** S3 — 타겟 3종 페인포인트. 각 카드가 광고 소재별 착지점 역할을 한다. */
export function CrawlingPainPoints() {
  return (
    <CrawlingSection
      id="pains"
      tone="muted"
      eyebrow="문제 공감"
      title="이런 상황이신가요"
      description="세 가지 중 하나라도 해당된다면, 지금 하고 계신 일의 대부분은 자동화할 수 있습니다."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {PAIN_POINTS.map(
          ({ id, targetLabel, title, icon: Icon, situation, realProblem, hook }) => (
            <article
              key={id}
              id={`pain-${id}`}
              className="scroll-mt-24 flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium text-blue-600">
                  {targetLabel}
                </span>
              </div>

              <h3 className="mt-4 text-base font-bold leading-snug text-slate-900">
                {title}
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {situation}
              </p>

              <p className="mt-3 border-l-2 border-slate-200 pl-3 text-sm leading-relaxed text-slate-500">
                {realProblem}
              </p>

              <p className="mt-auto pt-5 text-sm font-medium text-slate-900">
                {hook}
              </p>
            </article>
          )
        )}
      </div>
    </CrawlingSection>
  );
}

/** S4 — 수집 가능 대상 유형 그리드 */
export function CrawlingSources() {
  return (
    <CrawlingSection
      id="sources"
      eyebrow="수집 가능 대상"
      title="웹에 보이는 데이터라면 대부분 가능합니다"
      description="아래는 자주 의뢰받는 유형입니다. 사이트마다 구조가 달라 최종 판단은 실제 접속 후에 드립니다."
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {SOURCE_CATEGORIES.map(({ name, icon: Icon, examples }) => (
          <div
            key={name}
            className="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-blue-300"
          >
            <Icon className="h-6 w-6 text-blue-600" />
            <h3 className="mt-3 text-sm font-bold text-slate-900">{name}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              {examples}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">{SOURCE_NOTE}</p>
    </CrawlingSection>
  );
}

/** S5 — 결과물 형태 + 실제 산출물 목업 */
export function CrawlingOutputs() {
  return (
    <CrawlingSection
      id="outputs"
      tone="muted"
      eyebrow="결과물 형태"
      title="쓰시던 방식 그대로 받아보세요"
      description="수집이 끝이 아닙니다. 실제 업무에서 바로 쓸 수 있는 형태로 전달합니다."
    >
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <ul className="space-y-3">
          {OUTPUT_FORMATS.map(({ name, icon: Icon, description }) => (
            <li
              key={name}
              className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-4">
          <ExcelSheetMock />
          <SlackAlertMock />
          <DashboardMock />
        </div>
      </div>
    </CrawlingSection>
  );
}
