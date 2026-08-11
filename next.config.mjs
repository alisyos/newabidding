/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // puppeteer-core / @sparticuz/chromium 은 네이티브 바이너리를 포함하므로
    // 번들링하지 않고 런타임에 그대로 require 한다.
    serverComponentsExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],

    // src/lib/puppeteer.ts 의 registerKoreanFonts() 가 런타임에 읽는 한글 TTF를
    // serverless 함수 번들에 고정한다. (@sparticuz/chromium 은 Open Sans만 번들하므로
    // 이 폰트가 없으면 크롤링 페이지의 한글이 전부 공백으로 렌더된다.)
    //
    // 현재는 globals.css 의 @font-face 참조 덕분에 이 설정 없이도 트레이스에 잡히지만,
    // 그 CSS가 woff2 로 바뀌거나 제거되면 폰트가 조용히 번들에서 빠지고 한글 깨짐이
    // 재발한다(로컬에서는 재현되지 않음). 의존 관계를 명시해 그 회귀를 막는다.
    //
    // 키는 normalizeAppPath 결과(/app/api/...)에 대해 picomatch{contains:true}로 매칭되므로
    // '/app' 접두사 없이 '/api/**' 로 충분하다. getBrowser()를 여러 스크래퍼가 공유하므로
    // 특정 라우트가 아닌 전체 API 라우트를 대상으로 한다.
    outputFileTracingIncludes: {
      "/api/**": [
        "./public/fonts/Pretendard-Regular.ttf",
        "./public/fonts/Pretendard-Bold.ttf",
      ],
    },
  },
};

export default nextConfig;
