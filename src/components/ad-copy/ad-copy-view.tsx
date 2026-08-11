"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdCopyForm } from "@/components/ad-copy/ad-copy-form";
import { AdCopyResults } from "@/components/ad-copy/ad-copy-results";
import { buildAdCopyCsv } from "@/lib/ad-copy-csv";
import { evaluateResults, flattenItems } from "@/lib/ad-copy-evaluate";
import { MEDIA_SPECS, blockedMediaFor, findIndustry } from "@/lib/ad-copy-spec";
import { downloadCsv } from "@/lib/keyword-csv";
import { userName } from "@/lib/users";
import {
  costForAdCopy,
  useAgentPrice,
  useCurrentBalance,
  useCurrentUserId,
  usePointsStore,
} from "@/store/points";
import type {
  AdCopyInput,
  AdCopyMediaResult,
  AdMediaKey,
  AdVariantCount,
} from "@/types/ad-copy";

/** 과금 대상 에이전트 (관리자 페이지의 단가와 연결) */
const AD_COPY_AGENT_ID = "ad-copy-generator" as const;

/** 오늘 날짜 (YYYY.MM.DD) */
function todayString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/** 폼 초기값 */
function createDefaultInput(): AdCopyInput {
  return {
    media: ["naver"],
    landingUrl: "",
    industry: "general",
    brandName: "",
    productName: "",
    targetKeywords: [],
    keyBenefits: [],
    usp: "",
    cta: "",
    promotion: { discountRate: "", period: "", event: "" },
    price: { itemName: "", amount: "", qualifier: "" },
    targetAudience: { gender: "", ageRange: "", interests: "" },
    toneAndManner: "혜택강조형",
    mustInclude: [],
    excludeWords: [],
    superlative: { use: false, evidence: "" },
    reviewNumber: "",
    variantCount: {},
    diversityLevel: "균형",
  };
}

/** 매체의 생성 개수 (미지정이면 스펙 기본값) */
function countsFor(input: AdCopyInput, media: AdMediaKey): AdVariantCount {
  const spec = MEDIA_SPECS[media];
  return (
    input.variantCount[media] ?? {
      titles: spec.fields.title.defaultCount,
      descriptions: spec.fields.description.defaultCount,
    }
  );
}

/** 입력값 수동 검증 — 인라인 오류 메시지 맵 반환 */
function validateInput(input: AdCopyInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (input.media.length === 0) {
    errors.media = "매체를 1개 이상 선택해주세요.";
  } else {
    const blocked = blockedMediaFor(input.industry, input.media);
    if (blocked.length > 0) {
      errors.media = `${blocked
        .map((m) => MEDIA_SPECS[m].shortName)
        .join("·")}는 선택한 업종의 광고를 등록할 수 없습니다. 매체 또는 업종을 변경해주세요.`;
    }
  }

  const url = input.landingUrl.trim();
  if (!url) {
    errors.landingUrl = "연결(랜딩) URL을 입력해주세요.";
  } else if (!/^https?:\/\/.+/i.test(url)) {
    errors.landingUrl = "http:// 또는 https:// 로 시작하는 URL을 입력해주세요.";
  }

  if (!input.industry) errors.industry = "업종을 선택해주세요.";
  if (input.targetKeywords.length === 0) {
    errors.targetKeywords = "타깃 키워드를 1개 이상 입력해주세요.";
  }
  if (input.keyBenefits.length === 0) {
    errors.keyBenefits = "핵심 혜택을 1개 이상 입력해주세요.";
  }
  if (input.superlative.use && !input.superlative.evidence.trim()) {
    errors.superlative =
      "최상급 표현을 쓰려면 객관적 근거를 입력해야 합니다. (근거 없으면 반려됩니다)";
  }

  // 사전심의 대상 업종(병의원/의료·건강기능식품)은 심의필 번호 없이 집행할 수 없다.
  // 조건식은 필드 렌더 게이트(advanced-options.tsx)와 같은 식을 써서
  // "필수인데 화면에 없는 필드" 상태가 생기지 않게 한다.
  const industry = findIndustry(input.industry);
  if (industry?.reviewNumberRequired === true && !input.reviewNumber.trim()) {
    errors.reviewNumber =
      "사전심의 대상 업종입니다. 고급 옵션에서 심의필 번호를 입력해주세요.";
  }

  return errors;
}

/** 광고 문구 생성 컨테이너 — 상태·API 호출·포인트·복사/다운로드를 모두 담당한다 */
export function AdCopyView() {
  const [form, setForm] = useState<AdCopyInput>(createDefaultInput);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [apiError, setApiError] = useState<string | null>(null);
  const [rawResults, setRawResults] = useState<AdCopyMediaResult[]>([]);
  const [activeMedia, setActiveMedia] = useState<AdMediaKey | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resultInput, setResultInput] = useState<AdCopyInput | null>(null);

  const balance = useCurrentBalance();
  const currentUserId = useCurrentUserId();
  const deduct = usePointsStore((s) => s.deduct);
  const unitPrice = useAgentPrice(AD_COPY_AGENT_ID);

  const loading = status === "loading";

  /** 예상 차감 포인트 */
  const cost = useMemo(
    () => costForAdCopy(form.media.map((m) => countsFor(form, m)), unitPrice),
    [form, unitPrice]
  );

  /** 총 생성 문구 수 */
  const totalCount = useMemo(
    () =>
      form.media.reduce((sum, m) => {
        const c = countsFor(form, m);
        return sum + c.titles + c.descriptions;
      }, 0),
    [form]
  );

  /**
   * 결과 검증은 생성 시점의 입력값(resultInput)으로 한다.
   * 결과를 본 뒤 폼을 수정해도 이미 생성된 문구의 배지가 흔들리지 않는다.
   */
  const evaluated = useMemo(
    () => (resultInput ? evaluateResults(rawResults, resultInput) : []),
    [rawResults, resultInput]
  );

  const selectedCount = useMemo(
    () =>
      evaluated.reduce(
        (sum, r) => sum + flattenItems(r).filter((i) => selectedIds.has(i.id)).length,
        0
      ),
    [evaluated, selectedIds]
  );

  const patchForm = (patch: Partial<AdCopyInput>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleGenerate = async () => {
    // 생성을 시작한 시점의 사용자에게 과금한다.
    // await 사이에 헤더에서 사용자를 바꿔도 과금 대상이 흔들리지 않는다.
    const chargeUserId = currentUserId;

    const v = validateInput(form);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      toast.error("입력값을 확인해주세요.");
      return;
    }

    // 잔액은 먼저 확인만 하고, 차감은 생성 성공 후에 한다 (실패 시 환불 불필요)
    if (balance < cost) {
      toast.error(
        `포인트가 부족합니다. (필요 ${cost.toLocaleString()}P · 보유 ${balance.toLocaleString()}P)`
      );
      return;
    }

    setStatus("loading");
    setApiError(null);

    try {
      const res = await fetch("/api/ad-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: form }),
      });
      const json = await res.json();

      if (!res.ok) {
        const message = json?.error?.message ?? "광고문구 생성에 실패했습니다.";
        setApiError(message);
        toast.error(message);
        setStatus("idle");
        return;
      }

      const results: AdCopyMediaResult[] = json.results ?? [];
      const okResults = results.filter((r) => r.status === "ok");

      // 실제로 받은 문구 수만큼만 과금한다.
      // 서버는 요청 개수를 slice 로 자르기만 하고 모자란 만큼 채우지 않으므로
      // (strict 스키마가 minItems 를 강제하지 못한다) 요청 개수로 계산하면 과다 청구가 된다.
      // 응답 배열 길이를 쓰면 생성 중 폼을 수정해도 차감액이 흔들리지 않는 효과도 있다.
      const chargedResults = okResults.filter(
        (r) => r.titles.length + r.descriptions.length > 0
      );
      const chargedCost = costForAdCopy(
        chargedResults.map((r) => ({
          titles: r.titles.length,
          descriptions: r.descriptions.length,
        })),
        unitPrice
      );
      const chargedCount = chargedResults.reduce(
        (n, r) => n + r.titles.length + r.descriptions.length,
        0
      );

      // 한 건도 생성되지 않았으면 차감도 기록도 하지 않는다.
      // 판단 기준은 금액이 아니라 건수다 — deduct 는 0P 사용도 일부러 기록하는데
      // (단가를 0으로 설정한 무료 기능도 내역에 남기기 위함) 금액으로 막으면 그게 깨진다.
      const charged = chargedResults.length > 0;
      if (
        charged &&
        !deduct({
          userId: chargeUserId,
          agentId: AD_COPY_AGENT_ID,
          amount: chargedCost,
          detail: `${chargedResults
            .map((r) => MEDIA_SPECS[r.media].shortName)
            .join("·")} 문구 ${chargedCount}건`,
        })
      ) {
        toast.error(
          "포인트가 부족합니다. 관리자 페이지에서 충전해주세요."
        );
        setStatus("idle");
        return;
      }

      const snapshot = form;
      const nextEvaluated = evaluateResults(results, snapshot);
      // 규정 위반이 없는 문구만 기본 선택
      const defaultSelected = new Set(
        nextEvaluated.flatMap((r) =>
          flattenItems(r)
            .filter((i) => !i.hasError)
            .map((i) => i.id)
        )
      );

      setResultInput(snapshot);
      setRawResults(results);
      setSelectedIds(defaultSelected);
      // 문구가 실제로 담긴 탭을 먼저 연다 (빈 탭이 먼저 열리지 않도록)
      setActiveMedia(
        chargedResults[0]?.media ?? okResults[0]?.media ?? results[0]?.media ?? null
      );
      setStatus("done");

      const failed = results.filter((r) => r.status === "error");
      if (failed.length > 0) {
        toast.error(
          `${failed
            .map((r) => MEDIA_SPECS[r.media].shortName)
            .join("·")} 매체는 생성에 실패했습니다.`
        );
      }
      // 응답은 성공(ok)인데 문구가 한 건도 없는 매체 — 차감하지 않았음을 알린다
      const empty = okResults.filter(
        (r) => r.titles.length + r.descriptions.length === 0
      );
      if (empty.length > 0) {
        toast.error(
          `${empty
            .map((r) => MEDIA_SPECS[r.media].shortName)
            .join("·")} 매체는 생성된 문구가 없어 차감하지 않았습니다.`
        );
      }

      // 실제로 생성된 문구가 있을 때만 성공 토스트를 띄운다.
      // 건수를 함께 보여줘서 요청보다 적게 생성된 경우가 눈에 띄게 한다.
      if (charged) {
        toast.success(
          `광고문구 ${chargedCount}건 생성 완료 · ${userName(chargeUserId)}님 계정에서 ${chargedCost.toLocaleString()}P 차감되었습니다.`
        );
      }
    } catch {
      const message = "네트워크 오류로 생성에 실패했습니다.";
      setApiError(message);
      toast.error(message);
      setStatus("idle");
    }
  };

  const handleToggle = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleAll = (ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("문구를 복사했습니다.");
    } catch {
      toast.error("클립보드 복사에 실패했습니다.");
    }
  };

  const handleCopySelected = async () => {
    const texts = evaluated.flatMap((r) =>
      flattenItems(r)
        .filter((i) => selectedIds.has(i.id))
        .map((i) => i.text)
    );
    if (texts.length === 0) {
      toast.error("복사할 문구를 선택해주세요.");
      return;
    }
    try {
      await navigator.clipboard.writeText(texts.join("\n"));
      toast.success(`${texts.length}개 문구를 복사했습니다.`);
    } catch {
      toast.error("클립보드 복사에 실패했습니다.");
    }
  };

  const handleDownloadCsv = () => {
    if (!resultInput) return;
    if (selectedCount === 0) {
      toast.error("다운로드할 문구를 선택해주세요.");
      return;
    }
    const date = todayString();
    downloadCsv(
      `ad_copy_${date.replace(/\./g, "")}.csv`,
      buildAdCopyCsv(evaluated, {
        title: "검색광고 광고문구 생성 결과",
        createdDate: date,
        input: resultInput,
        selectedIds,
      })
    );
    toast.success(`${selectedCount}개 문구를 CSV로 내보냈습니다.`);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-muted/20">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">광고 문구 생성</h1>
          <p className="text-sm text-muted-foreground">
            네이버·카카오·구글 <b>검색광고 소재</b>를 매체 규정(글자수·금지표현)에
            맞춰 자동 생성합니다. 생성된 문구는 매체별 카운터와 사전 필터로 검증해
            반려 위험을 함께 표시합니다.
          </p>
        </div>

        {/* 1. 광고 정보 입력 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. 광고 정보 입력</CardTitle>
            <CardDescription>
              매체와 타깃 키워드, 핵심 혜택은 필수입니다. 세부 제어는 고급 옵션에서
              설정하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <AdCopyForm
              value={form}
              onChange={patchForm}
              errors={errors}
              disabled={loading}
            />

            {apiError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                매체 {form.media.length}개 · 문구 {totalCount}건 생성 예정 ·{" "}
                <span className="font-medium text-foreground">
                  예상 차감 {cost.toLocaleString()}P
                </span>{" "}
                (보유 {balance.toLocaleString()}P)
              </p>
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="gap-1.5"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {loading ? "생성 중..." : "광고문구 생성"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. 생성 결과 */}
        {evaluated.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. 생성 결과</CardTitle>
              <CardDescription>
                글자수 배지와 경고를 확인한 뒤 사용할 문구를 선택해 복사하거나 CSV로
                내보내세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdCopyResults
                results={evaluated}
                activeMedia={activeMedia}
                onActiveMediaChange={setActiveMedia}
                selectedIds={selectedIds}
                onToggle={handleToggle}
                onToggleAll={handleToggleAll}
                onCopy={copyText}
                onCopySelected={handleCopySelected}
                onDownloadCsv={handleDownloadCsv}
                selectedCount={selectedCount}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
