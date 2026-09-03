// AI 배너 리사이징 입력 선택지·상한·생성 기하 계산의 단일 출처.
//
// [핵심] 두 모델 모두 "목표 픽셀 크기"를 그대로 요청할 수 없고, 만들 수 있는 비율도 서로 다르다.
//   - gpt-image-2 : WIDTHxHEIGHT 임의값을 받지만 양변이 16의 배수여야 하고
//                   종횡비가 1:3 ~ 3:1 을 벗어나면 400 을 낸다.
//                   ("Invalid size '1200x304'. The maximum supported aspect ratio is 3:1.")
//   - Gemini      : 픽셀 지정은 불가능하고 aspect_ratio 열거값만 받지만,
//                   1:8 ~ 8:1 까지 있어 극단적인 배너 비율은 오히려 이쪽이 유리하다.
//
// 그래서 1200×300(4:1)은 Gemini 에서 크롭 없이 나오고 gpt-image-2 에서는 25% 를 잘라내야 한다.
// planGeneration() 은 "모델에 요청할 캔버스(gen)"와 "거기서 잘라낼 밴드(band)"를 계산한다.
// 모델에는 원본을 참조로 주고 캔버스 전체를 다시 디자인하게 한 뒤, 밴드만 잘라
// 목표 픽셀 크기로 렌더한다. 밴드 밖은 버려지므로 프롬프트에서 세이프 에어리어로 알려준다.

import type {
  BannerComposition,
  BannerGenerationPlan,
  BannerModelKey,
  BannerModelSpec,
  BannerResizeOptions,
  BannerSize,
  SizePresetGroup,
} from "@/types/banner-resize";

/** 모델 표시 순서 단일 출처 */
export const BANNER_MODEL_KEYS: BannerModelKey[] = [
  "nano-banana-2",
  "gpt-image-2",
];

/** 기획서 5.3 — 초기 기본 선택값 */
export const DEFAULT_MODEL: BannerModelKey = "nano-banana-2";

export const BANNER_MODELS: Record<BannerModelKey, BannerModelSpec> = {
  "nano-banana-2": {
    key: "nano-banana-2",
    label: "Gemini 3.1 Flash Image",
    subLabel: "Nano Banana 2",
    tagline: "빠르게 여러 사이즈 만들기",
    description:
      "처리가 빨라 여러 규격을 한 번에 뽑을 때 유리합니다. 대량 배너 제작에 권장합니다.",
    envKey: "GEMINI_API_KEY",
  },
  "gpt-image-2": {
    key: "gpt-image-2",
    label: "GPT-Image-2",
    subLabel: "OpenAI",
    tagline: "품질을 우선하여 만들기",
    description:
      "배경 확장이 자연스럽고 원본 보존력이 높습니다. 중요한 광고 소재에 권장합니다.",
    envKey: "OPENAI_API_KEY",
  },
};

/** 기획서 6.1·6.2 — 매체별 프리셋 */
export const SIZE_PRESET_GROUPS: SizePresetGroup[] = [
  {
    media: "공통",
    sizes: [
      { id: "1080x1080", width: 1080, height: 1080, label: "정사각형" },
      { id: "1200x628", width: 1200, height: 628, label: "가로형" },
    ],
  },
  {
    media: "네이버",
    sizes: [
      { id: "1200x300", width: 1200, height: 300, label: "와이드 배너" },
      { id: "1200x600", width: 1200, height: 600, label: "메인 배너" },
    ],
  },
  {
    media: "Google",
    sizes: [
      { id: "300x250", width: 300, height: 250, label: "디스플레이" },
      { id: "728x90", width: 728, height: 90, label: "리더보드" },
      { id: "300x600", width: 300, height: 600, label: "세로형" },
    ],
  },
  {
    media: "Meta",
    sizes: [
      { id: "1080x1350", width: 1080, height: 1350, label: "피드 세로형" },
      { id: "1080x1920", width: 1080, height: 1920, label: "스토리·릴스" },
    ],
  },
  {
    media: "모바일",
    sizes: [{ id: "320x100", width: 320, height: 100, label: "모바일 배너" }],
  },
];

/** 프리셋 전체를 평평하게 (중복 id 제거) */
export const ALL_PRESETS: BannerSize[] = (() => {
  const seen = new Set<string>();
  const out: BannerSize[] = [];
  for (const g of SIZE_PRESET_GROUPS) {
    for (const s of g.sizes) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      out.push(s);
    }
  }
  return out;
})();

/** 한 번에 생성할 수 있는 규격 수 — 비용·소요시간 상한 */
export const MAX_SIZES = 6;

/** 직접 입력 가능한 변의 범위 (px) */
export const SIZE_RANGE = { min: 50, max: 3840 } as const;

/** 업로드 허용 포맷 */
export const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPTED_EXT = ".jpg,.jpeg,.png,.webp";

/** 업로드 파일 용량 상한 */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** 원본을 브라우저에 보관할 때의 긴 변 상한 (초과 시 축소) */
export const MAX_SOURCE_EDGE = 2400;

/** 생성 캔버스의 긴 변 — 목표 비율이 모델 한계를 넘으면 밴드가 얇아지므로 더 크게 잡는다 */
const LONG_EDGE_NORMAL = 1536;
const LONG_EDGE_CROPPED = 2048;

/** gpt-image-2 의 종횡비 허용 범위 */
const GPT_MIN_AR = 1 / 3;
const GPT_MAX_AR = 3;

/**
 * Gemini Interactions API 가 받는 aspect_ratio 열거값 (비율 오름차순).
 *
 * [다시 확인하는 법] 공급사가 값을 추가하는 일이 실제로 있었다.
 * 잘못된 값을 하나 보내면 400 응답이 지원값을 통째로 열거해 준다. 생성 비용도 들지 않는다.
 *
 *   response_format.aspect_ratio = "99:1"
 *   → 400 The value '99:1' is not supported for 'response_format.aspect_ratio'.
 *     Supported values: '1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9',
 *                       '1:8','8:1','1:4','4:1'.
 *
 * 1:8 · 1:4 · 4:1 · 8:1 이 빠져 있던 탓에 1200×300(4:1)을 21:9 로 만든 뒤 42% 를 잘라내
 * 로고와 문구가 날아갔다. 목록이 좁으면 그만큼 크롭이 늘어난다.
 */
export const GEMINI_ASPECT_RATIOS: { value: string; ratio: number }[] = [
  { value: "1:8", ratio: 1 / 8 },
  { value: "1:4", ratio: 1 / 4 },
  { value: "9:16", ratio: 9 / 16 },
  { value: "2:3", ratio: 2 / 3 },
  { value: "3:4", ratio: 3 / 4 },
  { value: "4:5", ratio: 4 / 5 },
  { value: "1:1", ratio: 1 },
  { value: "5:4", ratio: 5 / 4 },
  { value: "4:3", ratio: 4 / 3 },
  { value: "3:2", ratio: 3 / 2 },
  { value: "16:9", ratio: 16 / 9 },
  { value: "21:9", ratio: 21 / 9 },
  { value: "4:1", ratio: 4 },
  { value: "8:1", ratio: 8 },
];

/**
 * OpenAI 이미지 모델이 항상 받아주는 표준 사이즈.
 *
 * 평소에는 쓰지 않는다 — gpt-image-2 는 임의 WIDTHxHEIGHT 를 받으므로 그쪽이 크롭이 적다.
 * 이 목록은 모델이 요청한 캔버스 크기를 거부했을 때(400) 되돌아갈 마지막 안전지대다.
 * (banner-image-models.ts 의 폴백 체인에서만 쓴다)
 */
export const GPT_STANDARD_SIZES: { width: number; height: number; ratio: number }[] = [
  { width: 1024, height: 1536, ratio: 1024 / 1536 },
  { width: 1024, height: 1024, ratio: 1 },
  { width: 1536, height: 1024, ratio: 1536 / 1024 },
];

/** 목표 비율에 가장 가까운 표준 사이즈 (nearestGeminiAspect 와 같은 로그 거리 기준) */
export function nearestGptStandardSize(ratio: number): {
  width: number;
  height: number;
} {
  let best = GPT_STANDARD_SIZES[1];
  let bestDist = Infinity;
  for (const s of GPT_STANDARD_SIZES) {
    const d = Math.abs(Math.log(ratio) - Math.log(s.ratio));
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return { width: best.width, height: best.height };
}

const round16 = (n: number) => Math.max(256, Math.round(n / 16) * 16);
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/** 목표 비율에 가장 가까운 Gemini 종횡비 (로그 거리 기준) */
export function nearestGeminiAspect(ratio: number): { value: string; ratio: number } {
  let best = GEMINI_ASPECT_RATIOS[0];
  let bestDist = Infinity;
  for (const a of GEMINI_ASPECT_RATIOS) {
    const d = Math.abs(Math.log(ratio) - Math.log(a.ratio));
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best;
}

/**
 * 모델에 요청할 생성 캔버스와, 거기서 잘라낼 밴드를 계산한다.
 *
 * 서버(프롬프트)와 클라이언트(최종 렌더)가 같은 값을 써야 하므로
 * 부수효과 없는 순수 함수로 둔다.
 */
export function planGeneration(
  model: BannerModelKey,
  target: { width: number; height: number }
): BannerGenerationPlan {
  const targetAr = target.width / target.height;

  let genAr: number;
  let aspectRatio: string | undefined;

  if (model === "gpt-image-2") {
    genAr = clamp(targetAr, GPT_MIN_AR, GPT_MAX_AR);
  } else {
    const picked = nearestGeminiAspect(targetAr);
    genAr = picked.ratio;
    aspectRatio = picked.value;
  }

  // 목표 비율을 그대로 못 쓰면 밴드가 얇아진다 → 캔버스를 키워 밴드 픽셀을 확보한다
  const clampedAr = Math.abs(genAr - targetAr) > 0.01;
  const longEdge = clampedAr ? LONG_EDGE_CROPPED : LONG_EDGE_NORMAL;

  let genWidth: number;
  let genHeight: number;
  if (genAr >= 1) {
    genWidth = longEdge;
    genHeight = longEdge / genAr;
  } else {
    genHeight = longEdge;
    genWidth = longEdge * genAr;
  }

  if (model === "gpt-image-2") {
    // 16 배수 반올림 후 비율이 한계를 넘을 수 있으므로 반드시 재보정한다.
    // (예: 1024/336 = 3.05 → 400 unsupported_value)
    genWidth = round16(genWidth);
    genHeight = round16(genHeight);
    if (genWidth / genHeight > GPT_MAX_AR) genHeight = round16(genWidth / GPT_MAX_AR);
    if (genWidth / genHeight < GPT_MIN_AR) genWidth = round16(genHeight * GPT_MIN_AR);
  } else {
    genWidth = Math.round(genWidth);
    genHeight = Math.round(genHeight);
  }

  // 생성 캔버스 안에서 목표 비율을 갖는 최대 밴드 (중앙 정렬)
  const genRatio = genWidth / genHeight;
  let bandWidth: number;
  let bandHeight: number;
  if (targetAr >= genRatio) {
    bandWidth = genWidth;
    bandHeight = genWidth / targetAr;
  } else {
    bandHeight = genHeight;
    bandWidth = genHeight * targetAr;
  }
  bandWidth = Math.round(bandWidth);
  bandHeight = Math.round(bandHeight);
  const bandX = Math.round((genWidth - bandWidth) / 2);
  const bandY = Math.round((genHeight - bandHeight) / 2);

  return {
    genWidth,
    genHeight,
    bandX,
    bandY,
    bandWidth,
    bandHeight,
    // 16 배수 반올림 때문에 몇 픽셀 차이는 항상 생긴다.
    // 그 정도를 "잘림"으로 보면 멀쩡한 규격에도 크롭 경고가 붙으므로 상대 오차로 판정한다.
    cropped:
      bandWidth < genWidth * 0.98 || bandHeight < genHeight * 0.98,
    aspectRatio,
  };
}

export function createDefaultOptions(): BannerResizeOptions {
  return {
    preserveProduct: true,
    preserveText: true,
    preserveLogo: true,
    expandBackground: true,
    composition: "auto",
    sourceText: "",
  };
}

/** 원본 문구 입력 상한 — 프롬프트 길이를 통제한다 */
export const MAX_SOURCE_TEXT_CHARS = 500;

export const COMPOSITION_OPTIONS: { value: BannerComposition; label: string }[] = [
  { value: "auto", label: "자동" },
  { value: "subject", label: "상품 중심" },
  { value: "center", label: "문구 중심" },
  { value: "background", label: "배경 중심" },
];

/** 기본 선택 규격 (기획서 화면 예시와 동일) */
export function createDefaultSizes(): BannerSize[] {
  return ALL_PRESETS.filter((s) => s.id === "1200x300" || s.id === "300x250");
}

/**
 * 이 규격을 이 모델로 만들 때 잘려나가는 비율(%).
 * 모델이 목표 비율을 직접 못 만들수록 커진다. 0 이면 크롭 없이 그대로 쓴다.
 */
export function estimateCropLoss(
  model: BannerModelKey,
  size: { width: number; height: number }
): number {
  const plan = planGeneration(model, size);
  const kept =
    (plan.bandWidth * plan.bandHeight) / (plan.genWidth * plan.genHeight);
  return Math.max(0, Math.round((1 - kept) * 100));
}

/** "1200×300 (와이드 배너)" */
export function describeSize(size: BannerSize): string {
  return `${size.width}×${size.height}${size.label ? ` (${size.label})` : ""}`;
}

/** 비율을 "4.00:1" 형태로 */
export function formatRatio(width: number, height: number): string {
  const r = width / height;
  return r >= 1 ? `${r.toFixed(2)}:1` : `1:${(1 / r).toFixed(2)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 직접 입력 값 → BannerSize (검증은 호출부에서) */
export function customSize(width: number, height: number): BannerSize {
  return { id: `${width}x${height}`, width, height, label: "직접 입력" };
}
