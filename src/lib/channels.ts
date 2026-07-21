// 키워드 확장이 지원하는 매체 정의 — 단일 출처.
// label 은 example.csv 헤더와 동일하게 유지한다.

import type { Channel, ChannelKey } from "@/types/keyword";

/** 쇼핑몰 9개 */
export const SHOPPING_CHANNELS: Channel[] = [
  { key: "coupang", label: "쿠팡", fullName: "쿠팡" },
  { key: "gmarket", label: "G마켓", fullName: "G마켓" },
  { key: "auction", label: "옥션", fullName: "옥션" },
  { key: "elevenst", label: "11번가", fullName: "11번가" },
  { key: "ssg", label: "SSG", fullName: "SSG.COM" },
  { key: "lotteon", label: "롯데ON", fullName: "롯데ON" },
  { key: "emart", label: "이마트몰", fullName: "이마트몰" },
  { key: "ali", label: "알리", fullName: "알리익스프레스" },
  { key: "temu", label: "테무", fullName: "테무" },
];

/** 검색엔진 3개 */
export const SEARCH_CHANNELS: Channel[] = [
  { key: "naver", label: "네이버", fullName: "네이버" },
  { key: "daum", label: "다음", fullName: "다음(카카오)" },
  { key: "google", label: "구글", fullName: "구글" },
];

export const channelKeys = (channels: Channel[]): ChannelKey[] =>
  channels.map((c) => c.key);
