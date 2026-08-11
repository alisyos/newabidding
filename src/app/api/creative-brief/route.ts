// 광고 소재 기획 생성 API — OpenAI GPT 호출.
// ad-copy 라우트와 달리 매체별 fan-out 없이 단일 호출로 헤드라인·바디카피·콘셉트를 한 번에 받는다.
// 크리에이티브 산출물이라 글자수·금지어 사후 검증/재생성 루프는 두지 않는다.

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import {
  buildSystemPrompt,
  buildUserPrompt,
} from "@/lib/creative-brief-prompt";
import {
  COUNT_RANGE,
  MAX_MEDIA,
  MAX_REFERENCE_CHARS,
  MAX_TONES,
} from "@/lib/creative-brief-spec";
import { isReasoningModel } from "@/lib/openai-model";
import type {
  CreativeBriefErrorCode,
  CreativeBriefInput,
  CreativeBriefResult,
} from "@/types/creative-brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 호출 1회지만 추론 모델은 응답이 느릴 수 있다
export const maxDuration = 180;

/** 전용 모델 미설정 시 OPENAI_MODEL, 그것도 없으면 이 값을 쓴다 */
const DEFAULT_MODEL = "gpt-5.6-terra";
/**
 * 아이디어 발상 품질이 목적이므로 ad-copy(low)보다 추론 강도를 높인다.
 */
const DEFAULT_REASONING_EFFORT: OpenAI.ReasoningEffort = "medium";
/** 비추론 모델(gpt-4.1 계열 등)에서만 쓰이는 샘플링 온도 — 창의성 우선 */
const LEGACY_TEMPERATURE = 1.0;

// ---------------------------------------------------------------- 요청 검증

const inputSchema = z.object({
  advertiser: z.string(),
  industry: z.string(),
  productName: z.string(),
  media: z
    .array(
      z.enum([
        "instagram",
        "youtube",
        "naver",
        "kakao",
        "facebook",
        "display",
        "tv",
        "ooh",
      ])
    )
    .min(1)
    .max(MAX_MEDIA),
  targetAudience: z.object({
    ageRange: z.string(),
    gender: z.string(),
    interests: z.string(),
  }),
  audienceDescription: z.string(),
  objective: z.enum([
    "브랜드인지",
    "구매전환",
    "트래픽",
    "앱설치",
    "리드확보",
    "재구매",
  ]),
  toneAndManner: z.array(z.string()).max(MAX_TONES),
  keyMessages: z.array(z.string()),
  mustInclude: z.array(z.string()),
  excludeWords: z.array(z.string()),
  referencePlan: z.string().max(MAX_REFERENCE_CHARS),
  copyGuide: z.string().max(MAX_REFERENCE_CHARS),
  variantCount: z.object({
    headlines: z.number().int().min(COUNT_RANGE.min).max(COUNT_RANGE.max),
    bodyCopies: z.number().int().min(COUNT_RANGE.min).max(COUNT_RANGE.max),
    concepts: z.number().int().min(COUNT_RANGE.min).max(COUNT_RANGE.max),
  }),
});

const requestSchema = z.object({ input: inputSchema });

// ------------------------------------------------------------- 모델 출력 스키마

/**
 * Structured Outputs 용 JSON 스키마.
 * strict 모드는 minItems/maxItems 를 지원하지 않으므로 개수는 프롬프트로 지시하고
 * 서버에서 slice 로 맞춘다. (ad-copy 라우트와 동일한 제약)
 */
const OPTION_ITEM = {
  type: "object",
  properties: {
    text: { type: "string" },
    reason: { type: "string" },
    tone: { type: "string" },
  },
  required: ["text", "reason", "tone"],
  additionalProperties: false,
} as const;

const CREATIVE_BRIEF_JSON_SCHEMA = {
  name: "creative_brief_result",
  strict: true,
  schema: {
    type: "object",
    properties: {
      headlines: { type: "array", items: OPTION_ITEM },
      bodyCopies: { type: "array", items: OPTION_ITEM },
      concepts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            direction: { type: "string" },
            keyMessage: { type: "string" },
            visualDirection: { type: "string" },
            reason: { type: "string" },
          },
          required: [
            "name",
            "direction",
            "keyMessage",
            "visualDirection",
            "reason",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["headlines", "bodyCopies", "concepts"],
    additionalProperties: false,
  },
} as const;

const optionSchema = z.object({
  text: z.string(),
  reason: z.string(),
  tone: z.string(),
});

const modelOutputSchema = z.object({
  headlines: z.array(optionSchema),
  bodyCopies: z.array(optionSchema),
  concepts: z.array(
    z.object({
      name: z.string(),
      direction: z.string(),
      keyMessage: z.string(),
      visualDirection: z.string(),
      reason: z.string(),
    })
  ),
});

type ModelOutput = z.infer<typeof modelOutputSchema>;

/**
 * 내용이 없는 안을 걸러낸다.
 *
 * strict 스키마도 zod 도 빈 문자열을 막지 못해서, 모델이 자리만 채운
 * { text: "" } 가 그대로 통과한다. 자르기(slice) 전에 걸러야
 * 빈 항목이 요청 개수 한 자리를 차지하는 것도 함께 막힌다.
 */
function withText<T extends { text: string }>(items: T[]): T[] {
  return items.filter((item) => item.text.trim().length > 0);
}

// -------------------------------------------------------------------- 에러 매핑

/** 예외 → 사용자에게 보여줄 한국어 메시지. API 키·헤더는 절대 노출하지 않는다. */
function toKoreanError(
  e: unknown,
  model: string
): { code: CreativeBriefErrorCode; message: string } {
  if (e instanceof OpenAI.APIConnectionTimeoutError) {
    return {
      code: "TIMEOUT",
      message: "생성 시간이 초과되었습니다. 생성 개수를 줄이고 다시 시도해주세요.",
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
      return {
        code: "RATE_LIMITED",
        message: "OpenAI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
      };
    }
    if (e.status === 404) {
      return {
        code: "UPSTREAM_ERROR",
        message: `모델 "${model}" 에 접근할 수 없습니다. 모델명과 계정 권한을 확인해주세요.`,
      };
    }
    if (e.status === 400) {
      // 모델 세대 차이로 지원 파라미터가 다를 때(예: 추론 모델의 temperature) 원인을 드러낸다
      if (e.code === "unsupported_parameter" || e.code === "unsupported_value") {
        return {
          code: "UPSTREAM_ERROR",
          message: `현재 모델(${model})이 지원하지 않는 파라미터입니다${
            e.param ? `: ${e.param}` : ""
          }. OPENAI_CREATIVE_MODEL/OPENAI_MODEL 설정을 확인해주세요.`,
        };
      }
      return {
        code: "UPSTREAM_ERROR",
        message:
          "요청이 OpenAI에서 거부되었습니다. 참조 자료에 부적절한 내용이 없는지 확인해주세요.",
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

// -------------------------------------------------------------------- 모델 호출

async function callModel(
  client: OpenAI,
  model: string,
  system: string,
  user: string,
  /** reasoning_effort 를 뺀 채 재시도하는 폴백 플래그 */
  omitReasoningEffort = false
): Promise<ModelOutput> {
  const reasoning = isReasoningModel(model);

  const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: CREATIVE_BRIEF_JSON_SCHEMA,
    },
  };

  if (reasoning) {
    // 추론 모델은 temperature 키 자체를 넣지 않는다.
    // 기본값(1)을 명시해도 400 unsupported_parameter 가 발생한다.
    if (!omitReasoningEffort) {
      params.reasoning_effort = DEFAULT_REASONING_EFFORT;
    }
  } else {
    params.temperature = LEGACY_TEMPERATURE;
  }

  let res;
  try {
    res = await client.chat.completions.create(params);
  } catch (e) {
    // 일부 모델은 특정 조합에서 reasoning_effort 를 거부한다 → 1회만 빼고 재시도
    if (
      reasoning &&
      !omitReasoningEffort &&
      e instanceof OpenAI.APIError &&
      e.status === 400 &&
      /reasoning_effort/i.test(`${e.param ?? ""} ${e.message ?? ""}`)
    ) {
      return callModel(client, model, system, user, true);
    }
    throw e;
  }

  const msg = res.choices[0]?.message;
  if (msg?.refusal) {
    throw new Error(`모델이 생성을 거부했습니다: ${msg.refusal}`);
  }
  const raw = msg?.content;
  if (!raw) {
    throw new Error("모델 응답이 비어 있습니다.");
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("모델 응답을 JSON으로 해석할 수 없습니다.");
  }

  const parsed = modelOutputSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("모델 응답 형식이 올바르지 않습니다.");
  }
  return parsed.data;
}

// ------------------------------------------------------------------- 라우트 핸들러

export async function POST(req: Request) {
  // 환경변수는 반드시 핸들러 내부에서 읽는다.
  // 모듈 top-level 에서 읽고 throw 하면 next build 가 실패한다.
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: {
          code: "MISSING_API_KEY",
          message:
            "OPENAI_API_KEY가 설정되지 않았습니다. 프로젝트 루트에 .env.local 을 만들어 키를 추가한 뒤 개발 서버를 재시작해주세요.",
        },
      },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "요청 값이 올바르지 않습니다. 필수 입력값을 확인해주세요.",
        },
      },
      { status: 400 }
    );
  }

  const input = parsed.data.input as CreativeBriefInput;
  // 크리에이티브 전용 모델을 따로 지정할 수 있게 한다 (미설정 시 공용 모델로 폴백)
  const model =
    process.env.OPENAI_CREATIVE_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const client = new OpenAI({ apiKey, timeout: 150_000, maxRetries: 1 });

  try {
    const out = await callModel(
      client,
      model,
      buildSystemPrompt(input),
      buildUserPrompt(input)
    );

    // strict 스키마가 개수를 강제하지 못하므로 서버에서 요청 개수로 맞춘다
    const result: CreativeBriefResult = {
      headlines: withText(out.headlines).slice(0, input.variantCount.headlines),
      bodyCopies: withText(out.bodyCopies).slice(0, input.variantCount.bodyCopies),
      concepts: out.concepts
        .filter((c) => c.name.trim().length > 0 && c.direction.trim().length > 0)
        .slice(0, input.variantCount.concepts),
    };

    // 세 영역 중 하나라도 비면 기획안으로 쓸 수 없다.
    // 화면 선택 상태와 문서 내보내기가 각 배열의 [0] 을 전제로 동작하기 때문이다.
    // 요청 개수에 못 미치는 것(3개 요청 → 1개)은 실패로 보지 않는다.
    // 이 기능은 건당이 아니라 실행 1회당 과금이라 초과 청구가 아니고,
    // 쓸 만한 나머지 안까지 버리는 편이 사용자에게 더 손해다.
    const missing = [
      result.headlines.length === 0 ? "헤드라인" : null,
      result.bodyCopies.length === 0 ? "바디카피" : null,
      result.concepts.length === 0 ? "콘셉트" : null,
    ].filter((v): v is string => v !== null);

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "EMPTY_RESULT",
            message: `${missing.join("·")} 안이 생성되지 않았습니다. 입력값을 보완한 뒤 다시 시도해주세요. (포인트는 차감되지 않았습니다)`,
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ model, result });
  } catch (e) {
    // 실패 시 클라이언트가 포인트를 차감하지 않도록 항상 error 응답으로 내려보낸다
    const mapped = toKoreanError(e, model);
    return NextResponse.json({ error: mapped }, { status: 502 });
  }
}
