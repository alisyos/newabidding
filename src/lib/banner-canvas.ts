// 브라우저 캔버스 기반 이미지 전처리·후처리 (클라이언트 전용).
//
// 서버 이미지 라이브러리(sharp 등)를 쓰지 않는다. 필요한 세 가지가 전부 캔버스로 충분하다.
//   1) 업로드 원본 검증·축소            → readSourceFile()
//   2) 모델에 넘길 참조 이미지 준비      → buildModelInput()
//   3) 생성 결과에서 밴드만 잘라 목표
//      픽셀 크기로 정확히 렌더           → renderFinal()
//
// 모델에는 원본을 "참조"로만 주고 레이아웃 재구성을 맡긴다.
// 예전처럼 원본을 캔버스에 미리 박아 두거나 결과 위에 다시 덮지 않는다.
// 그렇게 하면 모델이 배치를 바꿀 수 없어 좌우에 배경만 붙는 결과가 나온다.

import {
  ACCEPTED_MIME,
  MAX_SOURCE_EDGE,
  MAX_UPLOAD_BYTES,
  formatBytes,
  formatRatio,
} from "@/lib/banner-resize-spec";
import type {
  BannerGenerationPlan,
  BannerSize,
  BannerSource,
} from "@/types/banner-resize";

/** 모델에 참조로 넘길 이미지의 긴 변 상한 */
const MODEL_INPUT_EDGE = 1536;

/** 크롭 위치 분석용 축소본의 최대 변 — 정밀도와 속도의 타협점 */
const ANALYSIS_MAX = 512;

/**
 * "여기부터 내용이다" 로 판정할 엣지 에너지 임계 (최소~최대 사이의 상대 위치).
 * 그라데이션 배경도 0 은 아니므로 절대값이 아니라 상대값으로 잡는다.
 * 낮추면 배경 노이즈까지 내용으로 보고, 높이면 옅은 문구를 놓친다.
 */
const CONTENT_THRESHOLD = 0.12;

/** 생성 결과에서 이 비율(%) 이하만 살아남으면 "극단적인 규격" 으로 보고 경고한다 */
const EXTREME_CROP_KEPT = 80;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    img.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 사용할 수 없는 브라우저입니다.");
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

/** base64 data URL 의 실제 바이트 수 추정 */
export function estimateDataUrlBytes(dataUrl: string): number {
  const idx = dataUrl.indexOf(",");
  if (idx < 0) return 0;
  const b64 = dataUrl.slice(idx + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

/** 알파 채널이 실제로 쓰였는지 (모서리·격자 샘플링) */
function detectAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const step = Math.max(1, Math.floor(Math.min(w, h) / 64));
  try {
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (data[(y * w + x) * 4 + 3] < 250) return true;
      }
    }
  } catch {
    // 캔버스가 오염된 경우(외부 이미지) — 판정 불가 시 불투명으로 본다
    return false;
  }
  return false;
}

/**
 * 업로드 파일 검증 + 메타 추출.
 * 긴 변이 MAX_SOURCE_EDGE 를 넘으면 축소해 브라우저 메모리와 전송량을 줄인다.
 * (모델에는 여기서 더 줄인 참조 이미지를 보내므로 화질 손실은 사실상 없다)
 */
export async function readSourceFile(file: File): Promise<BannerSource> {
  const mime = file.type.toLowerCase();
  if (!(ACCEPTED_MIME as readonly string[]).includes(mime)) {
    throw new Error("지원하지 않는 이미지 형식입니다. (JPG · PNG · WEBP)");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `이미지 용량이 너무 큽니다. ${formatBytes(MAX_UPLOAD_BYTES)} 이하 파일을 올려주세요.`
    );
  }

  const original = await readAsDataUrl(file);
  const img = await loadImage(original);
  if (!img.naturalWidth || !img.naturalHeight) {
    throw new Error("이미지 크기를 확인하지 못했습니다.");
  }

  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longEdge > MAX_SOURCE_EDGE ? MAX_SOURCE_EDGE / longEdge : 1;
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const { canvas, ctx } = createCanvas(width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const hasAlpha = mime === "image/jpeg" ? false : detectAlpha(ctx, width, height);

  const downscaled = scale < 1;
  // 축소했을 때만 다시 인코딩한다. 원본 그대로면 파일 바이트를 그대로 쓴다.
  const dataUrl = downscaled ? canvas.toDataURL("image/png") : original;

  return {
    dataUrl,
    fileName: file.name,
    mimeType: downscaled ? "image/png" : mime,
    width,
    height,
    byteSize: downscaled ? estimateDataUrlBytes(dataUrl) : file.size,
    hasAlpha,
    downscaled,
  };
}

/**
 * 모델에 넘길 참조 이미지를 만든다.
 *
 * 원본을 그대로 보내지 않고 긴 변 MODEL_INPUT_EDGE 로 줄여 JPEG 로 다시 인코딩한다.
 *   - 모델 출력은 어차피 2K 안팎이라 그 이상 해상도가 품질에 기여하지 않는다
 *   - 요청 본문(base64)이 서버리스 한도 안에 넉넉히 들어온다
 *   - 알파가 필요 없으므로 PNG 보다 JPEG 가 훨씬 작다
 */
export async function buildModelInput(source: BannerSource): Promise<string> {
  const img = await loadImage(source.dataUrl);

  const longEdge = Math.max(source.width, source.height);
  const scale = longEdge > MODEL_INPUT_EDGE ? MODEL_INPUT_EDGE / longEdge : 1;
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const { canvas, ctx } = createCanvas(width, height);
  // 투명 배경 원본이 검게 깔리지 않도록 흰 바탕을 먼저 채운다 (JPEG 는 알파가 없다)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * 행·열별 엣지 에너지 프로파일.
 * 글자·로고·상품의 경계는 값이 높고, 평평한 배경은 낮다.
 * 이걸로 "내용이 실제로 어디 있는지"를 픽셀 분석 없이 싸게 알아낸다.
 */
function edgeProfiles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): { rows: Float32Array; cols: Float32Array } {
  const rows = new Float32Array(h);
  const cols = new Float32Array(w);
  const { data } = ctx.getImageData(0, 0, w, h);

  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
    lum[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }

  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      const i = y * w + x;
      const e = Math.abs(lum[i] - lum[i - 1]) + Math.abs(lum[i] - lum[i - w]);
      rows[y] += e;
      cols[x] += e;
    }
  }
  return { rows, cols };
}

/** 길이 win 인 창을 슬라이딩하며 에너지 합이 최대인 시작 위치 */
function bestWindowStart(profile: Float32Array, win: number): number {
  const n = profile.length;
  if (win >= n) return 0;

  let sum = 0;
  for (let i = 0; i < win; i++) sum += profile[i];

  let best = sum;
  let bestAt = 0;
  for (let i = win; i < n; i++) {
    sum += profile[i] - profile[i - win];
    if (sum > best) {
      best = sum;
      bestAt = i - win + 1;
    }
  }
  return bestAt;
}

/**
 * 에너지 프로파일에서 "내용이 실제로 들어찬 구간" 을 찾는다.
 * (임계를 넘는 첫 인덱스 ~ 마지막 인덱스)
 *
 * edgeProfiles 는 0번 행·열을 채우지 않으므로 1번부터 본다.
 * 판정에 실패하면 전 구간을 내용으로 보고 보수적으로 동작한다.
 */
function contentSpan(profile: Float32Array): { start: number; end: number } {
  const whole = { start: 0, end: profile.length - 1 };
  if (profile.length < 3) return whole;

  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 1; i < profile.length; i++) {
    if (profile[i] < lo) lo = profile[i];
    if (profile[i] > hi) hi = profile[i];
  }
  if (!(hi > lo)) return whole;

  const thresh = lo + (hi - lo) * CONTENT_THRESHOLD;
  let start = -1;
  let end = -1;
  for (let i = 1; i < profile.length; i++) {
    if (profile[i] >= thresh) {
      if (start < 0) start = i;
      end = i;
    }
  }
  return start < 0 ? whole : { start, end };
}

/**
 * 한 축에서 밴드를 어디에 놓을지 정한다.
 *
 * 1순위는 "내용을 통째로 담기" 다. 내용 구간이 밴드보다 짧으면 그 구간을 밴드 한가운데
 * 두는 것만으로 아무것도 잘리지 않는다. 에너지 합만 보면 이런 경우에도 가장 복잡한 띠로
 * 끌려가, 상단 로고처럼 에너지가 낮은 요소를 통째로 버리는 일이 생긴다.
 * 담을 수 없을 때만 기존 방식(에너지 합 최대)으로 최선을 다하고 clipped 로 알린다.
 */
function placeBand(
  profile: Float32Array,
  analysisLen: number,
  fullLen: number,
  bandLen: number
): { at: number; clipped: boolean } {
  const maxAt = Math.max(0, fullLen - bandLen);
  const win = Math.max(1, Math.round((bandLen / fullLen) * analysisLen));
  const span = contentSpan(profile);
  const spanLen = span.end - span.start + 1;

  // 몇 px 스쳐 지나가는 것까지 "요소가 사라졌다"고 알리면 멀쩡한 결과에도 경고가 붙는다.
  // 그림자·모서리 안티에일리어싱이 밴드를 살짝 넘는 일은 흔하다.
  const tolerance = Math.max(1, Math.round(win * 0.04));

  if (spanLen <= win + tolerance) {
    // 내용 구간의 중심을 밴드 중심에 맞춘다
    const centre = ((span.start + span.end + 1) / 2 / analysisLen) * fullLen;
    const at = Math.round(centre - bandLen / 2);
    return { at: Math.max(0, Math.min(maxAt, at)), clipped: false };
  }

  const at = Math.round((bestWindowStart(profile, win) / analysisLen) * fullLen);
  return { at: Math.max(0, Math.min(maxAt, at)), clipped: true };
}

/**
 * 잘라낼 밴드를 정한다.
 *
 * 크기는 "모델이 실제로 돌려준 이미지"와 "목표 비율"에서 직접 계산한다.
 * 계획상의 좌표를 환산해 쓰면, 모델이 4:1 요청에 4.031 같은 근사 비율을 돌려줄 때
 * 결과가 미세하게 눌린다. 실제 크기에서 목표 비율 사각형을 잘라내면 왜곡이 0 이 된다.
 *
 * 위치는 엣지 에너지로 보정한다. 프롬프트로 세이프 에어리어를 알려줘도 모델이 구성을
 * 위아래로 치우치게 배치하는 일이 잦은데, 무조건 정중앙을 잘라내면 그럴 때 로고나
 * 문구가 통째로 날아간다. 분석에 실패하면(캔버스 오염 등) 중앙으로 폴백한다.
 */
function locateBand(
  img: HTMLImageElement,
  size: BannerSize
): {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  shifted: boolean;
  /** 내용이 밴드보다 넓어 무언가 잘려나간 것이 확실한 경우 */
  clipped: boolean;
} {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  // 목표 비율을 그대로 갖는 최대 사각형
  const targetAr = size.width / size.height;
  const genAr = iw / ih;
  let sw: number;
  let sh: number;
  if (targetAr >= genAr) {
    sw = iw;
    sh = Math.round(iw / targetAr);
  } else {
    sh = ih;
    sw = Math.round(ih * targetAr);
  }
  sw = Math.min(iw, Math.max(1, sw));
  sh = Math.min(ih, Math.max(1, sh));

  const centreX = Math.round((iw - sw) / 2);
  const centreY = Math.round((ih - sh) / 2);

  const cropsY = sh < ih - 1;
  const cropsX = sw < iw - 1;
  if (!cropsX && !cropsY) {
    return { sx: centreX, sy: centreY, sw, sh, shifted: false, clipped: false };
  }

  try {
    const scale = Math.min(1, ANALYSIS_MAX / Math.max(iw, ih));
    const aw = Math.max(8, Math.round(iw * scale));
    const ah = Math.max(8, Math.round(ih * scale));

    const { ctx } = createCanvas(aw, ah);
    ctx.drawImage(img, 0, 0, aw, ah);

    const { rows, cols } = edgeProfiles(ctx, aw, ah);

    let sy = centreY;
    let sx = centreX;
    let clipped = false;

    if (cropsY) {
      const placed = placeBand(rows, ah, ih, sh);
      sy = placed.at;
      clipped = clipped || placed.clipped;
    }
    if (cropsX) {
      const placed = placeBand(cols, aw, iw, sw);
      sx = placed.at;
      clipped = clipped || placed.clipped;
    }

    sx = Math.max(0, Math.min(iw - sw, sx));
    sy = Math.max(0, Math.min(ih - sh, sy));

    // 몇 px 차이는 반올림 오차라 "보정했다"고 알릴 가치가 없다
    const shifted =
      Math.abs(sx - centreX) > sw * 0.02 || Math.abs(sy - centreY) > sh * 0.02;
    return { sx, sy, sw, sh, shifted, clipped };
  } catch {
    // 분석이 불가능하면 중앙으로 폴백한다. 잘렸는지 알 수 없으므로
    // 크롭이 있는 이상 "확인이 필요하다" 쪽으로 보수적으로 판정한다.
    return { sx: centreX, sy: centreY, sw, sh, shifted: false, clipped: true };
  }
}

/**
 * 생성 결과 → 정확히 목표 픽셀 크기의 최종 배너.
 * 모델이 어떤 크기를 돌려주든 왜곡 없이 목표 규격으로 떨어진다.
 */
export async function renderFinal(args: {
  generatedDataUrl: string;
  size: BannerSize;
}): Promise<{
  dataUrl: string;
  generatedWidth: number;
  generatedHeight: number;
  bandShifted: boolean;
  /** 밴드 밖으로 내용이 삐져나가 실제로 잘린 것이 확실한 경우 */
  contentClipped: boolean;
}> {
  const { generatedDataUrl, size } = args;
  const generated = await loadImage(generatedDataUrl);

  const band = locateBand(generated, size);

  const { canvas, ctx } = createCanvas(size.width, size.height);
  ctx.drawImage(
    generated,
    band.sx,
    band.sy,
    band.sw,
    band.sh,
    0,
    0,
    size.width,
    size.height
  );

  return {
    dataUrl: canvas.toDataURL("image/png"),
    generatedWidth: generated.naturalWidth,
    generatedHeight: generated.naturalHeight,
    bandShifted: band.shifted,
    contentClipped: band.clipped,
  };
}

/**
 * 자동 검수 (기획서 14장).
 * 추측 대신 확정적으로 알 수 있는 사실만 경고로 남긴다.
 */
export function buildWarnings(args: {
  plan: BannerGenerationPlan;
  size: BannerSize;
  preserveText: boolean;
  generatedWidth: number;
  generatedHeight: number;
  bandShifted: boolean;
  contentClipped: boolean;
  notes: string[];
}): string[] {
  const {
    plan,
    size,
    preserveText,
    generatedWidth,
    generatedHeight,
    bandShifted,
    contentClipped,
    notes,
  } = args;
  const warnings = [...notes];

  if (plan.cropped) {
    const axis = plan.bandHeight < plan.genHeight ? "상하" : "좌우";
    const kept = Math.round(
      (plan.bandWidth * plan.bandHeight * 100) / (plan.genWidth * plan.genHeight)
    );
    warnings.push(
      `목표 비율(${formatRatio(size.width, size.height)})이 모델이 만들 수 있는 한계를 넘어, 생성 결과의 ${axis}를 잘라 ${kept}%만 사용했습니다.` +
        (bandShifted
          ? " 내용이 치우쳐 있어 잘라낼 위치를 자동 보정했습니다."
          : "")
    );

    // 여기서만 "확인해주세요" 가 아니라 확정적으로 알린다.
    // 밴드보다 내용이 넓다는 건 실제로 무언가 잘렸다는 뜻이다.
    if (contentClipped) {
      warnings.push(
        `내용이 잘라낸 영역까지 걸쳐 있어 로고·문구 일부가 사라졌을 수 있습니다. 다시 생성하거나, 이 비율(${formatRatio(size.width, size.height)})을 크롭 없이 만들 수 있는 Nano Banana 2로 재생성해보세요.`
      );
    }

    if (kept <= EXTREME_CROP_KEPT) {
      warnings.push(
        `이 규격은 선택한 모델이 만들 수 있는 비율에서 많이 벗어나 ${100 - kept}%를 잘라냅니다. 품질이 중요하다면 Nano Banana 2 사용을 권합니다.`
      );
    }
  }

  const genAr = generatedWidth / generatedHeight;
  const planAr = plan.genWidth / plan.genHeight;
  if (generatedWidth > 0 && Math.abs(genAr - planAr) / planAr > 0.02) {
    // 잘라내는 위치는 실제 반환 이미지 기준으로 다시 계산하므로 왜곡은 없다.
    // 다만 요청한 비율과 다르면 잘라내는 양 자체가 예상과 달라진다.
    warnings.push(
      `모델이 요청한 비율과 다른 크기(${generatedWidth}×${generatedHeight})를 반환해, 실제로 잘라낸 양이 위 수치와 다를 수 있습니다.`
    );
  }

  // 레이아웃을 다시 그리는 구조라 문구는 항상 AI 가 재렌더한다.
  // 사람이 반드시 확인해야 하는 지점이므로 매번 남긴다.
  warnings.push(
    preserveText
      ? "레이아웃을 재구성하면서 문구도 다시 그려집니다. 오탈자가 없는지 확인해주세요. (고급 설정의 '원본 문구'를 채우면 정확도가 올라갑니다)"
      : "원본 문구 유지가 꺼져 있어 문구가 원본과 달라질 수 있습니다."
  );

  return warnings;
}
