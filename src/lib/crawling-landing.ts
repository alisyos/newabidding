// 크롤링 개발 서비스 랜딩페이지 콘텐츠 (기획서 add/crawling/크롤링개발_랜딩페이지_기획서_v1.md 기준).
//
// 12섹션의 카피·수치·요금을 전부 여기 모아 둔다. 컴포넌트는 이 상수만 렌더하므로
// 카피 수정은 이 파일 하나만 고치면 되고, JSX 안에 큰따옴표를 직접 쓰지 않게 되어
// react/no-unescaped-entities 린트 오류도 함께 피한다.
//
// ⚠️ 확정 전 임시 데이터
// 아래 수치·금액·사례·사업자정보는 기획서 v1 초안 기준 플레이스홀더다.
// 영업/개발 확정 후 이 파일만 교체하면 화면 전체가 갱신된다.
// 대상: TRUST_STATS, CLIENT_PLACEHOLDERS, CASE_STUDIES, PRICING_PACKAGES, FOOTER_INFO

import {
  Activity,
  Bell,
  Bot,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Code2,
  Database,
  FileSpreadsheet,
  FileText,
  Gauge,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Lock,
  MessagesSquare,
  Plug,
  Scale,
  Search,
  Share2,
  ShieldAlert,
  ShoppingCart,
  Store,
  UserCheck,
  Users,
} from "lucide-react";
import type {
  CaseStudy,
  FaqItem,
  FooterInfo,
  HeroBadge,
  LegalCheck,
  OutputFormat,
  PainPoint,
  PricingPackage,
  ProcessStep,
  SourceCategory,
  TechChallenge,
  TrustStat,
} from "@/types/crawling-landing";

/* ------------------------------------------------------------------ S1 히어로 */

/** 헤드라인 A안 — 대체되는 노동을 판다 (기획서 04장) */
export const HERO_HEADLINE = ["사람이 매일 하던 데이터 수집,", "내일부터 프로그램이 합니다."];

export const HERO_SUBCOPY =
  "필요한 사이트, 필요한 항목만 골라 맞춤 제작합니다. 엑셀·DB·알림까지 원하는 형태로 받아보세요.";

/** 포지셔닝 문장 (기획서 01장) */
export const POSITIONING = {
  lead: "크롤러를 만들어 주는 곳은 많습니다.",
  emphasis: "우리는 계속 돌게 하는 곳입니다.",
  detail: "개발 · 차단 대응 · 구조 변경 대응 · 법적 검토를 한 팀이 책임집니다.",
};

export const HERO_BADGES: HeroBadge[] = [
  { label: "무료 사전 기술검토", icon: ClipboardCheck },
  { label: "법적 리스크 사전 진단", icon: Scale },
  { label: "운영 중 장애 대응 포함", icon: Activity },
];

export const HERO_PRIMARY_CTA = "1분 만에 무료 견적 받기";
export const HERO_SECONDARY_CTA = "실제 사례 먼저 보기";

/* ------------------------------------------------------------------- S2 신뢰 바 */

export const TRUST_STATS: TrustStat[] = [
  { value: "180+", label: "누적 개발 프로젝트" },
  { value: "94", label: "현재 운영 중인 크롤러" },
  { value: "99.2%", label: "최근 6개월 평균 가동률" },
];

/** 로고 사용 동의 확보 전이므로 업종 표기로 대체한다 (기획서 08장 체크리스트) */
export const CLIENT_PLACEHOLDERS: string[] = [
  "이커머스 A사",
  "마케팅 대행사 B",
  "제조 C사",
  "유통 D사",
  "채용 플랫폼 E",
  "공공기관 F",
];

export const CLIENT_PLACEHOLDER_NOTE = "고객사 요청에 따라 사명은 비공개로 표기합니다.";

/* ------------------------------------------------------------- S3 문제 공감 */

export const PAIN_POINTS: PainPoint[] = [
  {
    id: "agency",
    targetLabel: "에이전시 · 대행사",
    title: "매달 같은 리포트를 사람이 손으로 만듭니다",
    icon: Briefcase,
    situation:
      "클라이언트 리포팅용 경쟁사·순위·리뷰 데이터를 매달 인턴이 수기로 정리하고 있습니다.",
    realProblem:
      "진짜 문제는 인건비가 아니라 납기입니다. 마감일에 데이터가 없으면 계약이 흔들립니다.",
    hook: "매달 반복되는 수집 작업을 자동 리포트로.",
  },
  {
    id: "ecommerce",
    targetLabel: "이커머스 · 유통 셀러",
    title: "경쟁사 가격을 하루에도 몇 번씩 눈으로 확인합니다",
    icon: ShoppingCart,
    situation:
      "경쟁 상품의 가격·품절 여부·리뷰를 직접 검색해 가며 확인하고 계십니다.",
    realProblem:
      "늦게 알면 그만큼 매출이 빠집니다. 가격 변동 대응은 결국 시간 싸움입니다.",
    hook: "경쟁사 가격이 바뀌면 10분 안에 알림.",
  },
  {
    id: "smb",
    targetLabel: "중소기업 실무자",
    title: "매일 아침 여러 사이트를 돌며 자료를 모읍니다",
    icon: Building2,
    situation:
      "입찰공고·채용공고·업계 뉴스·고객사 동향을 매일 직접 열어 보고 취합합니다.",
    realProblem:
      "가장 크게 소모되는 건 본인 시간입니다. 사내 개발 리소스도, IT 예산 승인 절차도 만만치 않습니다.",
    hook: "출근하면 엑셀이 도착해 있습니다.",
  },
];

/* --------------------------------------------------------- S4 수집 가능 대상 */

export const SOURCE_CATEGORIES: SourceCategory[] = [
  { name: "쇼핑몰", icon: Store, examples: "상품명 · 가격 · 재고 · 리뷰 · 순위" },
  { name: "포털 · 검색", icon: Search, examples: "검색 결과 · 연관검색어 · 노출 순위" },
  { name: "공공데이터", icon: Landmark, examples: "입찰공고 · 인허가 · 통계 자료" },
  { name: "부동산", icon: Building2, examples: "매물 · 실거래가 · 시세 변동" },
  { name: "채용", icon: Users, examples: "채용공고 · 처우 · 마감일" },
  { name: "SNS", icon: Share2, examples: "게시물 · 댓글 · 반응 수" },
  { name: "뉴스 · 커뮤니티", icon: MessagesSquare, examples: "기사 · 게시글 · 언급량" },
  { name: "회원제 사이트", icon: Lock, examples: "로그인 이후 화면 · 내부 리포트" },
];

export const SOURCE_NOTE =
  "목록에 없는 사이트도 대부분 가능합니다. 주소만 알려주시면 실제로 접속해 확인한 뒤 회신드립니다.";

/* ------------------------------------------------------------- S5 결과물 형태 */

export const OUTPUT_FORMATS: OutputFormat[] = [
  {
    name: "엑셀 · CSV",
    icon: FileSpreadsheet,
    description: "바로 열어 쓰는 시트로 받습니다. 컬럼 구성도 원하는 대로 맞춥니다.",
  },
  {
    name: "DB 적재",
    icon: Database,
    description: "사내 데이터베이스에 바로 쌓습니다. 기존 테이블 스키마에 맞춰 넣어 드립니다.",
  },
  {
    name: "API 제공",
    icon: Plug,
    description: "수집 결과를 API 로 열어 드립니다. 사내 시스템에서 직접 호출하세요.",
  },
  {
    name: "슬랙 · 메일 알림",
    icon: Bell,
    description: "조건에 걸리는 변화가 생기면 즉시 알립니다. 가격 변동·품절·신규 공고 등.",
  },
  {
    name: "대시보드",
    icon: LayoutDashboard,
    description: "추이를 화면으로 봅니다. 보고용 화면이 필요할 때 함께 만들어 드립니다.",
  },
];

/* ---------------------------------------------------------- S6 기술 대응력 */

export const TECH_HEADLINE = "막힐 것 같아서 포기하셨다면, 그게 저희가 하는 일입니다.";

export const TECH_CHALLENGES: TechChallenge[] = [
  {
    title: "로그인 · 2단계 인증",
    icon: KeyRound,
    concern: "로그인해야 보이는 데이터라서요.",
    solution:
      "세션 유지·토큰 갱신 방식으로 로그인 이후 화면까지 수집합니다. 계정은 고객사가 정상적으로 보유한 계정만 사용하고, 수집 범위를 계약서에 명시합니다.",
  },
  {
    title: "JS 동적 렌더링 · 무한 스크롤",
    icon: Code2,
    concern: "스크롤을 내려야 상품이 더 나오는 페이지예요.",
    solution:
      "실제 브라우저를 띄워 렌더링이 끝난 화면을 읽습니다. 무한 스크롤도, 더보기 버튼도 끝까지 따라갑니다.",
  },
  {
    title: "IP 차단 · 요청 제한",
    icon: ShieldAlert,
    concern: "몇 번 돌리면 접속이 막히던데요.",
    solution:
      "요청 간격과 동시 실행 수를 대상 사이트에 맞춰 제어합니다. 차단은 서버 부하가 원인인 경우가 많아, 속도를 낮추는 설계가 가장 확실한 해법입니다.",
  },
  {
    title: "캡차",
    icon: Bot,
    // 기획서 주의사항: "우회" 표현을 쓰지 않는다
    concern: "중간에 자동입력 방지 문자가 뜹니다.",
    solution:
      "정상 접근 범위 내에서 처리 방식을 함께 협의합니다. 우회가 전제되어야 하는 구조라면 사전 기술검토 단계에서 불가로 회신드립니다.",
  },
  {
    title: "수십만 건 대용량 · 정기 스케줄링",
    icon: CalendarClock,
    concern: "상품이 30만 개인데 매일 돌려야 해요.",
    solution:
      "작업을 나눠 병렬로 실행하고 정해진 시각에 자동 수행합니다. 실패한 구간만 다시 시도하므로 전체를 처음부터 돌리지 않습니다.",
  },
];

/* --------------------------------------------------------- S7 진행 프로세스 */

export const PROCESS_STEPS: ProcessStep[] = [
  {
    step: 1,
    title: "상담 신청",
    detail: "수집 대상 URL 과 필요한 항목만 알려주시면 끝입니다.",
    duration: "당일",
  },
  {
    step: 2,
    title: "무료 사전 기술검토",
    detail: "실제로 접속해 수집 가능 여부와 난이도를 확인한 뒤 리포트로 회신드립니다.",
    duration: "1~2영업일",
    highlight: true,
  },
  {
    step: 3,
    title: "견적 · 범위 확정",
    detail: "수집 항목·주기·산출물 형태를 확정하고 계약을 진행합니다.",
    duration: "1~3영업일",
  },
  {
    step: 4,
    title: "개발 & 검수",
    detail: "샘플 데이터를 먼저 전달해 확인받은 뒤 완성합니다.",
    duration: "5~15영업일",
  },
  {
    step: 5,
    title: "운영 & 대응",
    detail: "정상 동작을 모니터링하고, 사이트 구조가 바뀌면 수정합니다.",
    duration: "계약 기간",
  },
];

export const PROCESS_NOTE =
  "2단계 사전 기술검토는 무료입니다. 검토 결과 수집이 어렵다고 판단되면 착수하지 않으므로, 상담만 받아보셔도 손해 볼 것이 없습니다.";

/* ------------------------------------------------------------- S8 도입 사례 */

// TODO(영업): 실제 고객 사례와 공개 동의를 확보하면 이 배열을 교체한다.
export const CASE_STUDIES: CaseStudy[] = [
  {
    targetLabel: "에이전시 · 대행사",
    profile: "직원 40명 규모 종합광고대행사",
    icon: Briefcase,
    before:
      "클라이언트 12개사의 경쟁사 순위·리뷰를 매달 인턴 2명이 3일 동안 수기로 정리했습니다.",
    after:
      "매월 1일 오전 자동 수집 후 클라이언트별 시트로 분리해 메일 발송합니다. 담당자는 해석만 합니다.",
    metrics: [
      { value: "-94%", label: "작업 시간" },
      { value: "월 32시간", label: "절감" },
      { value: "0건", label: "누락 발생" },
    ],
    disclaimer: "내부 데모 프로젝트 기준 추정 수치입니다.",
  },
  {
    targetLabel: "이커머스 · 유통 셀러",
    profile: "월 매출 8억 규모 생활용품 셀러",
    icon: ShoppingCart,
    before:
      "주력 상품 40종의 경쟁사 가격을 하루 3회 직접 검색해 확인했고, 변동을 놓치는 일이 잦았습니다.",
    after:
      "10분 간격으로 가격·품절을 확인해 변동 시 슬랙으로 알립니다. 대응까지 걸리는 시간이 크게 줄었습니다.",
    metrics: [
      { value: "10분", label: "변동 감지 주기" },
      { value: "40종", label: "상시 모니터링" },
      { value: "24시간", label: "무중단 운영" },
    ],
    disclaimer: "내부 데모 프로젝트 기준 추정 수치입니다.",
  },
  {
    targetLabel: "중소기업 실무자",
    profile: "임직원 60명 규모 건설자재 제조사",
    icon: Building2,
    before:
      "담당자가 매일 아침 공공 입찰 사이트 5곳을 직접 돌며 신규 공고를 확인했습니다.",
    after:
      "매일 08시에 조건에 맞는 공고만 추려 엑셀로 메일 발송합니다. 출근 전에 목록이 준비됩니다.",
    metrics: [
      { value: "일 50분", label: "확인 시간 절감" },
      { value: "5곳", label: "동시 수집" },
      { value: "08:00", label: "매일 자동 발송" },
    ],
    disclaimer: "내부 데모 프로젝트 기준 추정 수치입니다.",
  },
];

export const CASE_NOTE =
  "고객사 공개 동의 확보 전이라 사명은 익명 처리했으며, 수치는 내부 데모 프로젝트 기준입니다.";

/* ------------------------------------------------------ S9 법적 안전성 ★차별화 */

export const LEGAL_HEADLINE = "이거 해도 되는 건가요? 그 질문부터 같이 검토합니다.";

export const LEGAL_SUBCOPY =
  "크롤링은 되는 것과 안 되는 것의 경계가 분명히 있습니다. 착수 전에 함께 확인하고, 확인한 범위를 계약서에 적습니다.";

export const LEGAL_CHECKS: LegalCheck[] = [
  {
    title: "이용약관 · robots.txt 확인",
    detail: "대상 사이트가 수집을 어떻게 규정하고 있는지 먼저 읽습니다.",
    icon: FileText,
  },
  {
    title: "로그인 · 유료 회원 데이터 여부",
    detail: "접근 권한이 걸린 영역인지, 공개된 정보인지를 구분합니다.",
    icon: Lock,
  },
  {
    title: "수집량과 서버 부하 수준",
    detail: "대상 서버에 실질적인 부담을 주는 규모인지 사전에 산정합니다.",
    icon: Gauge,
  },
  {
    title: "개인정보 포함 여부",
    detail: "개인을 식별할 수 있는 정보가 섞이는지 확인하고 처리 방침을 정합니다.",
    icon: UserCheck,
  },
];

/** 대법원이 나눠 판단하는 3가지 기준 (기획서 04장 S9) */
export const LEGAL_CRITERIA: string[] = [
  "접근 권한이 제한되어 있었는지",
  "데이터베이스의 상당 부분을 반복적·체계적으로 복제했는지",
  "대상 사이트에 현실적인 업무 장애가 발생했는지",
];

export const LEGAL_CRITERIA_NOTE =
  "공개된 정보를 소량 수집하는 것과, 회원 계정을 통해 대량으로 복제하는 것은 완전히 다른 사안입니다.";

export const LEGAL_PRINCIPLES: string[] = [
  "요청 간격을 제어해 대상 서버 부하를 최소화합니다.",
  "수집 범위와 용도를 계약서에 명문화합니다.",
];

/** 기획서 필수 병기 문구 — 삭제 금지 */
export const LEGAL_DISCLAIMER =
  "본 내용은 법률 자문이 아니며, 최종 판단은 의뢰인 책임입니다. 리스크가 높다고 판단되면 저희가 프로젝트를 수임하지 않습니다.";

/* ------------------------------------------------------------------ S10 요금 */

export const PRICING_PACKAGES: PricingPackage[] = [
  {
    name: "라이트",
    subtitle: "1회성 수집",
    price: "50만원",
    priceNote: "부터",
    target: "필요한 자료를 한 번만 받아보고 싶은 실무자",
    features: [
      "단일 사이트 · 정적 페이지 수집",
      "엑셀 · CSV 산출물 1회 전달",
      "무료 사전 기술검토 포함",
      "수집 항목 협의 1회",
    ],
  },
  {
    name: "스탠다드",
    subtitle: "정기 자동 수집",
    price: "200만원",
    priceNote: "부터",
    target: "경쟁사 가격·순위를 계속 지켜봐야 하는 이커머스 셀러",
    features: [
      "로그인 · 동적 페이지 대응",
      "정기 스케줄 자동 실행",
      "슬랙 · 메일 알림 연동",
      "DB 적재 또는 API 제공",
      "검수 기간 내 수정 대응",
    ],
    featured: true,
  },
  {
    name: "운영형",
    subtitle: "개발 + 월 운영",
    price: "월 50만원",
    priceNote: "부터",
    target: "클라이언트 납기를 책임져야 하는 에이전시·대행사",
    features: [
      "스탠다드 전 범위 포함",
      "사이트 구조 변경 시 무상 수정",
      "차단 발생 시 대응 포함",
      "가동 상태 상시 모니터링",
      "전담 담당자 배정",
    ],
  },
];

/** 기획서 필수 병기 문구 — 이 한 줄이 없으면 표기 금액이 상한선으로 인식된다 */
export const PRICING_NOTICE =
  "가격은 수집 대상 사이트의 구조와 난이도에 따라 달라집니다. 정확한 금액은 무료 기술검토 후 안내드립니다.";

export const PRICING_CTA = "무료로 견적 받아보기";

/* -------------------------------------------------------------------- S11 FAQ */

// 순서는 문의 빈도순이 아니라 구매 저항 크기순이다 (기획서 06장)
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "비용이 얼마나 드나요?",
    answer:
      "로그인이 필요한지, 페이지가 동적으로 그려지는지, 수집량이 얼마나 되는지에 따라 크게 달라집니다. 단순 수집은 50만원대부터, 정기 자동 수집은 200만원대부터 시작합니다. 정확한 금액은 무료 사전 기술검토에서 실제 사이트를 확인한 뒤 안내드립니다.",
  },
  {
    question: "기간은 얼마나 걸리나요?",
    answer:
      "단순한 건은 5영업일, 일반적인 경우 2주, 로그인·대용량이 겹치는 복합 건은 3~4주 정도입니다. 개발 중에도 샘플 데이터를 먼저 전달드려 방향을 확인받습니다.",
  },
  {
    question: "법적으로 문제 없나요?",
    answer:
      "착수 전에 이용약관과 robots.txt, 로그인·유료 회원 데이터 여부, 수집량과 서버 부하, 개인정보 포함 여부를 확인합니다. 확인한 범위는 계약서에 명시합니다. 리스크가 높다고 판단되면 저희가 수임하지 않습니다. 다만 이 검토는 법률 자문이 아니며 최종 판단은 의뢰인 책임입니다.",
  },
  {
    question: "사이트가 바뀌면 어떻게 되나요?",
    answer:
      "사이트 구조가 바뀌면 크롤러는 멈춥니다. 이건 예외가 아니라 정상적으로 일어나는 일입니다. 운영형 계약에서는 구조 변경에 따른 수정을 월 운영비에 포함해 무상으로 대응합니다. 라이트·스탠다드는 별도 견적으로 처리합니다.",
    defaultOpen: true,
  },
  {
    question: "차단당하면요?",
    answer:
      "요청 간격과 동시 실행 수를 조정해 대응합니다. 차단은 과도한 요청이 원인인 경우가 대부분이라 속도를 낮추면 대개 해결됩니다. 구조적으로 어렵다고 판단되면 사전 기술검토 단계에서 미리 알려드립니다.",
  },
  {
    question: "소스코드는 저희가 갖나요?",
    answer:
      "라이트·스탠다드는 개발 완료 후 소스코드를 인도합니다. 운영형은 저희가 운영을 맡는 구조라 계약 종료 시 인도 조건을 계약서에 별도로 정합니다. 인도 범위는 계약 전에 문서로 확정합니다.",
  },
  {
    question: "중간에 안 되면 환불되나요?",
    answer:
      "사전 기술검토에서 수집이 어렵다고 판단되면 애초에 착수하지 않기 때문에, 개발 도중 불가 판정이 나는 상황 자체가 거의 발생하지 않습니다. 검토는 무료이고 결과가 부정적이어도 비용은 청구하지 않습니다.",
  },
];

/* ------------------------------------------------------------ S12 최종 CTA */

export const CONTACT_HEADLINE = "무료 기술검토부터 시작하세요";

export const CONTACT_SUBCOPY =
  "수집하려는 사이트와 항목만 알려주시면 됩니다. 실제로 접속해 가능 여부를 확인한 뒤 회신드립니다.";

export const CONTACT_SUBMIT_LABEL = "무료 기술검토 신청";

export const CONTACT_MICROCOPY =
  "영업일 기준 1일 내 수집 가능 여부를 회신드립니다. 상담 후 진행하지 않으셔도 비용은 없습니다.";

export const CONTACT_PRIVACY_LABEL =
  "상담 회신을 위한 개인정보 수집·이용에 동의합니다. (수집 항목: 연락처 / 보유 기간: 상담 종료 후 1년)";

export const CONTACT_SUCCESS_TITLE = "신청이 접수되었습니다";

export const CONTACT_SUCCESS_BODY =
  "영업일 기준 1일 내에 수집 가능 여부와 예상 난이도를 정리해 회신드립니다. 회신 메일에는 유사 사례집을 함께 첨부해 드립니다.";

/* ---------------------------------------------------------------- 푸터 */

// TODO(영업/법무): 실제 사업자정보와 방침 문서 링크로 교체한다.
export const FOOTER_INFO: FooterInfo = {
  company: "주식회사 지피티코리아",
  ceo: "홍길동",
  businessNumber: "000-00-00000",
  mailOrderNumber: "제0000-서울강남-00000호",
  address: "서울특별시 강남구 테헤란로 000, 00층",
  tel: "02-0000-0000",
  email: "contact@example.com",
};
