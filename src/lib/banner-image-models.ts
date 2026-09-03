// 이미지 생성 모델 어댑터 (서버 전용).
//
// 두 공급사의 호출 방식이 완전히 달라서 라우트가 아니라 여기에 모아 둔다.
//   - GPT-Image-2 : openai SDK 의 images.edit (multipart). WIDTHxHEIGHT 임의 지정 가능.
//                   마스크는 쓰지 않는다 — 영역을 잠그면 레이아웃 재구성이 막힌다.
//   - Nano Banana 2 : Google Interactions API (/v1beta/interactions) REST 직접 호출.
//                     레거시 generateContent 가 아니며, 픽셀 크기 대신 aspect_ratio 열거값을 받는다.
//
// 모델 ID·엔드포인트는 공급사 사정으로 바뀔 수 있으므로 전부 환경변수로 덮어쓸 수 있게 둔다.

import OpenAI, { toFile } from "openai";

import type {
  BannerGenerationPlan,
  BannerModelKey,
  BannerResizeErrorCode,
} from "@/types/banner-resize";

export const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-2";
export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";
const DEFAULT_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_IMAGE_SIZE = "2K";

/** 모델 1회 호출 제한 시간 — 이미지 생성은 규격당 20~60초가 걸린다 */
const CALL_TIMEOUT_MS = 150_000;

export interface GeneratedImage {
  /** PNG/JPEG data URL */
  dataUrl: string;
  /** 사용자에게 그대로 보여줄 참고 사항 (현재는 비어 있지만 폴백 안내용으로 남겨 둔다) */
  notes: string[];
}

/** data URL → { buffer, mimeType, base64 } */
export function decodeDataUrl(dataUrl: string): {
  buffer: Buffer;
  base64: string;
  mimeType: string;
} {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error("이미지 데이터 형식이 올바르지 않습니다.");
  const mimeType = match[1];
  const base64 = match[2];
  return { buffer: Buffer.from(base64, "base64"), base64, mimeType };
}

// ------------------------------------------------------------------ GPT-Image-2

/**
 * 원본을 참조로 주고 새 캔버스 크기로 다시 디자인하게 한다.
 * 마스크는 쓰지 않는다 — 특정 영역을 잠그면 레이아웃 재배치가 불가능해진다.
 */
async function callGptImage(
  apiKey: string,
  model: string,
  sourceDataUrl: string,
  prompt: string,
  plan: BannerGenerationPlan
): Promise<GeneratedImage> {
  const client = new OpenAI({ apiKey, timeout: CALL_TIMEOUT_MS, maxRetries: 1 });
  const source = decodeDataUrl(sourceDataUrl);

  const image = await toFile(source.buffer, "source.jpg", {
    type: source.mimeType,
  });

  const res = await client.images.edit({
    model,
    image,
    prompt,
    size: `${plan.genWidth}x${plan.genHeight}`,
    // 배치는 자유롭게 바꾸되 상품·인물의 "외형"은 원본을 따라가게 한다
    input_fidelity: "high",
    // gpt-image-2 는 transparent 를 거부한다 (opaque/auto 만 허용)
    background: "opaque",
    output_format: "png",
    n: 1,
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("모델이 이미지를 반환하지 않았습니다.");
  return { dataUrl: `data:image/png;base64,${b64}`, notes: [] };
}

// ------------------------------------------------------------- Nano Banana 2

interface GeminiContentBlock {
  type?: string;
  data?: string;
  mime_type?: string;
  text?: string;
}

interface GeminiStep {
  type?: string;
  content?: GeminiContentBlock[];
}

interface GeminiInteraction {
  status?: string;
  steps?: GeminiStep[];
  errors?: { code?: string; message?: string }[];
}

/** REST 호출에서 나온 오류를 OpenAI 와 같은 방식으로 다룰 수 있게 감싼다 */
export class GeminiApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "GeminiApiError";
    this.status = status;
    this.code = code;
  }
}

async function callGemini(
  apiKey: string,
  model: string,
  sourceDataUrl: string,
  prompt: string,
  plan: BannerGenerationPlan
): Promise<GeneratedImage> {
  const base = process.env.GEMINI_API_BASE || DEFAULT_GEMINI_BASE;
  const imageSize = process.env.GEMINI_IMAGE_SIZE || DEFAULT_GEMINI_IMAGE_SIZE;
  const source = decodeDataUrl(sourceDataUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${base}/interactions`, {
      method: "POST",
      headers: {
        // 쿼리스트링(?key=)을 쓰면 키가 URL 로그에 남는다. 항상 헤더로 보낸다.
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        // 기본값이 true 라 광고주 소재가 공급사에 저장된다. 멀티턴을 쓰지 않으므로 끈다.
        store: false,
        input: [
          { type: "text", text: prompt },
          // data URL 접두사를 뗀 순수 base64 여야 한다
          { type: "image", mime_type: source.mimeType, data: source.base64 },
        ],
        response_format: {
          type: "image",
          // Interactions API 는 출력 포맷으로 image/jpeg 만 받는다.
          // image/png 를 보내면 400 "not supported for 'response_format.mime_type'" 이 난다.
          // (gpt-image-2 는 output_format: "png" 를 받으므로 두 공급사가 서로 다르다)
          mime_type: "image/jpeg",
          ...(plan.aspectRatio ? { aspect_ratio: plan.aspectRatio } : {}),
          image_size: imageSize,
        },
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new GeminiApiError(504, "deadline_exceeded", "요청 시간 초과");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
    throw new GeminiApiError(
      res.status,
      err?.code ?? "unknown",
      err?.message ?? `HTTP ${res.status}`
    );
  }

  const interaction = (json ?? {}) as GeminiInteraction;
  const image = (interaction.steps ?? [])
    .flatMap((s) => (s?.type === "model_output" ? s.content ?? [] : []))
    .find((c) => c?.type === "image" && typeof c.data === "string");

  if (!image?.data) {
    // HTTP 200 이어도 status 가 completed 가 아니거나 이미지 블록이 없을 수 있다
    const reason =
      interaction.errors?.[0]?.message ??
      (interaction.status && interaction.status !== "completed"
        ? `생성 상태: ${interaction.status}`
        : "모델이 이미지를 반환하지 않았습니다.");
    throw new GeminiApiError(502, "empty_result", reason);
  }

  return {
    dataUrl: `data:${image.mime_type || "image/png"};base64,${image.data}`,
    notes: [],
  };
}

// ------------------------------------------------------------------ 공통 진입점

export function resolveModelId(model: BannerModelKey): string {
  return model === "gpt-image-2"
    ? process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_IMAGE_MODEL
    : process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL;
}

export function generateBanner(args: {
  model: BannerModelKey;
  modelId: string;
  apiKey: string;
  sourceDataUrl: string;
  prompt: string;
  plan: BannerGenerationPlan;
}): Promise<GeneratedImage> {
  const { model, modelId, apiKey, sourceDataUrl, prompt, plan } = args;
  return model === "gpt-image-2"
    ? callGptImage(apiKey, modelId, sourceDataUrl, prompt, plan)
    : callGemini(apiKey, modelId, sourceDataUrl, prompt, plan);
}

// -------------------------------------------------------------------- 에러 매핑

/** 예외 → 사용자에게 보여줄 한국어 메시지. API 키·헤더는 절대 노출하지 않는다. */
export function toKoreanError(
  e: unknown,
  modelId: string
): { code: BannerResizeErrorCode; message: string } {
  if (e instanceof OpenAI.APIConnectionTimeoutError) {
    return {
      code: "TIMEOUT",
      message:
        "이미지 생성 시간이 초과되었습니다. 규격 수를 줄이고 다시 시도해주세요.",
    };
  }

  if (e instanceof GeminiApiError) {
    if (e.status === 401 || e.status === 403) {
      return {
        code: "INVALID_API_KEY",
        message: "Gemini API 키가 올바르지 않거나 권한이 없습니다.",
      };
    }
    if (e.status === 429) {
      // 429 에는 성격이 다른 두 가지가 섞여 있다.
      //   (a) 분당 요청 초과 → 기다리면 풀린다
      //   (b) 할당량 자체가 0 (결제 미활성 프로젝트) → 기다려도 절대 안 풀린다
      // 둘을 같은 문구로 뭉뚱그리면 (b) 인 사용자가 원인을 못 찾고 재시도만 반복하게 된다.
      if (/limit:\s*0|billing|exceeded your current quota/i.test(e.message)) {
        return {
          code: "RATE_LIMITED",
          message:
            `Gemini 이미지 모델("${modelId}")에 사용 가능한 할당량이 없습니다. ` +
            "무료 티어 할당량이 0이면 재시도해도 풀리지 않습니다. " +
            "Google Cloud 프로젝트에 결제를 활성화하거나 https://ai.dev/rate-limit 에서 할당량을 확인해주세요.",
        };
      }
      return {
        code: "RATE_LIMITED",
        message: "Gemini 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
      };
    }
    if (e.status === 404) {
      return {
        code: "UPSTREAM_ERROR",
        message: `모델 "${modelId}" 을 찾을 수 없습니다. GEMINI_IMAGE_MODEL 설정을 확인해주세요.`,
      };
    }
    if (e.status === 504) {
      return {
        code: "TIMEOUT",
        message: "Gemini 응답이 시간 내에 오지 않았습니다. 다시 시도해주세요.",
      };
    }
    if (e.code === "empty_result") {
      return { code: "EMPTY_RESULT", message: e.message };
    }
    return {
      code: "UPSTREAM_ERROR",
      message: `Gemini 오류(${e.status})가 발생했습니다. ${e.message}`,
    };
  }

  if (e instanceof OpenAI.APIError) {
    if (e.status === 401) {
      return {
        code: "INVALID_API_KEY",
        message: "OpenAI API 키가 올바르지 않습니다.",
      };
    }
    if (e.status === 429) {
      // Gemini 쪽과 같은 이유로 "크레딧 소진"과 "분당 한도 초과"를 나눈다
      if (e.code === "insufficient_quota") {
        return {
          code: "RATE_LIMITED",
          message:
            "OpenAI 계정의 크레딧이 부족합니다. 결제 정보와 잔액을 확인해주세요. (재시도해도 해결되지 않습니다)",
        };
      }
      return {
        code: "RATE_LIMITED",
        message: "OpenAI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
      };
    }
    if (e.status === 404) {
      return {
        code: "UPSTREAM_ERROR",
        message: `모델 "${modelId}" 에 접근할 수 없습니다. 모델명과 계정 권한을 확인해주세요.`,
      };
    }
    if (e.status === 400) {
      if (e.code === "unsupported_parameter" || e.code === "unsupported_value") {
        return {
          code: "UPSTREAM_ERROR",
          message: `현재 모델(${modelId})이 지원하지 않는 값입니다${
            e.param ? `: ${e.param}` : ""
          }. OPENAI_IMAGE_MODEL 설정을 확인해주세요.`,
        };
      }
      return {
        code: "UPSTREAM_ERROR",
        message:
          "요청이 OpenAI에서 거부되었습니다. 원본 이미지에 부적절한 내용이 없는지 확인해주세요.",
      };
    }
    return {
      code: "UPSTREAM_ERROR",
      message: `OpenAI 오류(${e.status ?? "unknown"})가 발생했습니다.`,
    };
  }

  return {
    code: "UNKNOWN",
    message: e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.",
  };
}
