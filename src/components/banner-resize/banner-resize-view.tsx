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
import { BannerCompareDialog } from "@/components/banner-resize/banner-compare-dialog";
import { BannerOptions } from "@/components/banner-resize/banner-options";
import { BannerResultGrid } from "@/components/banner-resize/banner-result-grid";
import { BannerUpload } from "@/components/banner-resize/banner-upload";
import { ModelSelectCards } from "@/components/banner-resize/model-select-cards";
import { RunSummaryDialog } from "@/components/banner-resize/run-summary-dialog";
import { SizeSelector } from "@/components/banner-resize/size-selector";
import { buildModelInput, buildWarnings, renderFinal } from "@/lib/banner-canvas";
import {
  BANNER_MODELS,
  DEFAULT_MODEL,
  MAX_SIZES,
  createDefaultOptions,
  createDefaultSizes,
  describeSize,
  planGeneration,
} from "@/lib/banner-resize-spec";
import { downloadDataUrl, safeFileName } from "@/lib/download-file";
import { userName } from "@/lib/users";
import {
  costForImages,
  useAgentPrice,
  useCurrentBalance,
  useCurrentUserId,
  usePointsStore,
} from "@/store/points";
import type {
  BannerModelKey,
  BannerResizeOptions,
  BannerResultItem,
  BannerSize,
  BannerSource,
} from "@/types/banner-resize";
import type { UserId } from "@/types/user";

/** 과금 대상 에이전트 (관리자 페이지의 단가와 연결) */
const BANNER_AGENT_ID = "banner-resize" as const;

/** 동시 호출 수 — 이미지 API 는 rate limit 이 빡빡해 2개씩만 굴린다 */
const CONCURRENCY = 2;

/** 여러 파일을 연달아 내려받을 때 브라우저가 묶어서 막지 않도록 두는 간격 */
const DOWNLOAD_GAP_MS = 250;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 입력값 수동 검증 — 인라인 오류 메시지 맵 반환 */
function validateInput(
  source: BannerSource | null,
  sizes: BannerSize[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!source) errors.source = "원본 배너 이미지를 업로드해주세요.";
  if (sizes.length === 0) errors.sizes = "출력 규격을 1개 이상 선택해주세요.";
  if (sizes.length > MAX_SIZES) {
    errors.sizes = `규격은 한 번에 최대 ${MAX_SIZES}개까지 생성할 수 있습니다.`;
  }
  return errors;
}

/** limit 개씩 병렬로 돌리는 간단한 작업 큐 */
async function runWithLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (cursor < tasks.length) {
      const index = cursor++;
      await tasks[index]();
    }
  });
  await Promise.all(workers);
}

/** AI 배너 리사이징 컨테이너 — 상태·API 호출·포인트·다운로드를 모두 담당한다 */
export function BannerResizeView() {
  const [source, setSource] = useState<BannerSource | null>(null);
  const [model, setModel] = useState<BannerModelKey>(DEFAULT_MODEL);
  const [sizes, setSizes] = useState<BannerSize[]>(createDefaultSizes);
  const [options, setOptions] = useState<BannerResizeOptions>(createDefaultOptions);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const [results, setResults] = useState<BannerResultItem[]>([]);
  /**
   * 결과는 생성 시점의 원본으로 만든다.
   * 결과를 본 뒤 원본을 교체해도 이미 만든 배너의 비교·재합성 기준이 흔들리지 않는다.
   */
  const [resultSource, setResultSource] = useState<BannerSource | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [compareItem, setCompareItem] = useState<BannerResultItem | null>(null);

  const balance = useCurrentBalance();
  const currentUserId = useCurrentUserId();
  const deduct = usePointsStore((s) => s.deduct);
  const unitPrice = useAgentPrice(BANNER_AGENT_ID);

  /** 이미지 1건당 과금 — 예상 차감액은 선택 규격 수 × 단가 */
  const cost = useMemo(
    () => costForImages(sizes.length, unitPrice),
    [sizes.length, unitPrice]
  );

  const patchOptions = (patch: Partial<BannerResizeOptions>) => {
    setOptions((prev) => ({ ...prev, ...patch }));
  };

  const markBusy = (id: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  /**
   * 규격 1건 생성.
   * 캔버스 합성 → API 호출 → 목표 픽셀 크기로 최종 렌더까지 한 번에 처리한다.
   */
  const generateOne = async (
    size: BannerSize,
    useModel: BannerModelKey,
    src: BannerSource,
    opts: BannerResizeOptions
  ): Promise<BannerResultItem> => {
    const base: BannerResultItem = {
      id: size.id,
      size,
      model: useModel,
      status: "error",
      warnings: [],
    };

    try {
      const plan = planGeneration(useModel, size);
      const sourceDataUrl = await buildModelInput(src);

      const res = await fetch("/api/banner-resize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: useModel,
          size,
          plan,
          sourceDataUrl,
          options: opts,
          sourceMeta: {
            width: src.width,
            height: src.height,
            hasAlpha: src.hasAlpha,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        return {
          ...base,
          errorMessage:
            json?.error?.message ?? "AI 모델 처리 중 오류가 발생했습니다.",
        };
      }

      const rendered = await renderFinal({
        generatedDataUrl: json.image.dataUrl,
        size,
      });

      return {
        ...base,
        status: "done",
        imageDataUrl: rendered.dataUrl,
        generatedWidth: rendered.generatedWidth,
        generatedHeight: rendered.generatedHeight,
        warnings: buildWarnings({
          plan,
          size,
          preserveText: opts.preserveText,
          generatedWidth: rendered.generatedWidth,
          generatedHeight: rendered.generatedHeight,
          bandShifted: rendered.bandShifted,
          notes: Array.isArray(json.notes) ? json.notes : [],
        }),
      };
    } catch (e) {
      return {
        ...base,
        errorMessage:
          e instanceof Error
            ? e.message
            : "네트워크 오류로 생성에 실패했습니다.",
      };
    }
  };

  /** 성공 건수만큼만 차감한다 (실패한 규격은 과금하지 않는다) */
  const chargeFor = (items: BannerResultItem[], chargeUserId: UserId) => {
    const done = items.filter((i) => i.status === "done");
    if (done.length === 0) return;

    const amount = costForImages(done.length, unitPrice);
    const head = describeSize(done[0].size);
    const detail =
      done.length === 1 ? `배너 ${head}` : `배너 ${done.length}건 (${head} 외)`;

    if (deduct({ userId: chargeUserId, agentId: BANNER_AGENT_ID, amount, detail })) {
      toast.success(
        `배너 ${done.length}건 생성 완료 · ${userName(chargeUserId)}님 계정에서 ${amount.toLocaleString()}P 차감되었습니다.`
      );
    } else {
      toast.error(
        "포인트가 부족해 차감하지 못했습니다. 관리자 페이지에서 충전해주세요."
      );
    }
  };

  const handleStart = () => {
    const v = validateInput(source, sizes);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      toast.error("입력값을 확인해주세요.");
      return;
    }
    if (balance < cost) {
      toast.error(
        `포인트가 부족합니다. (필요 ${cost.toLocaleString()}P · 보유 ${balance.toLocaleString()}P)`
      );
      return;
    }
    setSummaryOpen(true);
  };

  const handleGenerate = async () => {
    if (!source) return;

    // 생성을 시작한 시점의 사용자에게 과금한다.
    // await 사이에 헤더에서 사용자를 바꿔도 과금 대상이 흔들리지 않는다.
    const chargeUserId = currentUserId;
    const runSource = source;
    const runOptions = options;
    const runModel = model;
    const runSizes = sizes;

    setSummaryOpen(false);
    setRunning(true);
    setApiError(null);
    setSelectedIds(new Set());
    setResultSource(runSource);
    setResults(
      runSizes.map((size) => ({
        id: size.id,
        size,
        model: runModel,
        status: "pending",
        warnings: [],
      }))
    );

    const finished: BannerResultItem[] = [];
    await runWithLimit(
      runSizes.map((size) => async () => {
        const item = await generateOne(size, runModel, runSource, runOptions);
        finished.push(item);
        // 완료되는 대로 화면에 반영한다 (규격당 20~60초가 걸린다)
        setResults((prev) => prev.map((r) => (r.id === item.id ? item : r)));
      }),
      CONCURRENCY
    );

    setRunning(false);

    const done = finished.filter((i) => i.status === "done");
    if (done.length === 0) {
      const message =
        finished[0]?.errorMessage ?? "배너 생성에 실패했습니다.";
      setApiError(`${message} (포인트는 차감되지 않았습니다)`);
      toast.error(message);
      return;
    }

    setSelectedIds(new Set(done.map((i) => i.id)));
    chargeFor(finished, chargeUserId);
  };

  const handleRegenerate = async (
    item: BannerResultItem,
    useModel: BannerModelKey
  ) => {
    const src = resultSource;
    if (!src) return;

    const chargeUserId = currentUserId;
    if (balance < unitPrice) {
      toast.error(
        `포인트가 부족합니다. (필요 ${unitPrice.toLocaleString()}P · 보유 ${balance.toLocaleString()}P)`
      );
      return;
    }

    markBusy(item.id, true);
    setResults((prev) =>
      prev.map((r) =>
        r.id === item.id
          ? { ...r, status: "pending", model: useModel, warnings: [] }
          : r
      )
    );

    const next = await generateOne(item.size, useModel, src, options);
    setResults((prev) => prev.map((r) => (r.id === next.id ? next : r)));
    markBusy(item.id, false);

    if (next.status === "done") {
      chargeFor([next], chargeUserId);
    } else {
      toast.error(next.errorMessage ?? "재생성에 실패했습니다.");
    }
  };

  const fileNameFor = (item: BannerResultItem) => {
    const base = safeFileName(
      resultSource?.fileName.replace(/\.[^.]+$/, "") || "banner"
    );
    return `${base}_${item.size.width}x${item.size.height}.png`;
  };

  const downloadOne = (item: BannerResultItem) => {
    if (!item.imageDataUrl) return;
    downloadDataUrl(fileNameFor(item), item.imageDataUrl);
  };

  /** ZIP 대신 순차 다운로드 — 새 의존성 없이 기획서의 "전체 다운로드"를 만족시킨다 */
  const downloadMany = async (items: BannerResultItem[]) => {
    const targets = items.filter((i) => i.status === "done" && i.imageDataUrl);
    if (targets.length === 0) return;
    for (const item of targets) {
      downloadOne(item);
      await sleep(DOWNLOAD_GAP_MS);
    }
    toast.success(`${targets.length}개 이미지를 내려받았습니다.`);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const anyBusy = running || busyIds.size > 0;

  return (
    <div className="min-h-[calc(100vh-65px)] bg-muted/20">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">AI 배너 리사이징</h1>
          <p className="text-sm text-muted-foreground">
            원본 배너 하나로 <b>다양한 광고 사이즈를 자동 생성</b>합니다. 단순
            늘리기가 아니라, 원본의 상품·로고·문구는 그대로 두고 부족한 배경만 AI가
            채워 규격에 맞게 재구성합니다.
          </p>
        </div>

        {/* 1. 원본 배너 업로드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. 원본 배너 업로드</CardTitle>
            <CardDescription>
              JPG · PNG · WEBP 파일을 올리면 해상도·용량·비율·투명 배경 여부를 자동으로
              확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BannerUpload
              value={source}
              onChange={(next) => {
                setSource(next);
                setErrors((prev) => ({ ...prev, source: "" }));
              }}
              disabled={anyBusy}
              error={errors.source}
            />
          </CardContent>
        </Card>

        {/* 2. AI 모델 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. AI 모델 선택</CardTitle>
            <CardDescription>
              작업에 사용할 이미지 생성 모델을 고르세요. 결과가 마음에 들지 않으면
              생성 후 다른 모델로 다시 만들 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModelSelectCards
              value={model}
              onChange={setModel}
              disabled={anyBusy}
            />
          </CardContent>
        </Card>

        {/* 3. 출력 사이즈 선택 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. 출력 사이즈 선택</CardTitle>
            <CardDescription>
              매체별 프리셋에서 고르거나 직접 입력해 추가하세요. 한 번에 최대{" "}
              {MAX_SIZES}개까지 생성합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SizeSelector
              model={model}
              value={sizes}
              onChange={(next) => {
                setSizes(next);
                setErrors((prev) => ({ ...prev, sizes: "" }));
              }}
              disabled={anyBusy}
              error={errors.sizes}
            />
          </CardContent>
        </Card>

        {/* 4. 상세 옵션 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4. 상세 옵션</CardTitle>
            <CardDescription>
              기본값 그대로 두면 원본 요소를 최대한 보존하고 배경만 확장합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <BannerOptions
              value={options}
              onChange={patchOptions}
              disabled={anyBusy}
            />

            {apiError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {BANNER_MODELS[model].subLabel} · {sizes.length}개 규격 ·{" "}
                <span className="font-medium text-foreground">
                  예상 차감 {cost.toLocaleString()}P
                </span>{" "}
                (보유 {balance.toLocaleString()}P)
              </p>
              <Button onClick={handleStart} disabled={anyBusy} className="gap-1.5">
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {running ? "생성 중..." : "AI 리사이징 시작"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 5. 생성 결과 */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5. 생성 결과</CardTitle>
              <CardDescription>
                규격별로 확인하고, 마음에 들지 않는 이미지만 재생성하거나 다른
                모델로 다시 만들 수 있습니다. 재생성은 1건당 포인트가 추가로
                차감됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BannerResultGrid
                items={results}
                selectedIds={selectedIds}
                busyIds={busyIds}
                onToggle={toggleSelect}
                onToggleAll={(checked) =>
                  setSelectedIds(
                    checked
                      ? new Set(
                          results
                            .filter((i) => i.status === "done")
                            .map((i) => i.id)
                        )
                      : new Set()
                  )
                }
                onCompare={setCompareItem}
                onRegenerate={(item, useModel) => {
                  void handleRegenerate(item, useModel);
                }}
                onDownload={downloadOne}
                onDownloadSelected={() => {
                  void downloadMany(
                    results.filter((i) => selectedIds.has(i.id))
                  );
                }}
                onDownloadAll={() => {
                  void downloadMany(results);
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <RunSummaryDialog
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        model={model}
        sizes={sizes}
        cost={cost}
        balance={balance}
        loading={running}
        onConfirm={() => {
          void handleGenerate();
        }}
      />

      <BannerCompareDialog
        item={compareItem}
        source={resultSource}
        onClose={() => setCompareItem(null)}
      />
    </div>
  );
}
