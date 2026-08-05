"use client";

import { useRef, useState, type ReactNode } from "react";
import { toast } from "react-toastify";
import { FolderClock, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { generateResults, generateSampleSets } from "@/lib/keyword-mock";
import { buildCsv, downloadCsv } from "@/lib/keyword-csv";
import {
  usePointsStore,
  useAgentPrice,
  useCurrentBalance,
  useCurrentUserId,
  costForKeywords,
} from "@/store/points";
import type { AgentId } from "@/types/agent";
import type { Channel, CollectionSet, RegisteredKeyword } from "@/types/keyword";
import { IndividualForm } from "@/components/keyword-expansion/individual-form";
import { BulkUpload } from "@/components/keyword-expansion/bulk-upload";
import { RegisteredList } from "@/components/keyword-expansion/registered-list";
import { SetList } from "@/components/keyword-expansion/set-list";
import { SetDetail } from "@/components/keyword-expansion/set-detail";

const MAX_INDIVIDUAL = 50;
const MAX_BULK = 1000;

function todayString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/** 다운로드 파일명용: 파일시스템 예약문자 제거 + 공백을 밑줄로 (한글은 유지) */
function safeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_|_$/g, "");
}

interface ExpansionViewProps {
  /** 과금 대상 에이전트 — 차감 단가 조회와 사용 내역 기록에 사용 */
  agentId: AgentId;
  /** 페이지 제목 겸 CSV 1행 제목 */
  title: string;
  description: ReactNode;
  channels: Channel[];
  /** 다운로드 파일명 접두사 */
  filePrefix: string;
}

export function ExpansionView({
  agentId,
  title,
  description,
  channels,
  filePrefix,
}: ExpansionViewProps) {
  const [mode, setMode] = useState<"individual" | "bulk">("individual");
  const [staged, setStaged] = useState<RegisteredKeyword[]>([]);
  const [sets, setSets] = useState<CollectionSet[]>(() =>
    generateSampleSets(channels)
  );
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

  // 순번/ID 카운터는 페이지 인스턴스마다 독립적으로 유지한다.
  const idSeq = useRef(0);
  const setSeq = useRef(sets.length);
  const nextId = () => `kw-${++idSeq.current}`;
  const nextSetSeq = () => ++setSeq.current;

  const deduct = usePointsStore((s) => s.deduct);
  const balance = useCurrentBalance();
  const currentUserId = useCurrentUserId();
  const unitPrice = useAgentPrice(agentId);

  const addOne = (keyword: string, targetRank: number) => {
    setStaged((prev) =>
      prev.length >= MAX_INDIVIDUAL
        ? prev
        : [...prev, { id: nextId(), keyword, targetRank }]
    );
  };

  const addMany = (items: { keyword: string; targetRank: number }[]) => {
    let added = 0;
    setStaged((prev) => {
      const room = MAX_BULK - prev.length;
      const slice = items.slice(0, Math.max(0, room));
      added = slice.length;
      return [...prev, ...slice.map((it) => ({ id: nextId(), ...it }))];
    });
    return added;
  };

  const removeStaged = (id: string) =>
    setStaged((prev) => prev.filter((k) => k.id !== id));
  const clearStaged = () => setStaged([]);

  /** 대기 목록을 하나의 항목으로 등록 (포인트 차감 + 결과 mock 생성) */
  const registerSet = () => {
    if (staged.length === 0) return;

    const cost = costForKeywords(staged.length, unitPrice);
    if (
      !deduct({
        userId: currentUserId,
        agentId,
        amount: cost,
        detail: `키워드 ${staged.length}건`,
      })
    ) {
      toast.error(
        `포인트가 부족합니다. (필요 ${cost.toLocaleString()}P · 보유 ${balance.toLocaleString()}P) 관리자 페이지에서 충전해주세요.`
      );
      return;
    }

    const keywords = staged;
    const seq = nextSetSeq();
    const newSet: CollectionSet = {
      id: `set-${seq}`,
      seq,
      name: `no_${seq}`,
      createdAt: todayString(),
      keywords,
      results: generateResults(keywords, channels),
    };
    setSets((prev) => [newSet, ...prev]);
    setStaged([]);
    setSelectedSetId(newSet.id);
    toast.success(
      `${keywords.length}개 키워드 수집 등록 완료 · ${cost.toLocaleString()}P 차감되었습니다.`
    );
  };

  const selectSet = (id: string) => {
    setSelectedSetId(id);
  };

  const removeSet = (id: string) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
    if (selectedSetId === id) setSelectedSetId(null);
  };

  const clearSets = () => {
    setSets([]);
    setSelectedSetId(null);
  };

  const downloadSet = (set: CollectionSet) => {
    downloadCsv(
      `${filePrefix}_${safeFileName(set.name)}.csv`,
      buildCsv(set.results, set.createdAt, { title, channels })
    );
  };

  const selectedSet = sets.find((s) => s.id === selectedSetId) ?? null;

  return (
    <div className="min-h-[calc(100vh-65px)] bg-muted/20">
      <div className="container mx-auto space-y-6 px-4 py-8">
        {/* 페이지 헤더 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {channels.map((c) => (
              <span
                key={c.key}
                className="rounded-full border bg-background px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {c.fullName}
              </span>
            ))}
          </div>
        </div>

        {/* ① 키워드 등록 (등록 + 대기 목록 통합) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. 키워드 등록</CardTitle>
            <CardDescription>
              개별 등록(최대 {MAX_INDIVIDUAL}개) 또는 대량 등록(최대{" "}
              {MAX_BULK.toLocaleString()}개)으로 키워드를 추가하면 아래에 등록
              대기 목록이 나타납니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 탭 */}
            <div className="space-y-5">
              <div className="inline-flex rounded-md border p-1">
                {(
                  [
                    { key: "individual", label: "개별 등록" },
                    { key: "bulk", label: "대량 등록" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setMode(t.key)}
                    className={cn(
                      "rounded px-4 py-1.5 text-sm font-medium transition-colors",
                      mode === t.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {mode === "individual" ? (
                <IndividualForm
                  count={staged.length}
                  max={MAX_INDIVIDUAL}
                  onAdd={addOne}
                />
              ) : (
                <BulkUpload
                  count={staged.length}
                  max={MAX_BULK}
                  onAddMany={addMany}
                />
              )}
            </div>

            {/* 구분선 + 등록 대기 목록 (키워드가 있을 때만 노출) */}
            {staged.length > 0 && (
              <div className="animate-fade-slide-down space-y-3 border-t pt-6">
                <h3 className="text-sm font-semibold">등록 대기 목록</h3>
                <RegisteredList
                  items={staged}
                  unitPrice={unitPrice}
                  onRemove={removeStaged}
                  onClear={clearStaged}
                  onRegister={registerSet}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ② 수집 등록 리스트 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderClock className="h-5 w-5" />
              2. 수집 등록 리스트
            </CardTitle>
            <CardDescription>
              등록된 항목 단위로 결과를 확인하고 엑셀로 다운로드하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SetList
              sets={sets}
              selectedSetId={selectedSetId}
              onSelect={selectSet}
              onDownload={downloadSet}
              onRemove={removeSet}
              onClearAll={clearSets}
            />
          </CardContent>
        </Card>

        {/* ③ 선택 항목 상세 */}
        {selectedSet && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5" />
                3. 수집 결과
              </CardTitle>
              <CardDescription>
                선택한 항목의 전체 키워드 수집 결과입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SetDetail
                set={selectedSet}
                channels={channels}
                onDownload={downloadSet}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
