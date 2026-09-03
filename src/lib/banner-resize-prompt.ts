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
 * 모델이 캔버스 전체에 구성을 펼치므로, 세이프 에어리어를 반드시 알려야
 * 핵심 요소가 잘려 나가지 않는다.
 */
export function buildResizePrompt(
  size: BannerSize,
  plan: BannerGenerationPlan,
  options: BannerResizeOptions,
  sourceMeta: { width: number; height: number }
): string {
  const lines: string[] = [];

  lines.push(
    "You are an art director adapting an existing advertising banner to a new ad slot.",
    "",
    `REFERENCE: the supplied image is the original banner, ${sourceMeta.width}x${sourceMeta.height} (${ratioText(sourceMeta.width, sourceMeta.height)}).`,
    `TARGET: a ${size.width}x${size.height} ad slot (${ratioText(size.width, size.height)}).`,
    "The two shapes are different, so a full REDESIGN is required. Do not simply pad, letterbox, stretch or centre the original with filler on the sides — that is a failed result."
  );

  lines.push(
    "",
    "REBUILD THE LAYOUT:",
    "- Move, resize and regroup every element — product, headline, body copy, logo, call-to-action — so the banner reads naturally at the new shape.",
    "- For a wide, short slot: put the key visual on one side and stack the copy beside it in a horizontal reading order.",
    "- For a tall, narrow slot: stack the elements vertically with clear hierarchy.",
    "- Fill the entire canvas edge to edge. No empty side panels, no borders, no frame, no letterboxing.",
    `- ${COMPOSITION_HINT[options.composition] ?? COMPOSITION_HINT.auto}`
  );

  const keep: string[] = [
    "Keep the brand's colour palette, typographic style and overall visual language identical to the reference.",
  ];
  if (options.preserveProduct) {
    keep.push(
      "Reproduce the product, packaging and any people exactly as they look in the reference — same shape, colour, material and branding. You may reposition and rescale them, but never restyle or redesign them."
    );
  }
  if (options.preserveLogo) {
    keep.push(
      "Reproduce the brand logo exactly as in the reference — same mark, same wordmark, same proportions. Keep it fully visible and unobstructed."
    );
  }
  if (options.expandBackground) {
    keep.push(
      "Rebuild the background for the new shape: extend gradients, surfaces, lighting and scenery so it fills the canvas convincingly."
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
      "- You MAY move it, resize it, change its line breaks and re-align it to suit the new layout.",
      "- You MUST NOT translate, paraphrase, rewrite, correct, shorten or extend any text, and you must not invent text that is not in the reference.",
      "- Every glyph must be crisp and correctly formed. Garbled or misspelled lettering makes the banner unusable."
    );
  } else {
    lines.push(
      "- Keep the meaning of the original copy, and keep every glyph crisp and correctly formed."
    );
  }

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

  if (plan.cropped) {
    const cutTop = plan.bandY;
    const cutBottom = plan.genHeight - (plan.bandY + plan.bandHeight);
    const cutLeft = plan.bandX;
    const cutRight = plan.genWidth - (plan.bandX + plan.bandWidth);
    const vertical = cutTop + cutBottom > cutLeft + cutRight;

    // 픽셀 좌표보다 "위 N% / 아래 N%" 같은 비율 표현을 훨씬 잘 따른다.
    const pctTop = Math.round((cutTop / plan.genHeight) * 100);
    const pctBottom = Math.round((cutBottom / plan.genHeight) * 100);
    const pctLeft = Math.round((cutLeft / plan.genWidth) * 100);
    const pctRight = Math.round((cutRight / plan.genWidth) * 100);

    lines.push(
      "",
      "SAFE AREA — THE MOST COMMON WAY THIS GOES WRONG:",
      `The finished banner is ${size.width}x${size.height}, but you are painting a ${vertical ? "taller" : "wider"} canvas on purpose. The outer edges are trimmed off before delivery.`,
      vertical
        ? `The top ${pctTop}% and the bottom ${pctBottom}% of this canvas WILL BE CUT AWAY. Only the middle ${100 - pctTop - pctBottom}% survives.`
        : `The left ${pctLeft}% and the right ${pctRight}% of this canvas WILL BE CUT AWAY. Only the middle ${100 - pctLeft - pctRight}% survives.`,
      `Therefore: every logo, every word, the product and any face must sit entirely within that middle ${vertical ? "horizontal" : "vertical"} band, with a little breathing room from its edges.`,
      `The trimmed ${vertical ? "top and bottom" : "left and right"} margins must contain ONLY plain continued background — no logo, no text, no product, no faces, nothing you would miss.`,
      `Compose the advert as if the middle band were the whole artboard, then let the background bleed outward into the margins.`
    );
  }

  lines.push(
    "",
    `Deliver one finished, production-ready ${plan.genWidth}x${plan.genHeight} advertising banner.`
  );
  if (plan.cropped) {
    // 마지막 지시에 가중치가 실리므로 세이프 에어리어를 한 번 더 못박는다
    lines.push(
      "Remember: keep the logo, all copy and the product inside the central band — the outer margins get trimmed."
    );
  }

  return lines.join("\n");
}
