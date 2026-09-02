// 크롤링 랜딩페이지 전환 측정 스텁 (기획서 07장).
//
// 지금은 개발 모드 콘솔 로그만 남긴다. 호출 지점(어느 버튼·어느 필드)을 나중에 다시
// 찾아 심는 비용이 실제 연동 비용의 대부분이므로, 호출부만 정확히 박아두고
// GA·GTM 연동 시 이 파일 하나만 고치면 되도록 만들었다.

export type CrawlingLandingEvent =
  | "hero_cta_click"
  | "scroll_50"
  | "scroll_75"
  | "pricing_view"
  | "form_start"
  | "form_submit"
  | "kakao_click";

type EventParams = Record<string, string | number>;

/** 세션당 1회만 보내야 하는 이벤트 기록 (모듈 스코프라 페이지 이동 전까지 유지된다) */
const firedEvents = new Set<CrawlingLandingEvent>();

/** window.gtag 는 아직 없다. any 없이 선택적으로 위임하기 위한 캐스팅 타입 */
type MaybeGtagWindow = Window & {
  gtag?: (command: string, event: string, params?: EventParams) => void;
};

export function trackLandingEvent(
  event: CrawlingLandingEvent,
  params?: EventParams
): void {
  // SSR 에서 호출되어도 터지지 않게 한다
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV !== "production") {
    console.info("[크롤링 랜딩]", event, params ?? {});
  }

  (window as MaybeGtagWindow).gtag?.("event", event, params);
}

/** scroll_50 · pricing_view 처럼 중복 발화하면 지표가 망가지는 이벤트용 */
export function trackLandingEventOnce(
  event: CrawlingLandingEvent,
  params?: EventParams
): void {
  if (firedEvents.has(event)) return;
  firedEvents.add(event);
  trackLandingEvent(event, params);
}
