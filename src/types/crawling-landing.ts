// 크롤링 개발 서비스 랜딩페이지 타입 정의.
//
// 이 페이지는 포인트를 차감하는 에이전트 도구가 아니라 리드를 받는 영업용 랜딩페이지다.
// 따라서 src/types/agent.ts 의 AGENT_IDS 와는 무관하며, 여기서만 쓰는 타입을 모아 둔다.

import type { LucideIcon } from "lucide-react";

/** 섹션 배경 톤 — 12섹션이 한 덩어리로 보이지 않게 교차시킨다 */
export type SectionTone = "default" | "muted" | "dark";

/** S1 신뢰 배지 */
export interface HeroBadge {
  label: string;
  icon: LucideIcon;
}

/** S2 신뢰 지표 (고객사 로고 대체 지표) */
export interface TrustStat {
  value: string;
  label: string;
}

/** S3 타겟별 페인포인트 — 각 카드가 광고 소재별 착지점 역할을 한다 */
export interface PainPoint {
  id: string;
  targetLabel: string;
  title: string;
  icon: LucideIcon;
  situation: string;
  realProblem: string;
  hook: string;
}

/** S4 수집 가능 대상 유형 */
export interface SourceCategory {
  name: string;
  icon: LucideIcon;
  examples: string;
}

/** S5 결과물 형태 */
export interface OutputFormat {
  name: string;
  icon: LucideIcon;
  description: string;
}

/** S6 기술 대응력 — 고객 반론(concern)을 인정한 뒤 해결책(solution)을 제시하는 2단 구조 */
export interface TechChallenge {
  title: string;
  icon: LucideIcon;
  concern: string;
  solution: string;
}

/** S7 진행 프로세스 5단계 */
export interface ProcessStep {
  step: number;
  title: string;
  detail: string;
  duration: string;
  /** 무료 사전 기술검토(2단계)처럼 시각적으로 강조할 단계 */
  highlight?: boolean;
}

/** S8 도입 사례 */
export interface CaseStudy {
  targetLabel: string;
  profile: string;
  icon: LucideIcon;
  before: string;
  after: string;
  metrics: { value: string; label: string }[];
  /** 실제 고객사 자료 확보 전까지 카드 하단에 표기하는 단서 */
  disclaimer: string;
}

/** S9 착수 전 리스크 체크 항목 */
export interface LegalCheck {
  title: string;
  detail: string;
  icon: LucideIcon;
}

/** S10 요금 패키지 */
export interface PricingPackage {
  name: string;
  subtitle: string;
  price: string;
  priceNote: string;
  target: string;
  features: string[];
  /** "가장 많이 선택" 강조 카드 */
  featured?: boolean;
}

/** S11 FAQ */
export interface FaqItem {
  question: string;
  answer: string;
  /** 업셀 문항처럼 처음부터 열어둘 항목 */
  defaultOpen?: boolean;
}

/** S12 푸터 사업자정보 */
export interface FooterInfo {
  company: string;
  ceo: string;
  businessNumber: string;
  mailOrderNumber: string;
  address: string;
  tel: string;
  email: string;
}

/** 수집 주기 — 문의 폼 3번 필드 */
export type CollectCycle = "once" | "daily" | "realtime" | "undecided";

/** 문의 폼 입력값 (4필드 + 개인정보 수집·이용 동의) */
export interface CrawlingInquiryInput {
  /** 1. 수집하고 싶은 사이트 주소 (여러 개면 줄바꿈) */
  targetUrls: string;
  /** 2. 필요한 데이터 항목 */
  dataFields: string;
  /** 3. 수집 주기 */
  cycle: CollectCycle;
  /** 4. 연락처 — 이메일 또는 휴대폰 택1 */
  contact: string;
  /** 개인정보 수집·이용 동의 */
  agreed: boolean;
}
