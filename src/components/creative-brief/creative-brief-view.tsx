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
import { CreativeBriefForm } from "@/components/creative-brief/creative-brief-form";
import { CreativeBriefResults } from "@/components/creative-brief/creative-brief-results";
import { FinalPreview } from "@/components/creative-brief/final-preview";
import {
  buildCreativeBriefDoc,
  buildCreativeBriefText,
} from "@/lib/creative-brief-doc";
import {
  createDefaultBriefInput,
  createSelection,
} from "@/lib/creative-brief-spec";
import { downloadFile, safeFileName } from "@/lib/download-file";
import { userName } from "@/lib/users";
import {
  useAgentPrice,
  useCurrentBalance,
  useCurrentUserId,
  usePointsStore,
} from "@/store/points";
import type {
  BriefSelection,
  CreativeBriefInput,
  CreativeBriefResult,
} from "@/types/creative-brief";

/** 과금 대상 에이전트 (관리자 페이지의 단가와 연결) */
const CREATIVE_BRIEF_AGENT_ID = "creative-brief" as const;

/** 오늘 날짜 (YYYY.MM.DD) */
function todayString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/** 입력값 수동 검증 — 인라인 오류 메시지 맵 반환 */
function validateInput(input: CreativeBriefInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.advertiser.trim()) {
    errors.advertiser = "광고주명을 입력해주세요.";
  }
  if (!input.industry) {
    errors.industry = "업종을 선택해주세요.";
  }
  if (input.media.length === 0) {
    errors.media = "매체를 1개 이상 선택해주세요.";
  }
  if (!input.audienceDescription.trim()) {
    errors.audienceDescription =
      "오디언스를 입력해주세요. 타깃의 상황이 구체적일수록 카피 품질이 올라갑니다.";
  }
  if (input.toneAndManner.length === 0) {
    errors.toneAndManner = "톤앤매너를 1개 이상 선택해주세요.";
  }
  if (input.keyMessages.length === 0) {
    errors.keyMessages = "핵심 메시지를 1개 이상 입력해주세요.";
  }

  return errors;
}

/** 광고 소재 기획 컨테이너 — 상태·API 호출·포인트·편집·문서 다운로드를 모두 담당한다 */
export function CreativeBriefView() {
  const [form, setForm] = useState<CreativeBriefInput>(createDefaultBriefInput);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<CreativeBriefResult | null>(null);
  const [selection, setSelection] = useState<BriefSelection | null>(null);
  /**
   * 문서는 생성 시점의 입력값으로 만든다.
   * 결과를 본 뒤 폼을 수정해도 이미 만든 기획안의 브리프 요약이 흔들리지 않는다.
   */
  const [resultInput, setResultInput] = useState<CreativeBriefInput | null>(null);
  const [createdDate, setCreatedDate] = useState("");

  const balance = useCurrentBalance();
  const currentUserId = useCurrentUserId();
  const deduct = usePointsStore((s) => s.deduct);
  const unitPrice = useAgentPrice(CREATIVE_BRIEF_AGENT_ID);

  const loading = status === "loading";

  /** 실행 1회당 과금이므로 예상 차감액은 단가와 같다 */
  const cost = unitPrice;

  const totalCount = useMemo(() => {
    const { headlines, bodyCopies, concepts } = form.variantCount;
    return headlines + bodyCopies + concepts;
  }, [form.variantCount]);

  const patchForm = (patch: Partial<CreativeBriefInput>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const patchSelection = (patch: Partial<BriefSelection>) => {
    setSelection((prev) => (prev ? { ...prev, ...patch } : prev));
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
      const res = await fetch("/api/creative-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: form }),
      });
      const json = await res.json();

      if (!res.ok) {
        const message = json?.error?.message ?? "소재 기획안 생성에 실패했습니다.";
        setApiError(message);
        toast.error(message);
        setStatus("idle");
        return;
      }

      const nextResult: CreativeBriefResult = json.result;

      if (
        !deduct({
          userId: chargeUserId,
          agentId: CREATIVE_BRIEF_AGENT_ID,
          amount: cost,
          detail: `소재 기획안 1건 (${form.advertiser.trim() || "광고주 미입력"})`,
        })
      ) {
        toast.error("포인트가 부족합니다. 관리자 페이지에서 충전해주세요.");
        setStatus("idle");
        return;
      }

      setResult(nextResult);
      setSelection(createSelection(nextResult));
      setResultInput(form);
      setCreatedDate(todayString());
      setStatus("done");

      toast.success(
        `소재 기획안 생성 완료 · ${userName(chargeUserId)}님 계정에서 ${cost.toLocaleString()}P 차감되었습니다.`
      );
    } catch {
      const message = "네트워크 오류로 생성에 실패했습니다.";
      setApiError(message);
      toast.error(message);
      setStatus("idle");
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("복사했습니다.");
    } catch {
      toast.error("클립보드 복사에 실패했습니다.");
    }
  };

  const handleCopyAll = async () => {
    if (!resultInput || !selection) return;
    await copyText(
      buildCreativeBriefText(resultInput, selection, {
        title: `${resultInput.advertiser || "광고주"} 소재 기획안`,
        createdDate,
      })
    );
  };

  const handleDownload = () => {
    if (!resultInput || !result || !selection) return;

    const title = `${resultInput.advertiser || "광고주"} 소재 기획안`;
    const html = buildCreativeBriefDoc(resultInput, result, selection, {
      title,
      createdDate,
    });
    downloadFile(
      `creative_brief_${safeFileName(resultInput.advertiser || "brief")}_${createdDate.replace(/\./g, "")}.doc`,
      // 워드에서 한글이 깨지지 않도록 BOM 을 붙인다
      `﻿${html}`,
      "application/msword;charset=utf-8;"
    );
    toast.success("소재 기획안 문서를 내보냈습니다.");
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-muted/20">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">광고 소재 기획</h1>
          <p className="text-sm text-muted-foreground">
            광고주·업종·매체·타깃·캠페인 목적·톤앤매너를 입력하면{" "}
            <b>헤드라인·바디카피·콘셉트 방향</b> 초안을 자동 생성합니다. 선호하는
            안을 고르고 그 자리에서 수정한 뒤 최종 소재 기획안 문서로 내려받으세요.
          </p>
        </div>

        {/* 1. 소재 기획 정보 입력 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. 소재 기획 정보 입력</CardTitle>
            <CardDescription>
              광고주·업종·매체·오디언스·톤앤매너·핵심 메시지는 필수입니다. 과거
              기획안과 카피 가이드는 고급 옵션에서 참조로 넣을 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <CreativeBriefForm
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
                헤드라인 {form.variantCount.headlines}안 · 바디카피{" "}
                {form.variantCount.bodyCopies}안 · 콘셉트{" "}
                {form.variantCount.concepts}안 (총 {totalCount}안) ·{" "}
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
                {loading ? "생성 중..." : "소재 기획안 생성"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. 생성 결과 */}
        {result && selection && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. 생성 결과</CardTitle>
              <CardDescription>
                각 항목에서 선호하는 안을 선택하세요. 선택한 안은 그 자리에서
                수정할 수 있고, 수정 내용이 최종 문서에 반영됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreativeBriefResults
                result={result}
                selection={selection}
                onSelectionChange={patchSelection}
                onCopy={copyText}
                onRegenerate={handleGenerate}
                loading={loading}
              />
            </CardContent>
          </Card>
        )}

        {/* 3. 최종 소재 기획안 */}
        {resultInput && selection && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. 최종 소재 기획안</CardTitle>
              <CardDescription>
                선택·수정한 내용이 반영된 최종본입니다. 문서에는 선택하지 않은
                대안도 부록으로 함께 담깁니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FinalPreview
                input={resultInput}
                selection={selection}
                onMemoChange={(memo) => patchSelection({ memo })}
                onCopyAll={handleCopyAll}
                onDownload={handleDownload}
                createdDate={createdDate}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
