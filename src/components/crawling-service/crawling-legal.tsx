// S9 법적 안전성 — 이 페이지의 최대 차별화 지점.
//
// 국내 경쟁사 랜딩이 거의 다루지 않는 영역이라 단독 섹션으로 정면 배치한다.
// 면책 문구는 기획서에서 필수 병기로 지정한 항목이므로 삭제하면 안 된다.
// 법무 검토로 자주 수정될 섹션이라 단독 파일로 분리했다.

import { AlertTriangle, Check } from "lucide-react";
import { CrawlingSection } from "@/components/crawling-service/crawling-section";
import {
  LEGAL_CHECKS,
  LEGAL_CRITERIA,
  LEGAL_CRITERIA_NOTE,
  LEGAL_DISCLAIMER,
  LEGAL_HEADLINE,
  LEGAL_PRINCIPLES,
  LEGAL_SUBCOPY,
} from "@/lib/crawling-landing";

export function CrawlingLegal() {
  return (
    <CrawlingSection
      id="legal"
      tone="dark"
      eyebrow="법적 안전성"
      title={LEGAL_HEADLINE}
      description={LEGAL_SUBCOPY}
    >
      {/* 착수 전 체크 4항목 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {LEGAL_CHECKS.map(({ title, detail, icon: Icon }) => (
          <div
            key={title}
            className="rounded-xl border border-white/10 bg-white/5 p-5"
          >
            <Icon className="h-5 w-5 text-blue-300" />
            <h3 className="mt-3 text-sm font-bold text-white">{title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {detail}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* 판례 기준 */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-sm font-bold text-white">판례가 나누는 기준</h3>
          <p className="mt-2 text-xs text-slate-400">
            대법원은 아래 세 가지를 나눠서 판단합니다.
          </p>
          <ol className="mt-4 space-y-3">
            {LEGAL_CRITERIA.map((criterion, index) => (
              <li key={criterion} className="flex gap-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">
                  {index + 1}
                </span>
                <span className="text-sm leading-relaxed text-slate-200">
                  {criterion}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-relaxed text-slate-400">
            {LEGAL_CRITERIA_NOTE}
          </p>
        </div>

        {/* 운영 원칙 */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-sm font-bold text-white">저희 운영 원칙</h3>
          <ul className="mt-4 space-y-3">
            {LEGAL_PRINCIPLES.map((principle) => (
              <li key={principle} className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-sm leading-relaxed text-slate-200">
                  {principle}
                </span>
              </li>
            ))}
          </ul>

          {/* 기획서 필수 병기 — 수임 거절 원칙을 밝히는 것이 오히려 신뢰를 만든다 */}
          <div className="mt-6 flex gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p className="text-xs leading-relaxed text-amber-100">
              {LEGAL_DISCLAIMER}
            </p>
          </div>
        </div>
      </div>
    </CrawlingSection>
  );
}
