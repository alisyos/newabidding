// 크롤링 개발 서비스 랜딩페이지 — 12섹션 조립.
//
// [셸 예외] 기존 도구 페이지의 "min-h-[calc(100vh-65px)] bg-muted/20 → container →
// 번호 Card" 셸을 쓰지 않는다. 그 셸은 입력→실행→결과 화면 문법이라, 스크롤로
// 설득해야 하는 12섹션 세일즈 페이지에는 리듬이 생기지 않는다. 대신 CrawlingSection
// 공용 래퍼로 풀블리드 섹션의 골격만 통일했다.
//
// [렌더링] 이 뷰에는 "use client" 를 붙이지 않는다. 광고 유입 페이지라 초기 로딩이
// 곧 전환율이고, 상태가 필요한 곳은 폼·고정 CTA·앵커·노출 측정 4개뿐이라
// 나머지 카피 전부를 클라이언트 번들에 실을 이유가 없다.
//
// 스크롤 순서 = 설득 순서:
// 공감(S3) → 해결(S4·S5) → 능력 증명(S6·S7·S8) → 안심(S9) → 가격(S10)
// → 잔여 반론 제거(S11) → 전환(S12)

import { CrawlingContactForm } from "@/components/crawling-service/crawling-contact-form";
import { CrawlingFaq } from "@/components/crawling-service/crawling-faq";
import { CrawlingFooter } from "@/components/crawling-service/crawling-footer";
import { CrawlingHero } from "@/components/crawling-service/crawling-hero";
import { CrawlingLegal } from "@/components/crawling-service/crawling-legal";
import { CrawlingMobileCta } from "@/components/crawling-service/crawling-mobile-cta";
import { CrawlingPricing } from "@/components/crawling-service/crawling-pricing";
import {
  CrawlingCases,
  CrawlingProcess,
  CrawlingTechCapability,
} from "@/components/crawling-service/crawling-proof-sections";
import {
  CrawlingOutputs,
  CrawlingPainPoints,
  CrawlingSources,
} from "@/components/crawling-service/crawling-value-sections";

export function CrawlingServiceView() {
  return (
    <div className="bg-white">
      {/* S1 히어로 + S2 신뢰 바 */}
      <CrawlingHero />

      {/* S3 문제 공감 */}
      <CrawlingPainPoints />

      {/* S4 수집 가능 대상 */}
      <CrawlingSources />

      {/* S5 결과물 형태 */}
      <CrawlingOutputs />

      {/* S6 기술 대응력 */}
      <CrawlingTechCapability />

      {/* S7 진행 프로세스 */}
      <CrawlingProcess />

      {/* S8 도입 사례 */}
      <CrawlingCases />

      {/* S9 법적 안전성 */}
      <CrawlingLegal />

      {/* S10 요금 + 2차 CTA */}
      <CrawlingPricing />

      {/* S11 FAQ */}
      <CrawlingFaq />

      {/* S12 최종 CTA — 문의 폼 */}
      <CrawlingContactForm />

      <CrawlingFooter />

      <CrawlingMobileCta />
    </div>
  );
}
