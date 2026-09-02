// S11 FAQ 7문항 — 남은 반론 제거.
//
// 네이티브 <details>/<summary> 를 쓴다. 프로젝트에 accordion UI 컴포넌트가 없고
// @radix-ui/react-accordion 을 새로 설치할 만한 요구가 아니며, 무엇보다
// 이 방식이면 클라이언트 컴포넌트로 만들지 않아도 되고 닫힌 답변도 DOM 에 남아
// 검색엔진이 읽는다. (광고 랜딩이라 이 두 가지가 애니메이션보다 가치가 크다)

import { ChevronDown } from "lucide-react";
import { CrawlingSection } from "@/components/crawling-service/crawling-section";
import { FAQ_ITEMS } from "@/lib/crawling-landing";

export function CrawlingFaq() {
  return (
    <CrawlingSection
      id="faq"
      eyebrow="자주 묻는 질문"
      title="문의 전에 가장 많이 확인하시는 것들"
    >
      <div className="mx-auto max-w-3xl">
        {FAQ_ITEMS.map(({ question, answer, defaultOpen }) => (
          <details
            key={question}
            open={defaultOpen}
            className="group border-b border-slate-200"
          >
            <summary
              // Safari 는 list-none 만으로 삼각형이 사라지지 않아 마커를 따로 숨긴다
              className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden"
            >
              <span className="text-base font-medium text-slate-900">
                {question}
              </span>
              <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="pb-5 pr-9 text-sm leading-relaxed text-slate-600">
              {answer}
            </p>
          </details>
        ))}
      </div>
    </CrawlingSection>
  );
}
