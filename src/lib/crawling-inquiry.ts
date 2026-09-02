// S12 문의 폼 순수 헬퍼.
//
// 프로젝트 규약상 클라이언트에서는 React Hook Form 을 쓰지 않고
// validateXxx(): Record<string, string> 인라인 오류 맵을 쓴다.
// (src/lib/youtube-monitoring.ts 의 validateSearchInput 과 같은 패턴)

import type { CollectCycle, CrawlingInquiryInput } from "@/types/crawling-landing";

/** 수집 주기 라디오 선택지 */
export const CYCLE_OPTIONS: { value: CollectCycle; label: string }[] = [
  { value: "once", label: "1회" },
  { value: "daily", label: "매일" },
  { value: "realtime", label: "실시간" },
  { value: "undecided", label: "미정" },
];

/** 폼 초기값 — 주기는 선택 항목이라 "미정"을 기본으로 둔다 */
export const EMPTY_INQUIRY: CrawlingInquiryInput = {
  targetUrls: "",
  dataFields: "",
  cycle: "undecided",
  contact: "",
  agreed: false,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** 하이픈·공백을 뺀 숫자만 10~11자리면 국내 휴대폰/유선 번호로 인정한다 */
function isPhoneLike(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

/**
 * 문의 폼 검증.
 *
 * 이 4필드가 그대로 견적 산정 인풋이 되므로(기획서 04장 S12) 필드를 더 늘리지 않는다.
 * 반환값이 빈 객체면 통과.
 */
export function validateCrawlingInquiry(
  input: CrawlingInquiryInput
): Record<string, string> {
  const errors: Record<string, string> = {};

  const urls = input.targetUrls.trim();
  if (!urls) {
    errors.targetUrls = "수집하고 싶은 사이트 주소를 입력해주세요.";
  } else if (!urls.split("\n").some((line) => line.includes("."))) {
    // "네이버쇼핑" 처럼 사이트명만 적으면 사전 기술검토를 시작할 수 없다
    errors.targetUrls = "example.com 처럼 주소 형태로 입력해주세요.";
  }

  const fields = input.dataFields.trim();
  if (!fields) {
    errors.dataFields = "필요한 데이터 항목을 입력해주세요.";
  } else if (fields.length < 2) {
    errors.dataFields = "항목을 조금 더 구체적으로 적어주세요.";
  }

  const contact = input.contact.trim();
  if (!contact) {
    errors.contact = "연락받으실 이메일 또는 휴대폰 번호를 입력해주세요.";
  } else if (!EMAIL_PATTERN.test(contact) && !isPhoneLike(contact)) {
    errors.contact = "이메일 또는 휴대폰 번호를 정확히 입력해주세요.";
  }

  if (!input.agreed) {
    errors.agreed = "개인정보 수집·이용에 동의해주세요.";
  }

  return errors;
}
