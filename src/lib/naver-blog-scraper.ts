// 네이버 블로그 댓글 크롤링 (스트리밍) — 서버 전용.
//
// 네이버 블로그는 댓글이 기본적으로 접혀 있고 iframe 안에 있으며,
// 페이지네이션이 "마지막 페이지 → 1페이지" 역순으로 표시된다.
// 그래서 흐름이 다음과 같다:
//   1) 포스트 로드 → 모든 프레임을 뒤져 "댓글 N" 버튼 클릭 (댓글 영역 활성화)
//   2) 댓글이 들어 있는 프레임 선택
//   3) 마지막 페이지 번호를 읽고, 거기서부터 1페이지까지 역순 순회
//   4) 페이지 하나를 수집할 때마다 콜백으로 즉시 흘려보낸다 (스트리밍)
//
// 셀렉터(.u_cbox_*)는 네이버가 예고 없이 바꾸므로 언제든 깨질 수 있다.
// 깨졌을 때 조용히 0건으로 끝나는 것이 가장 위험하므로, 호출부는 반드시
// "0건 완료"를 성공이 아닌 경고로 다뤄야 한다.

import type { Frame } from "puppeteer-core";
import { getBrowser } from "@/lib/puppeteer";
import { StreamClosedSignal } from "@/lib/stream-signal";
import type { BlogComment } from "@/types/blog-comment";

/**
 * 순회할 최대 페이지 수.
 *
 * 페이지당 약 2~3초가 걸리므로 30페이지면 최대 90초 안팎이다.
 * Vercel 함수 상한(maxDuration 300초)을 넘기지 않으면서도
 * 댓글 1,500건(페이지당 50건 기준)까지 커버한다.
 */
const MAX_PAGES = 30;

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** 개발 환경에서만 진행 로그를 남긴다 (프로덕션은 로그 비용이 든다) */
const debug = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") console.log("[naver-blog]", ...args);
};

export interface BlogPageCollected {
  /** 방금 수집한 페이지 번호 (역순이라 큰 값부터 온다) */
  pageNumber: number;
  comments: BlogComment[];
  /** 전체 페이지 수 (판별 실패 시 1) */
  totalPages: number;
  isLastPage: boolean;
}

export interface BlogScrapeResult {
  comments: BlogComment[];
  total: number;
  /**
   * MAX_PAGES 상한에 걸려 남은 페이지를 두고 끝났으면 true.
   * 이 경우 "전부 수집했다"고 안내하면 안 된다.
   */
  truncated: boolean;
  /** 감지된 전체 페이지 수 */
  totalPages: number;
  /** 실제로 순회한 페이지 수 */
  pagesScanned: number;
}

/**
 * 댓글/답글 순서를 이용해 각 댓글의 답글 수를 채운다.
 * 댓글 바로 뒤에 연속으로 오는 "답글"의 개수가 그 댓글의 답글 수다.
 */
function fillReplyCounts(comments: BlogComment[]): void {
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
 * 현재 열려 있는 댓글 페이지에서 댓글 목록을 추출한다.
 *
 * 브라우저 컨텍스트에서 실행되므로 이 프로젝트의 타입을 직접 쓸 수 없다.
 * 반환 형태는 BlogComment 와 동일하게 맞춰 두고 호출부에서 단언한다.
 */
async function collectCommentsOnPage(frame: Frame): Promise<BlogComment[]> {
  const results = await frame.evaluate(() => {
    const results: Record<string, unknown>[] = [];
      let commentArea: Element | null = null;
      for (const sel of ["#cbox_module", ".u_cbox", 'div[id*="comment"]']) {
        const el = document.querySelector(sel);
        if (el) {
          commentArea = el;
          break;
        }
      }
      if (!commentArea) commentArea = document.body;

      let listContainer: Element | null = null;
      for (const sel of [".u_cbox_list", ".u_cbox_comment_list"]) {
        const el = commentArea.querySelector(sel);
        if (el) {
          listContainer = el;
          break;
        }
      }
      if (!listContainer) listContainer = commentArea;

      const boxes = Array.from(
        listContainer.querySelectorAll(".u_cbox_comment_box")
      );

      for (const element of boxes) {
        try {
          const text = element.textContent?.trim() || "";
          if (text.length < 5) continue;

          // 답글은 .u_cbox_reply_area 안에 들어 있다
          const commentType =
            element.closest(".u_cbox_reply_area") !== null ? "답글" : "댓글";

          let nickname = "익명";
          let authorUrl = "";
          for (const sel of [".u_cbox_nick", ".nickname"]) {
            const el = element.querySelector(sel);
            if (el?.textContent?.trim()) {
              nickname = el.textContent.trim();
              const link = el.querySelector("a") || el.closest("a");
              if (link) {
                authorUrl = link.getAttribute("href") || "";
                if (authorUrl && !authorUrl.startsWith("http")) {
                  authorUrl = `https://blog.naver.com${authorUrl}`;
                }
              }
              break;
            }
          }

          const dateEl = element.querySelector(".u_cbox_date, .date");
          const createdAt = dateEl?.textContent?.trim() || "";

          // 본문: 공감/답글/신고 버튼을 제외한 텍스트 노드만 모은다
          let content = "";
          const contentArea = element.querySelector(
            ".u_cbox_contents_inner, .u_cbox_text_wrap, .u_cbox_contents"
          );
          if (contentArea) {
            content = Array.from(contentArea.childNodes)
              .filter(
                (node) =>
                  node.nodeType === Node.TEXT_NODE ||
                  (node.nodeType === Node.ELEMENT_NODE &&
                    !(node as Element).matches(
                      ".u_cbox_btn_recomm, .u_cbox_btn_reply, button"
                    ))
              )
              .map((node) => node.textContent?.trim())
              .filter((t): t is string => !!t && t.length > 0)
              .join(" ");
          }
          if (!content) {
            const el = element.querySelector(".u_cbox_contents, .comment_text");
            content = el?.textContent?.trim() || "";
          }

          let likes = 0;
          const likeEl = element.querySelector(
            ".u_cbox_cnt_recomm, .u_cbox_recomm_count"
          );
          if (likeEl) {
            const likeText = likeEl.textContent?.trim() || "";
            if (likeText.includes("공감")) {
              const match = likeText.match(/(\d+)/);
              if (match) likes = parseInt(match[1], 10);
            }
          }

          // 버튼 라벨이 본문에 섞여 들어온 경우 제거
          if (likes > 0) {
            content = content.replace(/공감\s*\d+|\d+\s*공감/g, "").trim();
          }
          content = content
            .replace(/신고\s*답글|답글\s*신고|신고|답글/g, "")
            .trim();

          let imageUrl = "";
          const imageWrap = element.querySelector(".u_cbox_image_wrap");
          if (imageWrap) {
            const img = imageWrap.querySelector("img");
            const src =
              img?.getAttribute("src") || img?.getAttribute("data-src") || "";
            if (src) {
              imageUrl = src.startsWith("http") ? src : `https:${src}`;
            }
          }

          const links = contentArea
            ? contentArea.querySelectorAll("a").length
            : 0;

          results.push({
            createdAt,
            commentType,
            nickname,
            authorUrl,
            likes,
            replyCount: 0, // 순회가 끝난 뒤 채운다
            imageUrl,
            links,
            content,
          });
        } catch {
          // 개별 댓글 파싱 실패는 건너뛴다
        }
      }

      return results;
  });

  return results as unknown as BlogComment[];
}

/**
 * 네이버 블로그 댓글을 페이지 단위로 수집하며 콜백으로 흘려보낸다.
 *
 * @param onPageCollected 페이지 1건 수집 직후 호출. 이 콜백이 예외를 던지면
 *                        (예: 클라이언트 연결 종료) 순회를 중단하고 조기 종료한다.
 */
export async function scrapeNaverBlogCommentsStreaming(
  blogId: string,
  logNo: string,
  onPageCollected: (data: BlogPageCollected) => void
): Promise<BlogScrapeResult> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(DESKTOP_UA);

    const url = `https://blog.naver.com/${blogId}/${logNo}`;
    debug("페이지 접속:", url);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 30_000 });
    await new Promise((r) => setTimeout(r, 2000));

    // ── 1) "댓글" 버튼 클릭 — 모든 프레임을 순회하며 후보를 점수화해 가장 그럴듯한 것을 누른다
    let buttonClicked = false;
    for (const frame of page.frames()) {
      const frameUrl = frame.url();
      if (!frameUrl || frameUrl === "about:blank") continue;

      try {
        const clicked = await frame.evaluate(() => {
          // (a) #commentCount 를 감싸는 클릭 가능한 조상 찾기
          const countElements = Array.from(
            document.querySelectorAll("#commentCount, ._commentCount")
          );
          for (const countEl of countElements) {
            let parent = countEl.parentElement;
            let depth = 0;
            while (parent && depth < 5) {
              const el = parent as HTMLElement;
              if (
                parent.tagName === "A" ||
                parent.tagName === "BUTTON" ||
                el.onclick !== null ||
                parent.getAttribute("role") === "button"
              ) {
                if (el.offsetParent !== null) {
                  el.click();
                  return true;
                }
              }
              parent = parent.parentElement;
              depth++;
            }
          }

          // (b) 텍스트 패턴 기반 후보 점수화
          const candidates: { element: HTMLElement; score: number }[] = [];
          for (const el of Array.from(
            document.querySelectorAll("button, a, div, span")
          )) {
            const text = el.textContent?.trim() || "";
            if (!text.includes("댓글") || text.length > 20) continue;
            if (text.includes("#") || text.includes("작성") || text.includes("인증"))
              continue;
            if ((el as HTMLElement).offsetParent === null) continue;

            let score = 0;
            if (text === "댓글") score += 100;
            if (/^댓글\s*\d+$/.test(text)) score += 90;
            if (el.querySelector("#commentCount, ._commentCount")) score += 150;
            if (el.tagName === "BUTTON" || el.tagName === "A") score += 30;

            candidates.push({ element: el as HTMLElement, score });
          }

          candidates.sort((a, b) => b.score - a.score);
          if (candidates.length > 0) {
            candidates[0].element.click();
            return true;
          }
          return false;
        });

        if (clicked) {
          buttonClicked = true;
          break;
        }
      } catch {
        // 접근 불가 프레임(cross-origin 등)은 건너뛴다
      }
    }

    if (buttonClicked) {
      await new Promise((r) => setTimeout(r, 3000));
    }

    // ── 2) 댓글이 들어 있는 프레임 선택
    const frames = page.frames();
    const commentFrame =
      frames.find((f) => f.url().includes("PostView.naver")) ??
      frames.find((f) => f.url().includes(`logNo=${logNo}`)) ??
      frames.find(
        (f) =>
          (f.url().includes("CommentBox") ||
            f.url().includes("comment") ||
            (f.url().includes("blogId=") && f.url().includes(blogId))) &&
          !f.url().includes("PostListByTagName")
      ) ??
      page.mainFrame();

    debug("댓글 프레임 선택:", commentFrame.url());
    await new Promise((r) => setTimeout(r, 2000));

    // ── 3) 마지막 페이지 번호 감지
    const lastPageNumber = await commentFrame.evaluate(() => {
      const pagination = document.querySelector(".u_cbox_paginate");
      if (!pagination) return 1;

      const active = pagination.querySelector(
        ".u_cbox_page_current, .u_cbox_num_page.on, strong, em"
      );
      if (active) {
        const n = parseInt(active.textContent?.trim() || "0", 10);
        if (!Number.isNaN(n) && n > 0) return n;
      }

      const numbers = Array.from(pagination.querySelectorAll("a, span, strong, em"))
        .map((el) => parseInt(el.textContent?.trim() || "0", 10))
        .filter((n) => !Number.isNaN(n) && n > 0);

      return numbers.length > 0 ? Math.max(...numbers) : 1;
    });

    debug(`마지막 페이지 번호: ${lastPageNumber}`);

    // ── 4) 역순 순회
    const allComments: BlogComment[] = [];
    let currentPageNumber = lastPageNumber;
    let pageCount = 1;
    let truncated = false;

    while (pageCount <= MAX_PAGES && currentPageNumber >= 1) {
      // 페이지를 넘기면 네이버가 댓글 iframe 을 다시 만들어서 다음 회차의 evaluate 가
      // "Execution context was destroyed" 로 던지는 일이 있다. 이때 함수 전체가 throw 되면
      // 이미 수집한 수십 페이지가 통째로 버려지므로, 여기서 잡아 부분 성공으로 마감한다.
      let comments: BlogComment[];
      try {
        await commentFrame
          .evaluate(() => window.scrollTo(0, document.body.scrollHeight))
          .catch(() => {});
        await new Promise((r) => setTimeout(r, 800));

        comments = await collectCommentsOnPage(commentFrame);
      } catch (error) {
        if (error instanceof StreamClosedSignal) throw error;
        debug("댓글 추출 실패, 지금까지 모인 결과로 마감합니다:", error);
        break;
      }


      allComments.push(...comments);
      // 지금까지 모인 범위에서 답글 수를 채운다 (콜백으로 나가는 값에 반영되도록)
      fillReplyCounts(allComments);

      // 상한에 걸려 멈추는 것도 "더 볼 페이지가 없다"와 함께 마지막 페이지로 표시되지만,
      // 둘은 의미가 다르다. 상한으로 끊긴 경우를 따로 기록해 두고 결과에 실어 보낸다.
      const reachedCap = pageCount >= MAX_PAGES && currentPageNumber > 1;
      if (reachedCap) truncated = true;

      const isLastPage = currentPageNumber === 1 || pageCount >= MAX_PAGES;

      // 콜백이 던지면(클라이언트 연결 종료) 아래 catch 없이 그대로 전파되어 순회가 끝난다
      onPageCollected({
        pageNumber: currentPageNumber,
        comments,
        totalPages: lastPageNumber,
        isLastPage,
      });

      if (isLastPage) break;

      // ── 다음(=이전 번호) 페이지로 이동
      const nextPageNumber = currentPageNumber - 1;
      let moved = false;

      try {
        // (a) 페이지 번호 직접 클릭
        moved = await commentFrame.evaluate((targetPage) => {
          const pagination = document.querySelector(".u_cbox_paginate");
          if (!pagination) return false;
          for (const el of Array.from(
            pagination.querySelectorAll("a, button, span, div")
          )) {
            const n = parseInt(el.textContent?.trim() || "", 10);
            if (n === targetPage && (el as HTMLElement).offsetParent !== null) {
              (el as HTMLElement).click();
              return true;
            }
          }
          return false;
        }, nextPageNumber);

        // (b) 번호가 안 보이면 "이전" 버튼
        if (!moved) {
          moved = await commentFrame.evaluate(() => {
            const pagination = document.querySelector(".u_cbox_paginate");
            if (!pagination) return false;

            for (const el of Array.from(pagination.querySelectorAll("a, button"))) {
              const text = el.textContent?.trim() || "";
              const aria = el.getAttribute("aria-label") || "";
              const isPrev =
                text === "이전" ||
                text === "<" ||
                text.includes("이전") ||
                text.includes("prev") ||
                aria.includes("이전") ||
                aria.includes("prev");
              if (isPrev && (el as HTMLElement).offsetParent !== null) {
                (el as HTMLElement).click();
                return true;
              }
            }

            const prev = pagination.querySelector(
              ".u_cbox_btn_page_prev, .u_cbox_pre, .btn_prev"
            );
            if (prev && (prev as HTMLElement).offsetParent !== null) {
              (prev as HTMLElement).click();
              return true;
            }
            return false;
          });
        }
      } catch (error) {
        if (error instanceof StreamClosedSignal) throw error;
        debug("페이지 이동 실패:", error);
        break;
      }

      if (!moved) break;

      await new Promise((r) => setTimeout(r, 2000));
      currentPageNumber = nextPageNumber;
      pageCount++;
    }

    fillReplyCounts(allComments);
    debug(
      `수집 완료: 총 ${allComments.length}건 (${pageCount}/${lastPageNumber}페이지${truncated ? ", 상한 도달" : ""})`
    );

    return {
      comments: allComments,
      total: allComments.length,
      truncated,
      totalPages: lastPageNumber,
      pagesScanned: pageCount,
    };
  } finally {
    await page.close().catch(() => {});
  }
}
