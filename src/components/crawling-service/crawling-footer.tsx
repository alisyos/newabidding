// 랜딩 전용 푸터.
//
// 루트 layout.tsx 에 전역 푸터를 만들지 않는다. 사업자정보·개인정보처리방침 노출은
// 외부 광고 유입 페이지에서만 필요하고, 전역에 붙이면 모든 에이전트 작업 화면
// 하단에 사업자정보가 따라붙어 사내 툴 UX 가 어색해진다.

import { FOOTER_INFO } from "@/lib/crawling-landing";

// TODO(법무): 실제 방침 문서가 준비되면 href 를 교체한다.
const POLICY_LINKS = [
  { label: "개인정보처리방침", href: "#" },
  { label: "이용약관", href: "#" },
  { label: "사업자정보확인", href: "#" },
];

export function CrawlingFooter() {
  const info = FOOTER_INFO;

  return (
    // pb-24 는 모바일 하단 고정 CTA 가 최하단 내용을 덮지 않게 하는 여백이다
    <footer className="bg-slate-900 pb-24 pt-12 text-slate-400 md:pb-12">
      <div className="container mx-auto px-4">
        <p className="text-sm font-bold text-white">{info.company}</p>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <li>대표 {info.ceo}</li>
          <li>사업자등록번호 {info.businessNumber}</li>
          <li>통신판매업신고 {info.mailOrderNumber}</li>
          <li>{info.address}</li>
          <li>대표전화 {info.tel}</li>
          <li>{info.email}</li>
        </ul>

        <ul className="mt-6 flex flex-wrap gap-5 border-t border-white/10 pt-6 text-xs">
          {POLICY_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs text-slate-500">
          &copy; {info.company}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
