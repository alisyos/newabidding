import type { Metadata } from "next";
import { CrawlingServiceView } from "@/components/crawling-service/crawling-service-view";

// 검색광고로 유입되는 랜딩이라 루트 layout.tsx 의 기본 title 을 반드시 덮는다.
export const metadata: Metadata = {
  title: "맞춤형 크롤링 개발 서비스 | 지피티코리아",
  description:
    "필요한 사이트, 필요한 항목만 골라 맞춤 제작합니다. 무료 사전 기술검토와 법적 리스크 진단부터 시작하세요.",
};

export default function CrawlingServicePage() {
  return <CrawlingServiceView />;
}
