// 배너 리사이징 프롬프트 빌더.
//
// 성격: "배경만 채워라"가 아니라 "아트 디렉터로서 새 규격에 맞게 다시 디자인하라" 다.
// 원본을 그대로 참조로 넘기고 레이아웃 재배치 권한을 준다.
// (원본을 캔버스에 미리 박아 두고 여백만 채우게 하면 좌우에 배경만 붙는 결과가 나온다)
//
// 단 하나 강하게 잠그는 것은 "문구 내용"이다.
// 위치·크기·줄바꿈은 자유롭게 바꾸되 단어와 철자는 원본 그대로여야 한다.
// (AI 가 한글을 임의로 다시 쓰면 오탈자·브랜드 훼손이 발생한다)
//
// 이미지 모델은 영어 지시를 더 안정적으로 따르므로 프롬프트는 영어로 작성하고,
// 사용자에게 보이지 않는 서버 내부 문자열로만 쓴다.

import type {
  BannerGenerationPlan,
  BannerResizeOptions,
  BannerSize,
} from "@/types/banner-resize";

const COMPOSITION_HINT: Record<string, string> = {
  auto: "Choose whatever arrangement a professional ad designer would pick for this shape.",
  subject:
    "Make the product or person the hero: give it the most space and let the copy support it.",
  center:
    "Lead with the message: give the headline and call-to-action the most visual weight, with the product supporting it.",
  background:
    "Let the scene carry the ad: give the background and atmosphere room to breathe and keep the elements compact.",
};

/** 사람이 읽는 비율 표기 — 프롬프트에서 "형태가 얼마나 다른지" 를 알려주는 데 쓴다 */
function ratioText(width: number, height: number): string {
  const r = width / height;
  if (r > 1.05) return `${r.toFixed(2)}:1 landscape`;
  if (r < 0.95) return `1:${(1 / r).toFixed(2)} portrait`;
  return "1:1 square";
}

/**
 * 한 규격 1회 호출용 프롬프트.
 *
 * plan.cropped 가 true 면 최종 결과는 캔버스 중앙 밴드만 잘라 쓴다.
 * 이때 프롬프트는 "캔버스(모델이 그리는 그림)" 와 "아트보드(실제로 납품되는 광고)" 를
 * 반드시 구분해야 한다.
 *
 * [이전 실패] 세이프 에어리어를 알려주면서도 다른 줄에서
 *   "Fill the entire canvas edge to edge" / "Deliver one {genW}x{genH} banner"
 * 라고 지시했다. 모델 입장에서는 정반대 요구가 동시에 들어온 셈이고,
 * 결국 캔버스 전체를 광고로 채운 뒤 우리가 그 25% 를 잘라내 로고·문구가 날아갔다.
 * 그래서 크롭이 있는 경우에는 "채워야 할 면" 을 전부 아트보드로 바꿔 말한다.
 */
export function buildResizePrompt(
  size: BannerSize,
  plan: BannerGenerationPlan,
  options: BannerResizeOptions,
  sourceMeta: { width: number; height: number }
): string {
  const lines: string[] = [];

  // 잘려나가는 여백(bleed) 계산 — 크롭이 없으면 전부 0 이다
  const cutTop = plan.bandY;
  const cutBottom = plan.genHeight - (plan.bandY + plan.bandHeight);
  const cutLeft = plan.bandX;
  const cutRight = plan.genWidth - (plan.bandX + plan.bandWidth);
  const vertical = cutTop + cutBottom > cutLeft + cutRight;

  // 픽셀 좌표보다 "위 N%" 같은 비율 표현을 훨씬 잘 따르지만,
  // 픽셀도 함께 주면 경계가 모호해지지 않는다. 둘 다 준다.
  const pctTop = Math.round((cutTop / plan.genHeight) * 100);
  const pctBottom = Math.round((cutBottom / plan.genHeight) * 100);
  const pctLeft = Math.round((cutLeft / plan.genWidth) * 100);
  const pctRight = Math.round((cutRight / plan.genWidth) * 100);

  const cropped = plan.cropped;
  /** 광고로 채워야 하는 면 — 크롭이 있으면 캔버스가 아니라 아트보드다 */
  const surface = cropped ? "artboard" : "canvas";
  const artboard = `${plan.bandWidth}x${plan.bandHeight}`;

  // 목표 규격에서 8px 로 보이려면 생성 캔버스에서 몇 px 이어야 하는지.
  // 최종 렌더가 밴드(bandHeight)를 목표 높이로 축소하므로 그 배율을 곱한다.
  const legibilityScale = plan.bandHeight / size.height;
  const minLegalPx = Math.max(8, Math.round(8 * legibilityScale));
  const safeMarginPx = Math.max(10, Math.round(10 * legibilityScale));

  lines.push(
    "You are an art director adapting an existing advertising banner to a new ad slot.",
    "",
    `REFERENCE: the supplied image is the original banner, ${sourceMeta.width}x${sourceMeta.height} (${ratioText(sourceMeta.width, sourceMeta.height)}).`,
    `TARGET: a ${size.width}x${size.height} ad slot (${ratioText(size.width, size.height)}).`,
    "The two shapes are different, so a full REDESIGN is required. Do not simply pad, letterbox, stretch or centre the original with filler on the sides — that is a failed result."
  );

  // 출력물이 어떻게 쓰이는지를 레이아웃 지시보다 "먼저" 알려준다.
  // 중반부에 두면 앞선 지시에 묻혀 캔버스 전체를 광고로 채워 버린다.
  if (cropped) {
    lines.push(
      "",
      "HOW YOUR OUTPUT IS USED — READ THIS BEFORE YOU DESIGN ANYTHING:",
      `You will paint a ${plan.genWidth}x${plan.genHeight} image, but only its central ${artboard} strip is delivered to the client.`,
      vertical
        ? `The top ${cutTop}px (${pctTop}%) and the bottom ${cutBottom}px (${pctBottom}%) of that image are BLEED: they are trimmed off and thrown away.`
        : `The left ${cutLeft}px (${pctLeft}%) and the right ${cutRight}px (${pctRight}%) of that image are BLEED: they are trimmed off and thrown away.`,
      `So the ARTBOARD — the advertisement itself — is that central ${artboard} strip (${ratioText(plan.bandWidth, plan.bandHeight)}). It has to work as a complete ${size.width}x${size.height} banner entirely on its own.`,
      "Design the advert to fill the artboard exactly, and let ONLY the background continue outward into the bleed."
    );
  }

  lines.push(
    "",
    cropped ? "REBUILD THE LAYOUT INSIDE THE ARTBOARD:" : "REBUILD THE LAYOUT:",
    "- Move, resize and regroup every element — product, headline, body copy, logo, call-to-action — so the banner reads naturally at the new shape.",
    "- For a wide, short slot: put the key visual on one side and stack the copy beside it in a horizontal reading order.",
    "- For a tall, narrow slot: stack the elements vertically with clear hierarchy.",
    `- Fill the entire ${cropped ? "ARTBOARD" : "canvas"} edge to edge. No empty side panels, no borders, no frame, no letterboxing.`,
    "- Keep the copy block and the product shot in separate zones: the product must never sit inside or across a line of text, and must never break a sentence into two pieces. On a wide, short slot, place the copy flush left and put the product between the end of the copy block and the call-to-action.",
    "- All type runs horizontally. No vertical, rotated or arced text anywhere, including on the product's own surface.",
    "- Underlines, swashes and other decorative strokes must stay within the copy block they belong to — they must not run out into the margin or cross another element.",
    `- ${COMPOSITION_HINT[options.composition] ?? COMPOSITION_HINT.auto}`
  );

  const keep: string[] = [
    "Keep the brand's colour palette, typographic style and overall visual language identical to the reference.",
  ];
  if (options.preserveProduct) {
    keep.push(
      "Reproduce the product, packaging and any people exactly as they look in the reference — same shape, colour, material and branding. You may reposition and rescale them, but never restyle or redesign them. (Reproducing the packaging does NOT mean reproducing its fine print — see the microprint rule below.)"
    );
  }
  if (options.preserveLogo) {
    keep.push(
      "Reproduce the brand logo exactly as in the reference — same mark, same wordmark, same proportions. Keep it fully visible and unobstructed."
    );
  }
  if (options.expandBackground) {
    keep.push(
      "Rebuild the background for the new shape: extend gradients, surfaces, lighting and scenery so it fills the whole image convincingly, bleed included."
    );
  } else {
    keep.push(
      "Keep the background simple: reuse the reference's dominant colour and tone rather than inventing new scenery."
    );
  }

  lines.push("", "KEEP FROM THE REFERENCE:");
  for (const k of keep) lines.push(`- ${k}`);

  // 문구는 이 기능에서 가장 자주 망가지는 지점이라 별도 섹션으로 강조한다
  lines.push("", "TEXT — THIS IS CRITICAL:");
  if (options.preserveText) {
    lines.push(
      "- Reproduce every piece of text with EXACTLY the same wording and spelling as the reference, character for character.",
      `- You MAY move it, resize it, change its line breaks and re-align it to suit the new ${surface}.`,
      "- You MUST NOT translate, paraphrase, rewrite, correct, shorten or extend any text, and you must not invent text that is not in the reference.",
      "- Every glyph must be crisp and correctly formed. Garbled or misspelled lettering makes the banner unusable."
    );
  } else {
    lines.push(
      "- Keep the meaning of the original copy, and keep every glyph crisp and correctly formed."
    );
  }

  // 문구 지시를 한 덩어리로 두면 모델이 "모든 글자를 그대로 재현" 을
  // 패키지 표면의 5px 미세 인쇄(원료명·함량·인증마크)까지 적용해,
  // 판독 불가한 크기에 글자 모양만 흉내 낸 깨진 문자를 만들어 낸다.
  // (아커만시아 → "▪구시티필라", 1포당 800.5mg → "omma fied" 같은 오기)
  // 건강기능식품 표시·광고 심의에서 바로 문제가 되는 지점이라
  // "헤드라인 카피" 와 "표면 미세 인쇄" 를 두 계층으로 분리해
  // 후자는 아예 빈 면으로 남기도록 지시한다.
  lines.push(
    "",
    "TWO KINDS OF TEXT — TREAT THEM DIFFERENTLY:",
    "- HEADLINE COPY (the advertising message, the call-to-action button, the brand logotype and the legal notice line): reproduce this exactly, and render it large enough to be read.",
    "- SURFACE MICROPRINT (the printed matter on the product packaging itself: ingredient names, dosage and volume figures, nutrition tables, barcodes, certification seals and any fine print on a pouch, tube, box or bottle): you will NOT be able to render this legibly at this scale, and a wrong ingredient name or a wrong dosage figure makes the banner illegal to publish.",
    "- So for SURFACE MICROPRINT: do NOT attempt to draw letter shapes. Leave those areas as clean, empty, unprinted surface that follows the package's own perspective, curvature, lighting and shading, or let them fall softly out of focus. Blank is correct. Invented lettering is a failure.",
    "- Never invent, guess or approximate any ingredient name, percentage, milligram or CFU figure, certification mark or seal text that you cannot read with certainty in the reference."
  );

  // 심의·법적 고지 문구는 규격이 작아질수록 먼저 희생된다.
  // 300x250 에서 5px 로 렌더돼 판독 불가였던 사례가 있어
  // 생성 캔버스 기준 최소 픽셀을 환산해 하한으로 못박는다.
  lines.push(
    "",
    "LEGIBILITY FLOOR — NOTHING MAY BE SMALLER THAN THIS:",
    `- The legal / regulatory notice line (for example a Korean advertising-review notice such as 「건강기능식품광고 | 광고심의필」) must be rendered at a cap height of at least ${minLegalPx}px on this canvas, so that it stays readable after the banner is scaled down to ${size.width}x${size.height}.`,
    "- Give it strong contrast against whatever sits behind it: near-opaque white type, or a subtle dark gradient scrim behind it on a busy background.",
    `- Keep it inside a ${safeMarginPx}px safe margin from the bottom-left corner of the ${surface}, and never let the product, a decorative shape or a button overlap it.`,
    "- If a piece of text cannot fit at that minimum size, make the layout give it room — never shrink it below the floor and never drop it."
  );

  const sourceText = options.sourceText.trim();
  if (sourceText) {
    lines.push(
      "",
      "The banner contains exactly the following text. Reproduce it verbatim, with no other text anywhere on the canvas:",
      '"""',
      sourceText,
      '"""'
    );
  }

  if (cropped) {
    lines.push(
      "",
      "BLEED RULES — THE MOST COMMON WAY THIS GOES WRONG:",
      vertical
        ? `The top ${cutTop}px and the bottom ${cutBottom}px of the image are bleed. Put NOTHING there but plain, continued background.`
        : `The left ${cutLeft}px and the right ${cutRight}px of the image are bleed. Put NOTHING there but plain, continued background.`,
      "No logo, no wordmark, no headline, no body copy, no button, no product and no face may sit in the bleed or cross its edge.",
      `Every one of those elements must sit entirely inside the central ${artboard} artboard, with a little breathing room from the artboard's ${vertical ? "top and bottom" : "left and right"} edges.`,
      "If something does not fit inside the artboard, scale it down or re-arrange the composition — never let it run out into the bleed."
    );
  }

  // 두 모델 API 모두 negative_prompt 필드가 없어, 금지 항목을 본문 부정형으로 넣는다.
  // (위 REDESIGN·BLEED 지시와 같은 방식)
  lines.push(
    "",
    "DO NOT PRODUCE ANY OF THE FOLLOWING:",
    "- garbled, misspelled, half-formed or nonsense lettering anywhere in the image",
    "- invented ingredient names, dosage figures, nutrition tables or barcodes",
    "- fabricated certification seals, award badges or review-approval marks",
    "- watermarks, signatures or stock-image marks",
    "- extra duplicate products that are not in the reference",
    "- warped, melted or distorted package geometry",
    "- a cluttered background that competes with the copy"
  );

  lines.push(
    "",
    cropped
      ? `Deliver one ${plan.genWidth}x${plan.genHeight} image whose central ${artboard} strip is a finished, production-ready ${size.width}x${size.height} advertisement, with nothing but background in the outer ${vertical ? "top and bottom" : "left and right"} margins.`
      : `Deliver one finished, production-ready ${plan.genWidth}x${plan.genHeight} advertising banner.`
  );
  if (cropped) {
    // 마지막 지시에 가중치가 실리므로 아트보드 규칙을 한 번 더 못박는다
    lines.push(
      "Remember: the advertisement lives entirely inside the central artboard. The outer margins are background only and get trimmed away."
    );
  }

  return lines.join("\n");
}
