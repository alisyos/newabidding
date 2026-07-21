import type { LucideIcon } from "lucide-react";

/** 홈 화면 카드로 노출되는 세부 에이전트 페이지 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  href: string;
  category: string;
  tags: string[];
  status: "available" | "coming-soon";
  icon: LucideIcon;
}
