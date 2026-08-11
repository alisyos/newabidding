// 광고문구 생성 API — OpenAI GPT 호출.
// 매체별로 병렬 생성하고, 글자수·금지표현 검증에 걸린 결과는 1회 재생성(보정)한다.
// 가이드 §5: "글자수는 프롬프트로만 통제하지 말고 반드시 사후 검증하라"

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { collectViolations } from "@/lib/ad-copy-evaluate";
import {
  buildRepairPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from "@/lib/ad-copy-prompt";
import { MEDIA_SPECS } from "@/lib/ad-copy-spec";
import { isReasoningModel } from "@/lib/openai-model";
import type {
  AdCopyErrorCode,
  AdCopyInput,
  AdCopyMediaResult,
  AdMediaKey,
  AdVariantCount,
} from "@/types/ad-copy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 매체 3개 병렬 × (최초 1회 + 보정 1회) 순차 호출이므로 추론 모델 기준 여유를 둔다
export const maxDuration = 300;

/** OPENAI_MODEL 미설정 시 사용할 기본 모델 */
const DEFAULT_MODEL = "gpt-5.6-terra";
/**
 * 추론 모델의 기본 추론 강도.
 * 광고문구는 긴 추론이 불필요하고 지연에 민감하므로 낮게 잡는다.
 */
const DEFAULT_REASONING_EFFORT: OpenAI.ReasoningEffort = "low";
/** 비추론 모델(gpt-4.1 계열 등)에서만 쓰이는 샘플링 온도 */
const LEGACY_TEMPERATURE_GENERATE = 0.8;
const LEGACY_TEMPERATURE_REPAIR = 0.5;
/** 검증 실패 시 재생성 횟수 */
const MAX_REPAIR_ROUNDS = 1;

// ---------------------------------------------------------------- 요청 검증

const variantCountSchema = z.object({
  titles: z.number().int().min(1).max(15),
  descriptions: z.number().int().min(1).max(15),
});

const inputSchema = z.object({
  media: z.array(z.enum(["naver", "kakao", "google"])).min(1).max(3),
  landingUrl: z.string(),
  industry: z.string(),
  brandName: z.string(),
  productName: z.string(),
  targetKeywords: z.array(z.string()).min(1),
  keyBenefits: z.array(z.string()).min(1),
  usp: z.string(),
  cta: z.string(),
  promotion: z.object({
    discountRate: z.string(),
    period: z.string(),
    event: z.string(),
  }),
  price: z.object({
    itemName: z.string(),
    amount: z.string(),
    qualifier: z.string(),
  }),
  targetAudience: z.object({
    gender: z.string(),
    ageRange: z.string(),
    interests: z.string(),
  }),
  toneAndManner: z.string(),
  mustInclude: z.array(z.string()),
  excludeWords: z.array(z.string()),
  superlative: z.object({ use: z.boolean(), evidence: z.string() }),
  reviewNumber: z.string(),
  variantCount: z.object({
    naver: variantCountSchema.optional(),
    kakao: variantCountSchema.optional(),
    google: variantCountSchema.optional(),
  }),
  diversityLevel: z.enum(["보수적", "균형", "실험적"]),
});

const requestSchema = z.object({ input: inputSchema });

// ------------------------------------------------------------- 모델 출력 스키마

/**
 * Structured Outputs 용 JSON 스키마.
 * strict 모드는 minItems/maxItems 를 지원하지 않으므로 개수는 프롬프트로 지시하고
 * 서버에서 slice 로 맞춘다.
 */
const AD_COPY_JSON_SCHEMA = {
  name: "ad_copy_result",
  strict: true,
  schema: {
    type: "object",
    properties: {
      titles: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            reason: { type: "string" },
            angle: {
              type: "string",
              enum: ["혜택", "가격", "신뢰", "긴급성", "브랜드"],
            },
          },
          required: ["text", "reason", "angle"],
          additionalProperties: false,
        },
      },
      descriptions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            reason: { type: "string" },
            angle: {
              type: "string",
              enum: ["혜택", "가격", "신뢰", "긴급성", "브랜드"],
            },
          },
          required: ["text", "reason", "angle"],
          additionalProperties: false,
        },
      },
    },
    required: ["titles", "descriptions"],
    additionalProperties: false,
  },
} as const;

const generatedItemSchema = z.object({
  text: z.string(),
  reason: z.string(),
  angle: z.string(),
});

const modelOutputSchema = z.object({
  titles: z.array(generatedItemSchema),
  descriptions: z.array(generatedItemSchema),
});

type ModelOutput = z.infer<typeof modelOutputSchema>;

// -------------------------------------------------------------------- 에러 매핑

/** 예외 → 사용자에게 보여줄 한국어 메시지. API 키·헤더는 절대 노출하지 않는다. */
function toKoreanError(
  e: unknown,
  model: string
): { code: AdCopyErrorCode; message: string } {
  if (e instanceof OpenAI.APIConnectionTimeoutError) {
    return {
      code: "TIMEOUT",
      message: "생성 시간이 초과되었습니다. 생성 개수를 줄이고 다시 시도해주세요.",
    };
  }
  if (e instanceof OpenAI.APIError) {
    if (e.status === 401) {
      return { code: "INVALID_API_KEY", message: "OpenAI API 키가 올바르지 않습니다." };
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
          }. OPENAI_MODEL 설정을 확인해주세요.`,
        };
      }
      return {
        code: "UPSTREAM_ERROR",
        message: "요청이 OpenAI에서 거부되었습니다. 입력값을 확인해주세요.",
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
  /** 비추론 모델에서만 사용한다. 추론 모델이면 무시된다. */
  temperature: number,
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
    response_format: { type: "json_schema", json_schema: AD_COPY_JSON_SCHEMA },
  };

  if (reasoning) {
    // 추론 모델은 temperature 키 자체를 넣지 않는다.
    // 기본값(1)을 명시해도 400 unsupported_parameter 가 발생한다.
    if (!omitReasoningEffort) {
      params.reasoning_effort = DEFAULT_REASONING_EFFORT;
    }
  } else {
    params.temperature = temperature;
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
      return callModel(client, model, system, user, temperature, true);
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

/** 매체 1개 생성 + 최대 1회 보정 */
async function generateForMedium(
  client: OpenAI,
  model: string,
  media: AdMediaKey,
  input: AdCopyInput
): Promise<AdCopyMediaResult> {
  const spec = MEDIA_SPECS[media];
  const counts: AdVariantCount = input.variantCount[media] ?? {
    titles: spec.fields.title.defaultCount,
    descriptions: spec.fields.description.defaultCount,
  };

  const system = buildSystemPrompt(media, input);
  const user = buildUserPrompt(media, input, counts);
  // 변형 다양성(diversityLevel)은 시스템 프롬프트 지시문으로 반영된다.
  // 추론 모델은 temperature 를 받지 않으므로 샘플링으로 통제할 수 없다.
  let out = await callModel(
    client,
    model,
    system,
    user,
    LEGACY_TEMPERATURE_GENERATE
  );

  let repaired = false;
  for (let round = 0; round < MAX_REPAIR_ROUNDS; round++) {
    const draft: AdCopyMediaResult = {
      media,
      status: "ok",
      repaired,
      titles: out.titles.slice(0, counts.titles),
      descriptions: out.descriptions.slice(0, counts.descriptions),
    };
    const violations = collectViolations(draft, input);
    if (violations.length === 0) break;

    out = await callModel(
      client,
      model,
      system,
      buildRepairPrompt(media, input, counts, violations),
      LEGACY_TEMPERATURE_REPAIR
    );
    repaired = true;
  }

  return {
    media,
    status: "ok",
    repaired,
    titles: out.titles.slice(0, counts.titles),
    descriptions: out.descriptions.slice(0, counts.descriptions),
  };
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

  const input = parsed.data.input as AdCopyInput;
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  // 추론 모델은 응답이 느릴 수 있다. 매체당 최대 2회(최초 + 보정) 순차 호출된다.
  const client = new OpenAI({ apiKey, timeout: 120_000, maxRetries: 1 });

  // 한 매체가 실패해도 나머지 매체 결과는 살린다
  const settled = await Promise.allSettled(
    input.media.map((m) => generateForMedium(client, model, m, input))
  );

  const results: AdCopyMediaResult[] = settled.map((s, i) => {
    if (s.status === "fulfilled") {
      // 호출은 성공했지만 문구가 한 건도 없으면 성공으로 볼 수 없다.
      // 실패로 표시해 두면 아래의 "전 매체 실패 → 502" 승격이 이 경우까지 덮는다.
      if (s.value.titles.length + s.value.descriptions.length === 0) {
        return {
          ...s.value,
          status: "error",
          errorMessage: "문구가 생성되지 않았습니다. 다시 시도해주세요.",
        };
      }
      return s.value;
    }
    return {
      media: input.media[i],
      status: "error",
      errorMessage: toKoreanError(s.reason, model).message,
      titles: [],
      descriptions: [],
      repaired: false,
    };
  });

  // 전 매체 실패면 전체 오류로 승격 — 클라이언트가 포인트를 차감하지 않도록 한다
  if (results.every((r) => r.status === "error")) {
    const first = settled.find((s) => s.status === "rejected");
    const mapped =
      first && first.status === "rejected"
        ? toKoreanError(first.reason, model)
        : { code: "UPSTREAM_ERROR" as AdCopyErrorCode, message: "광고문구 생성에 실패했습니다." };
    return NextResponse.json({ error: mapped }, { status: 502 });
  }

  return NextResponse.json({ model, results });
}
