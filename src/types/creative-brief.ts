// 광고 소재 기획(/creative-brief) 타입 정의.
//
// 입력(CreativeBriefInput) → 모델 산출(CreativeBriefResult) → AE 편집(BriefSelection)
// → 최종 기획안 문서 순서로 흐른다.
// 값 목록(매체·목적·톤)의 단일 출처는 src/lib/creative-brief-spec.ts 이다.

/** 소재를 집행할 매체 */
export type CreativeMediaKey =
  | "instagram"
  | "youtube"
  | "naver"
  | "kakao"
  | "facebook"
  | "display"
  | "tv"
  | "ooh";

/** 캠페인 목적 */
export type CampaignObjective =
  | "브랜드인지"
  | "구매전환"
  | "트래픽"
  | "앱설치"
  | "리드확보"
  | "재구매";

/** 매체 카드 표시 정보 (프롬프트 컨텍스트로도 쓰인다) */
export interface CreativeMediaSpec {
  key: CreativeMediaKey;
  label: string;
  /** 소재 제작 시 고려할 매체 특성 — 프롬프트에 그대로 주입된다 */
  hint: string;
}

/** 타깃 인구통계 */
export interface BriefTargetAudience {
  ageRange: string;
  gender: string;
  interests: string;
}

/** 안별 생성 개수 */
export interface BriefVariantCount {
  headlines: number;
  bodyCopies: number;
  concepts: number;
}

/** 소재 기획 입력값 */
export interface CreativeBriefInput {
  // A. 기본 정보
  advertiser: string;
  industry: string;
  productName: string;
  media: CreativeMediaKey[];

  // B. 타깃
  targetAudience: BriefTargetAudience;
  /** 오디언스 서술 (예: "사회초년생 첫 카드 발급 고려층") */
  audienceDescription: string;

  // C. 캠페인
  objective: CampaignObjective;
  /** 톤앤매너 — 최대 2개 조합 */
  toneAndManner: string[];
  /** 핵심 메시지·USP */
  keyMessages: string[];

  // D. 표현 제어 (고급 옵션)
  mustInclude: string[];
  excludeWords: string[];

  // E. 참조 자료 (고급 옵션)
  /** 과거 동일 업종 소재 기획안 */
  referencePlan: string;
  /** 브랜드 카피 가이드 */
  copyGuide: string;

  // F. 생성 옵션
  variantCount: BriefVariantCount;
}

/** 헤드라인·바디카피 1안 */
export interface CreativeOption {
  text: string;
  /** 이 안을 낸 이유 */
  reason: string;
  /** 적용한 톤앤매너 */
  tone: string;
}

/** 콘셉트 방향 1안 */
export interface ConceptOption {
  /** 콘셉트명 (예: "첫 어른의 순간") */
  name: string;
  /** 콘셉트 방향 설명 */
  direction: string;
  /** 콘셉트를 한 문장으로 압축한 핵심 메시지 */
  keyMessage: string;
  /** 비주얼 디렉션 — 화면 구성·색·모델·연출 */
  visualDirection: string;
  reason: string;
}

/** 모델이 생성한 기획안 초안 */
export interface CreativeBriefResult {
  headlines: CreativeOption[];
  bodyCopies: CreativeOption[];
  concepts: ConceptOption[];
}

export interface CreativeBriefGenerateRequest {
  input: CreativeBriefInput;
}

export interface CreativeBriefResponse {
  model: string;
  result: CreativeBriefResult;
}

export type CreativeBriefErrorCode =
  | "MISSING_API_KEY"
  | "INVALID_REQUEST"
  | "INVALID_API_KEY"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  /** 모델이 응답은 했지만 헤드라인·바디카피·콘셉트 중 하나가 비어 기획안으로 쓸 수 없음 */
  | "EMPTY_RESULT"
  | "UNKNOWN";

export interface CreativeBriefErrorResponse {
  error: { code: CreativeBriefErrorCode; message: string };
}

/**
 * AE 가 고르고 수정한 최종 상태 (클라이언트 전용).
 * *Text 필드는 선택한 안의 원문에서 시작해 인라인 편집으로 덮어써진다.
 */
export interface BriefSelection {
  headlineIndex: number;
  bodyIndex: number;
  conceptIndex: number;
  headlineText: string;
  bodyText: string;
  conceptName: string;
  conceptDirection: string;
  conceptKeyMessage: string;
  visualDirection: string;
  /** AE 추가 메모 */
  memo: string;
}
