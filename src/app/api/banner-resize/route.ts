// AI 배너 리사이징 생성 API.
//
// [설계] "규격 1건 = 요청 1건" 이다.
// 여러 규격을 한 응답에 담으면 base64 PNG 가 규격 수만큼 쌓여 응답이 수십 MB 가 되고
// 서버리스 응답 한도와 브라우저 메모리 양쪽에서 터진다.
// 클라이언트가 규격별로 나눠 호출하므로 진행률 표시와 개별 재생성도 이 라우트 하나로 끝난다.
//
// 클라이언트는 원본을 참조 이미지로 줄여 보내고, 서버는 "이 배너를 {W}x{H} 슬롯에 맞게
// 다시 디자인하라"는 프롬프트로 모델을 호출한다. (기하 계산은 banner-resize-spec.ts)

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  generateBanner,
  resolveModelId,
  toKoreanError,
} from "@/lib/banner-image-models";
import { buildResizePrompt } from "@/lib/banner-resize-prompt";
import {
  BANNER_MODELS,
  MAX_SIZES,
  MAX_SOURCE_TEXT_CHARS,
  SIZE_RANGE,
} from "@/lib/banner-resize-spec";
import type { BannerModelKey } from "@/types/banner-resize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 이미지 생성은 규격 1건에도 20~60초가 걸린다
export const maxDuration = 300;

/** 참조 이미지 data URL 상한 — 서버리스 요청 본문 한도(≈4.5MB) 안에 들어오게 막는다 */
const MAX_CANVAS_CHARS = 6_000_000;

const dataUrlSchema = z
  .string()
  .regex(/^data:image\/(png|jpeg|webp);base64,/, "이미지 형식이 올바르지 않습니다.")
  .max(MAX_CANVAS_CHARS);

const sizeSchema = z.object({
  id: z.string().min(1).max(32),
  width: z.number().int().min(SIZE_RANGE.min).max(SIZE_RANGE.max),
  height: z.number().int().min(SIZE_RANGE.min).max(SIZE_RANGE.max),
  label: z.string().max(40),
});

const planSchema = z.object({
  genWidth: z.number().int().min(64).max(4096),
  genHeight: z.number().int().min(64).max(4096),
  bandX: z.number().int().min(0),
  bandY: z.number().int().min(0),
  bandWidth: z.number().int().min(1),
  bandHeight: z.number().int().min(1),
  cropped: z.boolean(),
  aspectRatio: z.string().max(8).optional(),
});

const optionsSchema = z.object({
  preserveProduct: z.boolean(),
  preserveText: z.boolean(),
  preserveLogo: z.boolean(),
  expandBackground: z.boolean(),
  composition: z.enum(["auto", "center", "subject", "background"]),
  sourceText: z.string().max(MAX_SOURCE_TEXT_CHARS),
});

const requestSchema = z.object({
  model: z.enum(["nano-banana-2", "gpt-image-2"]),
  size: sizeSchema,
  plan: planSchema,
  sourceDataUrl: dataUrlSchema,
  options: optionsSchema,
  sourceMeta: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    hasAlpha: z.boolean(),
  }),
});

/** 선택한 모델에 필요한 키만 확인한다 (한쪽 키만 있어도 그 모델은 쓸 수 있어야 한다) */
function readApiKey(model: BannerModelKey): string | undefined {
  return model === "gpt-image-2"
    ? process.env.OPENAI_API_KEY
    : process.env.GEMINI_API_KEY;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: `요청 값이 올바르지 않습니다. 규격은 한 번에 최대 ${MAX_SIZES}개까지 생성할 수 있습니다.`,
        },
      },
      { status: 400 }
    );
  }

  const input = parsed.data;

  // 환경변수는 반드시 핸들러 내부에서 읽는다.
  // 모듈 top-level 에서 읽고 throw 하면 next build 가 실패한다.
  const apiKey = readApiKey(input.model);
  if (!apiKey) {
    const spec = BANNER_MODELS[input.model];
    return NextResponse.json(
      {
        error: {
          code: "MISSING_API_KEY",
          message: `${spec.label}(${spec.subLabel})을 쓰려면 ${spec.envKey} 가 필요합니다. 프로젝트 루트 .env.local 에 값을 넣고 개발 서버를 재시작해주세요.`,
        },
      },
      { status: 500 }
    );
  }

  const modelId = resolveModelId(input.model);

  try {
    const generated = await generateBanner({
      model: input.model,
      modelId,
      apiKey,
      sourceDataUrl: input.sourceDataUrl,
      prompt: buildResizePrompt(
        input.size,
        input.plan,
        input.options,
        input.sourceMeta
      ),
      plan: input.plan,
    });

    return NextResponse.json({
      modelId,
      image: { dataUrl: generated.dataUrl },
      notes: generated.notes,
    });
  } catch (e) {
    // 실패 시 클라이언트가 포인트를 차감하지 않도록 항상 error 응답으로 내려보낸다
    return NextResponse.json({ error: toKoreanError(e, modelId) }, { status: 502 });
  }
}
