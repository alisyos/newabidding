// 인스타그램 댓글 크롤링 (스트리밍) — 서버 전용.
//
// 인스타그램은 비로그인 상태에서 댓글을 거의 보여주지 않으므로
// INSTAGRAM_COOKIES(로그인 세션 쿠키)를 주입해 접근한다.
//
// 수집이 까다로운 지점 세 가지:
//   1) 캡션(본문)도 <time> 을 가지고 있어 댓글과 구분해야 한다
//      → time 요소 주변 6단계 안에 /c/{commentId} 링크나 "답글 달기" 버튼이 있는지로 판별한다.
//   2) 답글은 "답글 N개 모두 보기"를 눌러야 DOM 에 나타난다
//      → 클릭 전(Pass 1) / 클릭 후(Pass 2) 를 비교해, 나중에 나타난 것을 답글로 분류한다.
//   3) 댓글 목록은 가상 스크롤이라 스크롤 + "더 불러오기"를 반복해야 한다.
//
// 셀렉터가 아니라 구조(time/ul/li)에 기대고 있어 네이버보다는 덜 깨지지만,
// 인스타그램 DOM 변경에 여전히 취약하다.

import { getBrowser } from "@/lib/puppeteer";
import { StreamClosedSignal } from "@/lib/stream-signal";
import type { InstagramComment } from "@/types/instagram-comment";

/** 스크롤 반복 상한 */
const MAX_ITERATIONS = 50;
/** 새 댓글이 이만큼 연속으로 안 나오면 종료 */
const MAX_NO_CHANGE = 5;

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const debug = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") console.log("[instagram]", ...args);
};

/** 로그인 세션이 만료됐을 때 던진다 — 라우트가 이 타입을 보고 안내 문구를 고른다 */
export class InstagramSessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstagramSessionExpiredError";
  }
}

export interface InstagramBatchCollected {
  batchNumber: number;
  comments: InstagramComment[];
  totalCollected: number;
  /**
   * true 면 comments 가 "답글 수까지 재계산된 전체 배열"이다.
   * 클라이언트는 이때 누적이 아니라 교체해야 한다.
   */
  isLastBatch: boolean;
}

export interface InstagramScrapeResult {
  comments: InstagramComment[];
  total: number;
  /**
   * 끝까지 훑지 못하고 끝났으면 true.
   * (반복 상한 도달, 또는 오류가 반복돼 중도 종료한 경우)
   * 이때 "전부 수집했다"고 안내하면 안 된다.
   */
  truncated: boolean;
  /** 중도 종료 사유 — 화면 안내 문구에 쓴다 */
  truncatedReason: string | null;
}

/** 댓글 뒤에 연속으로 오는 답글 개수를 세어 replyCount 를 채운다 */
function fillReplyCounts(comments: InstagramComment[]): void {
  for (let i = 0; i < comments.length; i++) {
    if (comments[i].commentType !== "댓글") continue;
    let count = 0;
    for (let j = i + 1; j < comments.length; j++) {
      if (comments[j].commentType === "답글") count++;
      else break;
    }
    comments[i].replyCount = count;
  }
}

/**
 * 인스타그램 게시물의 댓글을 배치 단위로 수집하며 콜백으로 흘려보낸다.
 *
 * 도중에 오류가 나도 이미 모인 댓글이 있으면 예외 대신 그 결과를 반환한다.
 * (부분 수집이라도 사용자에게 돌려주는 편이 낫다)
 *
 * @param onBatchCollected 배치 1건 수집 직후 호출. 예외를 던지면 순회를 중단한다.
 */
export async function scrapeInstagramCommentsStreaming(
  shortcode: string,
  onBatchCollected: (data: InstagramBatchCollected) => void
): Promise<InstagramScrapeResult> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const allComments: InstagramComment[] = [];

  try {
    await page.setUserAgent(DESKTOP_UA);
    await page.setViewport({ width: 1280, height: 900 });

    // ── 쿠키 주입
    let hasCookies = false;
    const cookiesEnv = process.env.INSTAGRAM_COOKIES;
    if (cookiesEnv) {
      try {
        const raw = JSON.parse(cookiesEnv) as {
          name: string;
          value: string;
          domain?: string;
          path?: string;
        }[];
        const cookies = raw.map((c) => ({
          name: String(c.name).trim(),
          value: String(c.value).trim(),
          domain: String(c.domain || ".instagram.com").replace(/\s/g, ""),
          path: String(c.path || "/").trim(),
        }));
        await page.setCookie(...cookies);
        hasCookies = true;
        // 쿠키 값은 계정 탈취급 비밀값이므로 개수만 남긴다
        debug(`쿠키 ${cookies.length}개 설정 완료`);
      } catch (error) {
        console.warn(
          "[instagram] INSTAGRAM_COOKIES 파싱 실패 — JSON 배열 형식인지 확인하세요.",
          error instanceof Error ? error.message : error
        );
      }
    }

    // ── 페이지 접속
    await page.goto(`https://www.instagram.com/p/${shortcode}/`, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    await new Promise((r) => setTimeout(r, 3000));

    const currentUrl = page.url();
    if (
      currentUrl.includes("/accounts/login") ||
      currentUrl.includes("/challenge/")
    ) {
      throw new InstagramSessionExpiredError(
        "인스타그램 로그인 페이지로 리다이렉트되었습니다."
      );
    }

    // 로그인 유도 팝업 닫기
    await page
      .evaluate(() => {
        for (const btn of Array.from(document.querySelectorAll("button"))) {
          const text = btn.textContent?.trim() || "";
          if (
            ["Not Now", "Not now", "나중에 하기", "나중에", "닫기", "Close"].includes(
              text
            )
          ) {
            btn.click();
            return;
          }
        }
      })
      .catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));

    // ── 로그인 상태 확인
    const isLoggedIn = await page.evaluate(() => {
      const commentInput = document.querySelector(
        'textarea, [contenteditable="true"]'
      );
      const bodyText = document.body.textContent || "";
      const hasLoginPrompt =
        bodyText.includes("앱을 사용하여") || bodyText.includes("Log in to like");
      return commentInput !== null && !hasLoginPrompt;
    });

    if (!isLoggedIn) {
      // 쿠키를 아예 안 넣은 경우와 넣었는데 만료된 경우는 대처가 달라서 문구를 나눈다
      throw new InstagramSessionExpiredError(
        hasCookies
          ? "저장된 로그인 쿠키가 더 이상 유효하지 않습니다. 쿠키를 갱신해주세요."
          : "INSTAGRAM_COOKIES 가 설정되지 않았습니다. 비로그인 상태로는 댓글을 수집할 수 없습니다."
      );
    }

    /** 현재 DOM 에서 댓글을 추출한다 (Pass 1 / Pass 2 공용) */
    const extractComments = () =>
      page.evaluate(() => {
        const results: {
          createdAt: string;
          commentType: string;
          username: string;
          profileUrl: string;
          likes: number;
          replyCount: number;
          content: string;
        }[] = [];
        const seen = new Set<string>();

        for (const timeEl of Array.from(document.querySelectorAll("time"))) {
          // ── 댓글 단위 컨테이너 찾기 (LI, 또는 UL 의 자식 DIV)
          let container: Element | null = timeEl;
          let bestContainer: Element | null = null;

          for (let depth = 0; depth < 10; depth++) {
            container = container?.parentElement || null;
            if (!container) break;

            if (container.tagName === "LI") {
              bestContainer = container;
              break;
            }
            if (
              container.tagName === "DIV" &&
              container.parentElement?.tagName === "UL"
            ) {
              bestContainer = container;
              break;
            }
            if (
              depth >= 2 &&
              container.parentElement &&
              container.parentElement.children.length >= 3
            ) {
              if (!bestContainer) bestContainer = container;
              break;
            }
          }

          container = bestContainer || container;
          if (!container) continue;

          // ── 캡션 제외: time 근처에 /c/{id} 링크나 답글 버튼이 있어야 진짜 댓글이다
          let isComment = false;
          let scope: Element | null = timeEl;
          for (let d = 0; d < 6; d++) {
            scope = scope?.parentElement || null;
            if (!scope) break;

            for (const link of Array.from(scope.querySelectorAll('a[href*="/c/"]'))) {
              if (/\/c\/\d+/.test(link.getAttribute("href") || "")) {
                isComment = true;
                break;
              }
            }
            if (isComment) break;

            for (const btn of Array.from(
              scope.querySelectorAll('button, div[role="button"]')
            )) {
              if (/^(Reply|답글 달기|댓글 달기)$/i.test(btn.textContent?.trim() || "")) {
                isComment = true;
                break;
              }
            }
            if (isComment) break;
          }
          if (!isComment) continue;

          // ── 작성자
          let username = "";
          let profileUrl = "";
          for (const link of Array.from(container.querySelectorAll('a[href^="/"]'))) {
            const href = link.getAttribute("href") || "";
            if (
              href.match(/^\/[a-zA-Z0-9._-]+\/?$/) &&
              !href.includes("/p/") &&
              !href.includes("/explore/") &&
              !href.includes("/reel/") &&
              !href.includes("/accounts/") &&
              !href.includes("/direct/")
            ) {
              const linkText = link.textContent?.trim() || "";
              if (linkText && linkText.length <= 30 && !linkText.includes(" ")) {
                username = linkText;
                profileUrl = `https://www.instagram.com${href}`;
                break;
              }
            }
          }
          if (!username) continue;

          // ── 본문: 중첩 ul(답글 목록) 밖의 span 중 UI 라벨을 걸러내고 가장 긴 것을 고른다
          const nestedUls = Array.from(container.querySelectorAll("ul"));
          const leafTexts: string[] = [];
          const otherTexts: string[] = [];

          for (const span of Array.from(container.querySelectorAll("span"))) {
            if (nestedUls.some((ul) => ul.contains(span))) continue;

            const text = span.textContent?.trim() || "";
            if (!text) continue;
            if (text === username) continue;
            if (text.match(/^\d+[smhdw일시분초주년개월]$/)) continue;
            if (text.match(/^\d+\s*(likes?|좋아요)$/i)) continue;
            if (text.match(/^좋아요\s*\d+개$/)) continue;
            if (
              text.match(
                /^(Reply|답글 달기|답글|좋아요|Liked|번역 보기|See translation|Verified|수정됨|Edited)$/i
              )
            )
              continue;
            if (text.includes("댓글") && text.includes("모두 보기")) continue;
            if (text.includes("View all") && text.includes("comment")) continue;
            if (text.includes("더 보기") && text.length < 10) continue;

            if (span.querySelectorAll("span").length === 0) leafTexts.push(text);
            else otherTexts.push(text);
          }

          const candidates = leafTexts.length > 0 ? leafTexts : otherTexts;
          if (candidates.length === 0) continue;
          const content = candidates.reduce((a, b) =>
            a.length >= b.length ? a : b
          );
          if (!content) continue;

          const key = `${username}::${content}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const containerText = container.textContent || "";
          const likeMatch =
            containerText.match(/좋아요\s*(\d+)\s*개/) ||
            containerText.match(/(\d+)\s*likes?/i);

          results.push({
            createdAt:
              timeEl.getAttribute("datetime") || timeEl.textContent?.trim() || "",
            commentType: "", // Pass 비교로 나중에 결정
            username,
            profileUrl,
            likes: likeMatch ? parseInt(likeMatch[1], 10) || 0 : 0,
            replyCount: 0,
            content,
          });
        }

        return results;
      });

    // ── 수집 루프
    const collectedKeys = new Set<string>();
    let batchNumber = 0;
    let noChangeCount = 0;
    let errorCount = 0;
    let truncated = false;
    let truncatedReason: string | null = null;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      try {
        // 스크롤 — 댓글 목록의 스크롤 컨테이너를 찾아 내리고, 못 찾으면 창을 내린다
        await page.evaluate(() => {
          const timeEl = document.querySelector("time");
          if (timeEl) {
            let el: Element | null = timeEl;
            for (let i = 0; i < 15; i++) {
              el = el?.parentElement || null;
              if (!el) break;
              const overflowY = window.getComputedStyle(el as HTMLElement).overflowY;
              if (overflowY === "auto" || overflowY === "scroll") {
                (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight;
                return;
              }
            }
          }
          window.scrollBy(0, 500);
        });
        await new Promise((r) => setTimeout(r, 2000));

        // Pass 1 — 답글 펼치기 전
        const pass1 = await extractComments();
        const beforeReplyKeys = new Set(
          pass1.map((c) => `${c.username}::${c.content}`)
        );

        // 답글 보기 버튼 모두 클릭
        const replyClicks = await page.evaluate(() => {
          let clickCount = 0;
          for (const el of Array.from(
            document.querySelectorAll('button, div[role="button"], span, a')
          )) {
            if ((el as HTMLElement).offsetParent === null) continue;
            const text = el.textContent?.trim() || "";
            if (
              /답글\s*\d+개\s*모두\s*보기/.test(text) ||
              /답글\s*보기/.test(text) ||
              /View\s+(all\s+)?\d+\s+replies/i.test(text) ||
              /View\s+replies/i.test(text) ||
              /\d+개의?\s*답글\s*보기/.test(text)
            ) {
              (el as HTMLElement).click();
              clickCount++;
            }
          }
          return clickCount;
        });

        // Pass 2 — 펼친 뒤 다시 추출해, 새로 나타난 것을 답글로 분류
        const newComments: InstagramComment[] = [];
        let source = pass1;

        if (replyClicks > 0) {
          await new Promise((r) => setTimeout(r, 2000));
          source = await extractComments();
        }

        for (const comment of source) {
          const key = `${comment.username}::${comment.content}`;
          if (collectedKeys.has(key)) continue;
          collectedKeys.add(key);
          newComments.push({
            ...comment,
            commentType:
              replyClicks > 0 && !beforeReplyKeys.has(key) ? "답글" : "댓글",
          });
        }

        if (newComments.length === 0) {
          noChangeCount++;
          if (noChangeCount >= MAX_NO_CHANGE) break;
        } else {
          noChangeCount = 0;
          allComments.push(...newComments);
          batchNumber++;
          onBatchCollected({
            batchNumber,
            comments: newComments,
            totalCollected: allComments.length,
            isLastBatch: false,
          });
        }

        // "더 불러오기"
        await page.evaluate(() => {
          for (const el of Array.from(
            document.querySelectorAll('button, div[role="button"], a, span')
          )) {
            if ((el as HTMLElement).offsetParent === null) continue;
            const text = el.textContent?.trim() || "";
            const aria = el.getAttribute("aria-label") || "";
            if (
              text === "+" ||
              text.includes("댓글 더 불러오기") ||
              text.includes("Load more comments") ||
              text.includes("이전 댓글 보기") ||
              text.includes("View previous comments") ||
              aria.includes("more comments") ||
              aria.includes("Load more")
            ) {
              (el as HTMLElement).click();
              return;
            }
          }

          for (const svg of Array.from(document.querySelectorAll("svg[aria-label]"))) {
            const label = svg.getAttribute("aria-label") || "";
            if (
              label.includes("Load") ||
              label.includes("more") ||
              label.includes("Plus")
            ) {
              const btn = svg.closest('button, div[role="button"]');
              if (btn && (btn as HTMLElement).offsetParent !== null) {
                (btn as HTMLElement).click();
                return;
              }
            }
          }
        });

        // 사람처럼 보이도록 대기 시간을 조금씩 흔든다
        await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1000));
      } catch (error) {
        // 콜백이 던진 중단 신호는 그대로 전파한다
        if (error instanceof StreamClosedSignal) throw error;
        debug(`반복 ${iteration + 1} 오류:`, error);
        errorCount++;
        noChangeCount++;
        if (noChangeCount >= MAX_NO_CHANGE) {
          // 오류가 섞여서 멈춘 것이라면 "다 모았다"고 볼 수 없다
          if (errorCount > 0) {
            truncated = true;
            truncatedReason =
              "수집 중 오류가 반복되어 중간에 멈췄습니다. 인스타그램의 요청 제한이거나 페이지 구조가 변경되었을 수 있습니다.";
          }
          break;
        }
      }

      // 반복 상한까지 다 쓰고도 끝나지 않았다면 남은 댓글이 있다는 뜻이다
      if (iteration === MAX_ITERATIONS - 1) {
        truncated = true;
        truncatedReason = `스크롤 상한(${MAX_ITERATIONS}회)에 도달해 일부만 수집했습니다. 댓글이 매우 많은 게시물입니다.`;
      }
    }

    fillReplyCounts(allComments);

    // 마지막 배치 — 답글 수가 재계산된 전체 배열을 보낸다 (클라이언트는 교체)
    if (allComments.length > 0) {
      onBatchCollected({
        batchNumber: batchNumber + 1,
        comments: allComments,
        totalCollected: allComments.length,
        isLastBatch: true,
      });
    }

    debug(
      `수집 완료: 총 ${allComments.length}건${truncated ? " (중도 종료)" : ""}`
    );
    return {
      comments: allComments,
      total: allComments.length,
      truncated,
      truncatedReason,
    };
  } catch (error) {
    // 부분 수집이라도 있으면 돌려준다 (세션 만료는 항상 0건이라 그대로 던져진다)
    // 다만 이건 명백히 중간에 끊긴 것이므로 완전한 결과로 안내하면 안 된다.
    if (allComments.length > 0 && !(error instanceof StreamClosedSignal)) {
      fillReplyCounts(allComments);
      return {
        comments: allComments,
        total: allComments.length,
        truncated: true,
        truncatedReason:
          "수집 도중 오류가 발생해 중간에 멈췄습니다. 지금까지 모인 결과만 표시합니다.",
      };
    }
    throw error;
  } finally {
    await page.close().catch(() => {});
  }
}
