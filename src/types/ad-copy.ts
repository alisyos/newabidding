// 검색광고(네이버·카카오·구글) 광고문구 자동생성 타입 정의
// 매체별 소재 규격 원본: add/adcopy/search_ad_copy_spec.json
// 입력 폼 스키마 원본: add/adcopy/ad_copy_input_schema.json

/** 대상 매체 */
export type AdMediaKey = "naver" | "kakao" | "google";

/** 논리 필드 키 — 매체별 실제 명칭(제목/Headline)을 2개로 정규화한다 */
export type AdFieldKey = "title" | "description";

/**
 * 글자수 카운팅 방식
 * - GRAPHEME_1: 한글·영문·숫자·공백 모두 1자=1카운트 (네이버·카카오)
 * - GOOGLE_CJK_2: ASCII=1, 전각 CJK=2카운트 (구글). 한도값 자체는 고정.
 */
export type CounterMode = "GRAPHEME_1" | "GOOGLE_CJK_2";

/** 글자수 판정 결과 */
export type LengthStatus = "ok" | "over" | "under";

/** 위반 심각도 — error는 반려 가능성 높음, warning은 확인 권장 */
export type Severity = "error" | "warning";

/** 문구의 소구축(어떤 각도로 소구하는지) */
export type AdAngle = "혜택" | "가격" | "신뢰" | "긴급성" | "브랜드";

/** 매체 1개 필드의 글자수·개수 규격 (가이드 §6의 "공식 확정값"만 사용) */
export interface AdFieldSpec {
  key: AdFieldKey;
  /** 화면 표시용 필드명 (예: 설명문구, 제목(Headline)) */
  label: string;
  /** 카운터 기준 최대 한도 */
  limit: number;
  /** 카운터 기준 최소 한도 (네이버 설명 20자). 없으면 하한 없음 */
  minLength?: number;
  /** 한글로만 작성했을 때의 실질 입력 가능 글자수 */
  koEffective: number;
  /** 매체가 허용하는 최소 생성 개수 */
  minCount: number;
  /** 매체가 허용하는 최대 생성 개수 */
  maxCount: number;
  /** 폼 기본 생성 개수 */
  defaultCount: number;
}

/** 매체 1개의 소재 규격 (src/lib/channels.ts 와 동일한 "단일 출처" 패턴) */
export interface MediaSpec {
  key: AdMediaKey;
  /** 탭·배지용 짧은 이름 (예: 네이버) */
  shortName: string;
  /** 정식 명칭 (예: 네이버 검색광고) */
  displayName: string;
  /** 상품 유형 식별자 (v1은 매체당 1개 고정) */
  productKey: string;
  /** 상품 유형 표시명 (예: 파워링크) */
  productName: string;
  counter: CounterMode;
  /** 카운팅 방식 안내 문구 (UI·프롬프트 공용) */
  counterNote: string;
  /** 매체별 특수문자 규정 (프롬프트 주입용) */
  specialCharRule: string;
  fields: Record<AdFieldKey, AdFieldSpec>;
}

/** 업종 옵션 */
export interface IndustryOption {
  key: string;
  label: string;
  /** 심의필 번호 입력이 필요한 업종인지 */
  reviewNumberRequired?: boolean;
  /** 해당 매체에서 광고 등록이 불가한 업종 (카카오 등록불가 업종 등) */
  blockedOn?: AdMediaKey[];
}

/** 프로모션 정보 (C_소구정보.promotion) */
export interface AdPromotion {
  /** 할인율/할인액 */
  discountRate: string;
  /** 기간 (긴급성 문구용) */
  period: string;
  /** 사은품·이벤트 내용 */
  event: string;
}

/** 가격 정보 (C_소구정보.price) */
export interface AdPrice {
  itemName: string;
  amount: string;
  /** 부터/최대/평균 등 */
  qualifier: string;
}

/** 타깃 고객 (C_소구정보.targetAudience) */
export interface AdTargetAudience {
  gender: string;
  ageRange: string;
  interests: string;
}

/** 최상급 표현 사용 설정 (D_표현제어.superlative) */
export interface AdSuperlative {
  use: boolean;
  /** 근거 자료(수상내역/조사기관/통계 출처). use=true인데 비어 있으면 생성 차단 */
  evidence: string;
}

/** 매체별 생성 개수 (E_생성옵션.variantCount) */
export interface AdVariantCount {
  titles: number;
  descriptions: number;
}

/** 변형 다양성 — 시스템 프롬프트 지시문으로 반영된다 */
export type AdDiversityLevel = "보수적" | "균형" | "실험적";

/** 광고문구 생성 입력값 전체 (ad_copy_input_schema.json A~E 섹션) */
export interface AdCopyInput {
  // A_설정
  media: AdMediaKey[];
  landingUrl: string;
  industry: string;

  // B_비즈니스
  brandName: string;
  productName: string;

  // C_소구정보
  targetKeywords: string[];
  keyBenefits: string[];
  usp: string;
  cta: string;
  promotion: AdPromotion;
  price: AdPrice;
  targetAudience: AdTargetAudience;

  // D_표현제어
  toneAndManner: string;
  mustInclude: string[];
  excludeWords: string[];
  superlative: AdSuperlative;
  /** 심의필 번호 (의료·건강기능식품 등 심의대상 업종에서 필요) */
  reviewNumber: string;

  // E_생성옵션
  /** 매체별 생성 개수. 미지정 매체는 스펙의 defaultCount 사용 */
  variantCount: Partial<Record<AdMediaKey, AdVariantCount>>;
  diversityLevel: AdDiversityLevel;
}

/** 모델이 생성한 문구 1건 (API 응답 원본) */
export interface AdCopyGeneratedItem {
  text: string;
  /** 왜 이 문구인지 한 문장 */
  reason: string;
  angle: string;
}

/** 매체 1개의 생성 결과 (API 응답 원본) */
export interface AdCopyMediaResult {
  media: AdMediaKey;
  status: "ok" | "error";
  /** status가 error일 때의 한국어 사유 */
  errorMessage?: string;
  titles: AdCopyGeneratedItem[];
  descriptions: AdCopyGeneratedItem[];
  /** 서버 보정 라운드가 실행되었는지 */
  repaired: boolean;
}

/** POST /api/ad-copy 요청 본문 */
export interface AdCopyGenerateRequest {
  input: AdCopyInput;
}

/** POST /api/ad-copy 성공 응답 */
export interface AdCopyGenerateResponse {
  /** 실제 호출된 모델명 */
  model: string;
  results: AdCopyMediaResult[];
}

/** API 오류 코드 */
export type AdCopyErrorCode =
  | "MISSING_API_KEY"
  | "INVALID_REQUEST"
  | "INVALID_API_KEY"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "UNKNOWN";

/** POST /api/ad-copy 실패 응답 */
export interface AdCopyErrorResponse {
  error: { code: AdCopyErrorCode; message: string };
}

/** 금지표현 필터 적발 1건 */
export interface ProhibitedHit {
  ruleId: string;
  /** 규칙 이름 (예: 최상급/배타성 표현) */
  name: string;
  /** 실제 적발된 문자열 */
  matched: string;
  severity: Severity;
  message: string;
}

/** 글자수 측정 결과 */
export interface FieldMeasure {
  count: number;
  limit: number;
  /** 남은 카운트 (음수면 초과) */
  remaining: number;
  status: LengthStatus;
}

/** 검증까지 끝난 문구 1건 (클라이언트 파생 데이터) */
export interface EvaluatedAdCopyItem extends AdCopyGeneratedItem {
  /** `${media}-${field}-${index}` 형태의 안정적 식별자 */
  id: string;
  media: AdMediaKey;
  field: AdFieldKey;
  /** 1부터 시작하는 표시 순번 */
  seq: number;
  measure: FieldMeasure;
  /** 한글로 환산한 실질 글자수 (구글 배지 병기용) */
  koCount: number;
  hits: ProhibitedHit[];
  /** 같은 매체·같은 필드 내 중복 문구인지 */
  duplicate: boolean;
  /** 글자수 초과/미달 또는 error 등급 위반이 있는지 */
  hasError: boolean;
}

/** 검증까지 끝난 매체 1개 결과 (클라이언트 파생 데이터) */
export interface EvaluatedMediaResult {
  media: AdMediaKey;
  status: "ok" | "error";
  errorMessage?: string;
  repaired: boolean;
  titles: EvaluatedAdCopyItem[];
  descriptions: EvaluatedAdCopyItem[];
  /** 탭 배지용 — error 등급 항목 수 */
  errorCount: number;
}
