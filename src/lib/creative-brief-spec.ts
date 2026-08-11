// 광고 소재 기획 입력 선택지 단일 출처.
// 업종 목록은 새로 만들지 않고 ad-copy-spec.ts 의 INDUSTRIES 를 재사용한다.

import type {
  BriefSelection,
  CampaignObjective,
  CreativeBriefInput,
  CreativeBriefResult,
  CreativeMediaKey,
  CreativeMediaSpec,
} from "@/types/creative-brief";

/** 매체 표시 순서 단일 출처 */
export const CREATIVE_MEDIA_KEYS: CreativeMediaKey[] = [
  "instagram",
  "youtube",
  "naver",
  "kakao",
  "facebook",
  "display",
  "tv",
  "ooh",
];

/**
 * 매체별 소재 특성.
 * hint 는 프롬프트에 그대로 들어가므로 "제작 시 지켜야 할 제약"을 짧게 적는다.
 */
export const CREATIVE_MEDIA: Record<CreativeMediaKey, CreativeMediaSpec> = {
  instagram: {
    key: "instagram",
    label: "인스타그램",
    hint: "피드·릴스. 세로형 비주얼이 먼저 눈에 들어오므로 헤드라인은 이미지 위 한 줄로 읽히게 짧게. 해시태그 문화와 트렌디한 어투가 자연스럽다.",
  },
  youtube: {
    key: "youtube",
    label: "유튜브",
    hint: "영상 소재. 첫 3~5초 안에 후킹이 끝나야 하며 스킵 전에 핵심 메시지가 나와야 한다. 바디카피는 내레이션·자막으로 읽힌다는 전제로 작성.",
  },
  naver: {
    key: "naver",
    label: "네이버",
    hint: "검색·디스플레이. 정보 탐색 맥락이라 과장보다 구체적 혜택과 신뢰 근거가 통한다.",
  },
  kakao: {
    key: "kakao",
    label: "카카오",
    hint: "비즈보드·모먼트. 메시지 소비 맥락이라 짧고 대화체에 가까운 어투가 잘 맞는다.",
  },
  facebook: {
    key: "facebook",
    label: "페이스북",
    hint: "피드 광고. 스크롤 중 멈춰 세우는 첫 문장이 중요하고, 바디카피는 더보기 전 2줄 안에 요지가 드러나야 한다.",
  },
  display: {
    key: "display",
    label: "디스플레이 배너",
    hint: "배너 지면. 노출 시간이 매우 짧아 헤드라인 한 줄과 비주얼 한 컷으로 승부한다. 문장이 길면 읽히지 않는다.",
  },
  tv: {
    key: "tv",
    label: "TV·영상",
    hint: "15~30초 광고. 기승전결과 엔딩 슬로건 구조가 필요하며 카피는 소리 내어 읽었을 때 리듬이 살아야 한다.",
  },
  ooh: {
    key: "ooh",
    label: "옥외(OOH)",
    hint: "지하철·옥외 대형 매체. 3초 안에 스쳐 지나가며 읽히므로 헤드라인은 극단적으로 짧고 비주얼 임팩트가 핵심이다.",
  },
};

/** 한 번에 선택할 수 있는 매체 수 */
export const MAX_MEDIA = 3;

/** 캠페인 목적 */
export const OBJECTIVES: CampaignObjective[] = [
  "브랜드인지",
  "구매전환",
  "트래픽",
  "앱설치",
  "리드확보",
  "재구매",
];

/** 목적별 소재 방향 지시문 (프롬프트용) */
export const OBJECTIVE_INSTRUCTIONS: Record<CampaignObjective, string> = {
  브랜드인지:
    "브랜드가 기억에 남는 것이 1순위다. 즉각적인 행동 유도보다 브랜드 태도와 세계관을 각인시켜라.",
  구매전환:
    "구매 결정을 막는 망설임(가격·신뢰·번거로움)을 직접 해소하고, 지금 사야 할 이유를 명확히 제시하라.",
  트래픽:
    "클릭해서 더 알아보고 싶게 만드는 호기심 갭을 설계하라. 정보를 다 주지 말고 궁금증을 남겨라.",
  앱설치:
    "앱에서만 얻는 편익을 구체적으로 보여주고, 설치가 간단하다는 인상을 주어라.",
  리드확보:
    "상담·신청의 심리적 장벽을 낮춰라. 무료·간편·부담없음 같은 진입 장벽 제거 메시지를 앞세워라.",
  재구매:
    "이미 써본 사람에게 말하듯 써라. 익숙함을 자극하고 다시 살 명분(재입고·시즌·업그레이드)을 제시하라.",
};

/** 톤앤매너 */
export const TONE_OPTIONS: string[] = [
  "감성적",
  "유머러스",
  "신뢰·전문적",
  "트렌디·힙",
  "혜택 직관형",
  "미니멀",
  "스토리텔링",
  "도발적",
];

/** 톤별 구체 지시문 (프롬프트용) */
export const TONE_INSTRUCTIONS: Record<string, string> = {
  감성적:
    "감성적 — 정보 전달보다 감정의 결을 건드린다. 일상의 장면과 관계를 묘사하고 형용사보다 상황으로 감정을 만든다.",
  유머러스:
    "유머러스 — 예상을 비트는 반전이나 과장된 상황을 쓴다. 다만 비하·조롱은 쓰지 않는다.",
  "신뢰·전문적":
    "신뢰·전문적 — 숫자·근거·전문성을 앞세운 차분한 단정문. 감탄사와 과장 수식어를 쓰지 않는다.",
  "트렌디·힙":
    "트렌디·힙 — 요즘 어투와 리듬감 있는 짧은 문장. 단, 특정 시기에만 통하는 유행어 남발은 피한다.",
  "혜택 직관형":
    "혜택 직관형 — 혜택과 조건을 앞에 배치하고 군더더기를 제거한다. 읽는 즉시 이득이 계산되게 쓴다.",
  미니멀:
    "미니멀 — 최소한의 단어. 수식어를 덜어내고 명사와 동사만 남긴다. 여백이 메시지가 되게 한다.",
  스토리텔링:
    "스토리텔링 — 화자와 장면이 있는 짧은 서사. 바디카피에서 상황→변화→결과 흐름을 만든다.",
  도발적:
    "도발적 — 통념을 정면으로 반박하는 문장으로 시작한다. 근거 없는 비방이 되지 않도록 반박의 근거를 함께 둔다.",
};

/** 한 번에 선택할 수 있는 톤앤매너 수 */
export const MAX_TONES = 2;

/**
 * SelectField 옵션 형태.
 * 이 파일은 서버 라우트에서도 import 되므로 "use client" 컴포넌트에서
 * 타입을 끌어오지 않고 여기서 별도로 선언한다.
 */
interface BriefSelectOption {
  value: string;
  label: string;
}

export const AGE_RANGES: BriefSelectOption[] = [
  { value: "10대", label: "10대" },
  { value: "20대", label: "20대" },
  { value: "30대", label: "30대" },
  { value: "40대", label: "40대" },
  { value: "50대 이상", label: "50대 이상" },
  { value: "20~30대", label: "20~30대" },
  { value: "30~40대", label: "30~40대" },
  { value: "전연령", label: "전연령" },
];

export const GENDERS: BriefSelectOption[] = [
  { value: "무관", label: "무관" },
  { value: "여성", label: "여성" },
  { value: "남성", label: "남성" },
];

/** 참조 자료 붙여넣기/업로드 상한 (프롬프트 길이 통제) */
export const MAX_REFERENCE_CHARS = 4000;

/** 안별 생성 개수 범위 */
export const COUNT_RANGE = { min: 1, max: 5 } as const;

/** 폼 초기값 — 요구 스펙 기본값(헤드라인 3 / 바디카피 3 / 콘셉트 2) */
export function createDefaultBriefInput(): CreativeBriefInput {
  return {
    advertiser: "",
    industry: "general",
    productName: "",
    media: ["instagram"],
    targetAudience: { ageRange: "20~30대", gender: "무관", interests: "" },
    audienceDescription: "",
    objective: "브랜드인지",
    toneAndManner: ["감성적"],
    keyMessages: [],
    mustInclude: [],
    excludeWords: [],
    referencePlan: "",
    copyGuide: "",
    variantCount: { headlines: 3, bodyCopies: 3, concepts: 2 },
  };
}

/** 매체 라벨 조회 */
export function mediaLabel(key: CreativeMediaKey): string {
  return CREATIVE_MEDIA[key]?.label ?? key;
}

/** 선택 매체를 표시 순서대로 정렬 (토글 순서에 흔들리지 않게) */
export function sortMedia(keys: CreativeMediaKey[]): CreativeMediaKey[] {
  return CREATIVE_MEDIA_KEYS.filter((k) => keys.includes(k));
}

/** 생성 결과의 첫 번째 안으로 초기 선택 상태를 만든다 */
export function createSelection(result: CreativeBriefResult): BriefSelection {
  const concept = result.concepts[0];
  return {
    headlineIndex: 0,
    bodyIndex: 0,
    conceptIndex: 0,
    headlineText: result.headlines[0]?.text ?? "",
    bodyText: result.bodyCopies[0]?.text ?? "",
    conceptName: concept?.name ?? "",
    conceptDirection: concept?.direction ?? "",
    conceptKeyMessage: concept?.keyMessage ?? "",
    visualDirection: concept?.visualDirection ?? "",
    memo: "",
  };
}
