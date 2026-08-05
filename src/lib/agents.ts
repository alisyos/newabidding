import {
  BarChart3,
  Binoculars,
  Globe,
  Megaphone,
  MessageSquareQuote,
  PenLine,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { Agent, AgentId } from "@/types/agent";

/**
 * 홈 화면 카드 목록.
 * 새 에이전트 페이지를 만들면 이 배열에 항목 하나만 추가하면 된다.
 */
export const AGENTS: Agent[] = [
  {
    id: "keyword-expansion",
    name: "쇼핑몰 키워드 확장",
    description:
      "국내 주요 쇼핑몰 검색창의 자동완성 검색어와 연관검색어를 한 번에 수집합니다.",
    href: "/keyword-expansion",
    category: "키워드",
    tags: ["자동완성", "연관검색어", "네이버", "쿠팡", "수집"],
    status: "available",
    icon: Search,
  },
  {
    id: "search-keyword-expansion",
    name: "검색엔진 키워드 확장",
    description:
      "네이버·다음·구글 검색창의 자동완성 검색어와 연관검색어를 한 번에 수집합니다.",
    href: "/search-keyword-expansion",
    category: "키워드",
    tags: ["자동완성", "연관검색어", "네이버", "다음", "구글", "검색엔진"],
    status: "available",
    icon: Globe,
  },
  {
    id: "rank-tracking",
    name: "쇼핑몰 순위 추적",
    description:
      "등록한 키워드별 상품 노출 순위를 매일 추적하고 변동 추이를 보여줍니다.",
    href: "#",
    category: "순위",
    tags: ["순위", "노출", "모니터링", "추이"],
    status: "coming-soon",
    icon: TrendingUp,
  },
  {
    id: "product-name-optimizer",
    name: "상품명 최적화",
    description:
      "검색 노출에 유리한 상품명 조합을 제안하고 금지어·중복 키워드를 점검합니다.",
    href: "#",
    category: "상품",
    tags: ["상품명", "SEO", "최적화", "금지어"],
    status: "coming-soon",
    icon: Sparkles,
  },
  {
    id: "review-analysis",
    name: "리뷰 분석",
    description:
      "상품 리뷰를 수집해 긍·부정 키워드와 반복되는 불만 포인트를 정리합니다.",
    href: "#",
    category: "상품",
    tags: ["리뷰", "감성분석", "고객의견", "CS"],
    status: "coming-soon",
    icon: MessageSquareQuote,
  },
  {
    id: "competitor-monitoring",
    name: "경쟁사 모니터링",
    description:
      "경쟁 셀러의 가격·옵션·신규 상품 변화를 감지해 변경 내역을 알려줍니다.",
    href: "#",
    category: "경쟁",
    tags: ["경쟁사", "가격", "알림", "모니터링"],
    status: "coming-soon",
    icon: Binoculars,
  },
  {
    id: "ad-copy-generator",
    name: "광고 문구 생성",
    description:
      "네이버·카카오·구글 검색광고 규정에 맞는 광고 문구를 매체별로 자동 생성합니다.",
    href: "/ad-copy",
    category: "광고",
    tags: ["광고문구", "카피라이팅", "네이버", "카카오", "구글", "AI"],
    status: "available",
    icon: PenLine,
  },
  {
    id: "ad-keyword-recommend",
    name: "광고 키워드 추천",
    description:
      "검색량과 경쟁도를 기준으로 입찰 효율이 좋은 광고 키워드를 골라줍니다.",
    href: "#",
    category: "광고",
    tags: ["광고", "입찰", "검색량", "경쟁도", "ROAS"],
    status: "coming-soon",
    icon: Megaphone,
  },
  {
    id: "category-trend",
    name: "카테고리 트렌드 분석",
    description:
      "카테고리별 검색 수요와 계절 흐름을 분석해 진입 시점을 판단하도록 돕습니다.",
    href: "#",
    category: "분석",
    tags: ["트렌드", "카테고리", "수요", "시즌"],
    status: "coming-soon",
    icon: BarChart3,
  },
];

/** 카테고리 필터 칩용 목록 (등장 순서 유지) */
export const CATEGORIES: string[] = Array.from(
  new Set(AGENTS.map((a) => a.category))
);

/** id로 에이전트 이름 조회 (포인트 사용 내역 표시용) */
export function agentName(id: AgentId): string {
  return AGENTS.find((a) => a.id === id)?.name ?? id;
}
