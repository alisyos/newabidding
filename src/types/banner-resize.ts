// AI 배너 리사이징(/banner-resize) 타입 정의.
//
// 원본 업로드(BannerSource) → 규격 선택(BannerSize[]) → 모델 호출(1 규격 = 1 요청)
// → 결과 카드(BannerResultItem) 순서로 흐른다.
// 값 목록(모델·프리셋·상한)의 단일 출처는 src/lib/banner-resize-spec.ts 이다.

/** 사용자가 고를 수 있는 이미지 생성 모델 */
export type BannerModelKey = "nano-banana-2" | "gpt-image-2";

/** 모델 카드 표시 정보 */
export interface BannerModelSpec {
  key: BannerModelKey;
  /** 카드 제목 (예: "Gemini 3.1 Flash Image") */
  label: string;
  /** 카드 부제 (예: "Nano Banana 2") */
  subLabel: string;
  /** 선택 기준을 알려주는 한 줄 (기획서 5.3) */
  tagline: string;
  description: string;
  /** 이 모델을 쓰려면 필요한 환경변수 이름 — 오류 안내에 그대로 쓴다 */
  envKey: string;
}

/** 출력 규격 1건 */
export interface BannerSize {
  /** "1200x300" — 결과 카드 key 이자 중복 판정 기준 */
  id: string;
  width: number;
  height: number;
  /** 프리셋이면 라벨(예: "와이드 배너"), 직접 입력이면 "직접 입력" */
  label: string;
}

/** 프리셋 그룹 (매체별) */
export interface SizePresetGroup {
  media: string;
  sizes: BannerSize[];
}

/** 업로드된 원본 — base64 data URL 로 보관한다 */
export interface BannerSource {
  dataUrl: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  /** data URL 로 만들기 전 실제 바이트 수 (축소했다면 축소 후 추정치) */
  byteSize: number;
  /** 투명 배경 여부 — 업로드 시 캔버스 알파 샘플링으로 판정 */
  hasAlpha: boolean;
  /** 업로드 단계에서 긴 변을 줄였는지 */
  downscaled: boolean;
}

/** 생성 방식 (기획서 7장 고급 설정) */
export type BannerComposition = "auto" | "center" | "subject" | "background";

export interface BannerResizeOptions {
  /** 상품·패키지·인물의 외형을 원본과 동일하게 유지 */
  preserveProduct: boolean;
  /** 광고 문구를 원본과 똑같은 단어·철자로 재현 (위치·크기는 재배치 허용) */
  preserveText: boolean;
  /** 브랜드 로고를 원본 형태 그대로 유지 */
  preserveLogo: boolean;
  /** 배경을 새 비율에 맞게 적극적으로 재생성 (끄면 원본 톤을 단순 확장) */
  expandBackground: boolean;
  /** 재배치할 때 무엇을 중심에 둘지 */
  composition: BannerComposition;
  /**
   * 원본에 들어간 문구 (선택).
   * 모델이 이미지에서 글자를 읽어내는 과정에서 오차가 생기므로,
   * 정답 텍스트를 함께 주면 문구 재현 정확도가 크게 올라간다.
   */
  sourceText: string;
}

/**
 * 한 규격의 생성 기하 정보.
 * 모델이 임의 픽셀 크기를 못 받기 때문에(gpt-image-2 는 1:3~3:1·16배수,
 * Gemini 는 aspect_ratio 열거값) "생성 캔버스"와 "최종으로 잘라낼 밴드"를 분리한다.
 */
export interface BannerGenerationPlan {
  /** 모델에 요청할 캔버스 크기 */
  genWidth: number;
  genHeight: number;
  /** 생성 캔버스에서 최종 결과로 잘라낼 영역 (목표 비율과 동일) */
  bandX: number;
  bandY: number;
  bandWidth: number;
  bandHeight: number;
  /** 목표 비율이 모델 한계를 넘어 밴드를 잘라내야 하는지 */
  cropped: boolean;
  /** Gemini 전용 — 요청할 종횡비 열거값 (예: "21:9") */
  aspectRatio?: string;
}

/** 규격 1건 생성 요청 (클라이언트 → API) */
export interface BannerGenerateRequest {
  model: BannerModelKey;
  size: BannerSize;
  plan: BannerGenerationPlan;
  /** 모델에 참조로 넘길 원본 이미지 (JPEG data URL) */
  sourceDataUrl: string;
  options: BannerResizeOptions;
  /** 프롬프트 컨텍스트용 원본 메타 */
  sourceMeta: { width: number; height: number; hasAlpha: boolean };
}

/** 규격 1건 생성 응답 */
export interface BannerGenerateResponse {
  /** 실제 호출한 공급사 모델 ID (예: "gpt-image-2") */
  modelId: string;
  /** 생성 이미지 (PNG data URL). 실제 픽셀 크기는 클라이언트가 로드해서 잰다 */
  image: { dataUrl: string };
  /** 마스크가 거부되어 빼고 재시도했는지 등 서버가 알려주는 참고 사항 */
  notes: string[];
}

/** 결과 카드 1건 */
export interface BannerResultItem {
  /** size.id 와 동일 — 재생성 시 같은 자리를 갱신한다 */
  id: string;
  size: BannerSize;
  model: BannerModelKey;
  status: "pending" | "done" | "error";
  /** 성공 시 목표 크기로 정확히 렌더된 PNG data URL */
  imageDataUrl?: string;
  /** 모델이 실제로 돌려준 캔버스 크기 (참고 표시용) */
  generatedWidth?: number;
  generatedHeight?: number;
  errorMessage?: string;
  /** 자동 검수 경고 (기획서 14장) */
  warnings: string[];
}

export type BannerResizeErrorCode =
  | "MISSING_API_KEY"
  | "INVALID_REQUEST"
  | "INVALID_API_KEY"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "EMPTY_RESULT"
  | "UNKNOWN";
