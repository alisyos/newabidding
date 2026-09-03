import type { LucideIcon } from "lucide-react";

/**
 * 등록된 에이전트 id 목록.
 * 새 에이전트를 추가하면 여기에 id를 먼저 넣어야 한다.
 * (포인트 단가 맵이 Record<AgentId, ...> 이므로 단가 누락 시 빌드가 실패한다)
 */
export const AGENT_IDS = [
  "keyword-expansion",
  "search-keyword-expansion",
  "blog-comments",
  "instagram-comments",
  "youtube-monitoring",
  "rank-tracking",
  "product-name-optimizer",
  "review-analysis",
  "competitor-monitoring",
  "ad-copy-generator",
  "creative-brief",
  "banner-resize",
  "ad-keyword-recommend",
  "category-trend",
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

/** 홈 화면 카드로 노출되는 세부 에이전트 페이지 */
export interface Agent {
  id: AgentId;
  name: string;
  description: string;
  href: string;
  category: string;
  tags: string[];
  status: "available" | "coming-soon";
  icon: LucideIcon;
}
