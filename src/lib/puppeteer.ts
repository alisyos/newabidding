// Puppeteer 브라우저 인스턴스 관리 (싱글톤) — 서버 전용.
//
// 네이버 블로그 댓글 수집과 인스타 댓글 수집이 이 브라우저를 공유한다.
// 클라이언트 컴포넌트에서 절대 import 하지 말 것 (fs/os/path 를 쓰므로 번들이 깨진다).

import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import fs from "node:fs";
import os from "node:os";
import nodePath from "node:path";

let browserInstance: Browser | null = null;

/**
 * 기동 중인 launch 프로미스.
 *
 * 이게 없으면 동시에 들어온 요청이 각자 Chromium 을 띄우고
 * browserInstance 에는 마지막 것만 남아, 나머지는 회수되지 않는 좀비 프로세스가 된다.
 * (블로그·인스타 수집을 동시에 돌리면 바로 재현된다)
 */
let launchPromise: Promise<Browser> | null = null;

/**
 * 함수 번들에 포함되는 한글 폰트 파일명.
 * next.config.mjs 의 experimental.outputFileTracingIncludes 와 반드시 함께 관리할 것.
 */
const KOREAN_FONT_FILES = ["Pretendard-Regular.ttf", "Pretendard-Bold.ttf"];

/** 로컬 개발 환경에서 탐색할 Chrome/Chromium 표준 설치 경로 */
const LOCAL_CHROME_CANDIDATES = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

/**
 * 런타임에서 실제 존재하는 폰트 경로를 탐색한다.
 * cwd 가정에 의존하지 않도록 후보 경로를 순회한다.
 */
function resolveBundledFontPath(fileName: string): string | null {
  const candidates = [
    nodePath.join(process.cwd(), "public", "fonts", fileName),
    nodePath.join("/var/task", "public", "fonts", fileName),
    nodePath.join(process.cwd(), ".next", "server", "public", "fonts", fileName),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // 접근 불가 경로는 무시하고 다음 후보로
    }
  }

  return null;
}

/**
 * 한글 폰트를 Chromium 의 FONTCONFIG_PATH(/tmp/fonts)에 심볼릭 링크로 주입한다.
 *
 * @sparticuz/chromium 이 번들하는 폰트는 Open Sans(Latin/Greek/Cyrillic) 뿐이라
 * Lambda 환경에는 한글 글리프가 전혀 없어 페이지의 한글이 전부 공백으로 렌더된다.
 *
 * ⚠️ 호출 순서 주의:
 *   1) chromium.executablePath() 가 fonts.tar.br 을 /tmp/fonts 로 전개한다
 *      (fonts.conf + Open_Sans 포함. fonts.conf 의 <dir>/tmp/fonts</dir> 가 스캔 경로를 정의)
 *   2) lambdafs.inflate() 는 대상 디렉토리가 "이미 존재하면 전개를 건너뛴다"
 *   3) chromium.font() 는 첫 줄에서 mkdirSync(/tmp/fonts) 를 수행한다
 *   → font() 를 executablePath() 보다 먼저 부르면 fonts.conf 가 아예 전개되지 않아
 *     한글은 물론 영문까지 깨질 수 있다. 반드시 executablePath() 다음에 호출할 것.
 *
 * 폰트 등록에 실패해도 예외를 던지지 않는다 (렌더 품질만 저하되고 크롤링 자체는 계속되어야 함).
 */
async function registerKoreanFonts(): Promise<void> {
  for (const fileName of KOREAN_FONT_FILES) {
    try {
      const fontPath = resolveBundledFontPath(fileName);

      if (!fontPath) {
        console.warn(
          `[font] 번들에서 폰트를 찾지 못했습니다: ${fileName} (cwd=${process.cwd()}). ` +
            "next.config.mjs 의 outputFileTracingIncludes 설정을 확인하세요."
        );
        continue;
      }

      await chromium.font(fontPath);
    } catch (error) {
      // symlink EEXIST(끊어진 링크), 권한 오류 등 — 렌더 품질만 저하되고 동작은 계속된다
      console.warn(`[font] 등록 실패: ${fileName}`, error);
    }
  }
}

/** 로컬 개발 환경의 Chrome 실행 파일 경로를 찾는다 */
function resolveLocalChromePath(): string {
  const fromEnv =
    process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (fromEnv) return fromEnv;

  for (const candidate of LOCAL_CHROME_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      continue;
    }
  }

  // 경로 없이 launch 하면 puppeteer-core 가 알아보기 어려운 spawn 오류를 던진다.
  // 원인과 해결책을 그대로 담아 던져서 화면에 그대로 노출되게 한다.
  throw new Error(
    "로컬에서 실행할 Chrome 을 찾지 못했습니다. .env.local 에 CHROME_PATH 를 설정해주세요. " +
      "(예: CHROME_PATH=/usr/bin/google-chrome)"
  );
}

/**
 * Puppeteer 브라우저 인스턴스를 가져온다 (싱글톤).
 *
 * 싱글톤은 프로세스 수명 동안 유지되므로, 크래시로 죽은 핸들을 계속 돌려주면
 * "한 번은 됐는데 그 뒤로 계속 실패" 하는 상태에 빠진다. 매번 연결 상태를 확인한다.
 */
export async function getBrowser(): Promise<Browser> {
  if (browserInstance) {
    if (browserInstance.connected) return browserInstance;
    // 죽은 인스턴스는 버리고 새로 띄운다
    browserInstance = null;
  }

  // 이미 기동 중이면 그 프로미스를 함께 기다린다 (중복 launch 방지)
  if (launchPromise) return launchPromise;

  // finally 안에서 모듈 변수를 비우므로, 반환값은 지역 변수로 붙잡아 둔다
  const pending = launchBrowser()
    .then((browser) => {
      browserInstance = browser;
      return browser;
    })
    .finally(() => {
      // 실패했으면 다음 요청이 다시 시도할 수 있도록 잠금을 푼다
      launchPromise = null;
    });

  launchPromise = pending;
  return pending;
}

/** 실제 기동 — 동시 호출 제어는 getBrowser() 가 담당한다 */
async function launchBrowser(): Promise<Browser> {
  if (process.env.NODE_ENV === "production") {
    // 1) Chromium 바이너리 + fonts.tar.br(/tmp/fonts, fonts.conf 포함) 전개
    const executablePath = await chromium.executablePath();

    // 2) FONTCONFIG_PATH 명시적 보정.
    //    Vercel(VERCEL=1 && node>=20)에서는 @sparticuz/chromium import 시점에 이미
    //    /tmp/fonts 로 설정되지만, 그 조건이 깨진 환경(셀프호스팅 등)에서도
    //    fonts.tar.br 전개 경로(/tmp/fonts)와 일치하도록 안전망을 둔다.
    process.env.FONTCONFIG_PATH ??= nodePath.join(os.tmpdir(), "fonts");

    // 3) 한글 폰트 주입 — 반드시 executablePath() 이후, launch() 이전
    await registerKoreanFonts();

    // 4) 브라우저 기동 (환경변수는 launch 시점에 자식 프로세스로 상속된다)
    return puppeteer.launch({
      args: [
        ...chromium.args,
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
      ],
      defaultViewport: { width: 1280, height: 720 },
      executablePath,
      headless: true,
    });
  }

  return puppeteer.launch({
    executablePath: resolveLocalChromePath(),
    headless: true,
    defaultViewport: { width: 1280, height: 720 },
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
}

/** 브라우저 종료 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
