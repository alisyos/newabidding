"use client";

import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Coins, History, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMounted } from "@/hooks/use-mounted";
import { AGENTS } from "@/lib/agents";
import { SEED_LOG_COUNT } from "@/lib/point-seed";
import { USERS } from "@/lib/users";
import { cn } from "@/lib/utils";
import { balanceOf, usePointsStore } from "@/store/points";
import { UserBalanceTable } from "@/components/admin/user-balance-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PriceTable } from "@/components/admin/price-table";
import { UsageLogTable } from "@/components/admin/usage-log-table";

const TABS = [
  {
    key: "price",
    label: "차감 단가",
    icon: SlidersHorizontal,
    title: "기능별 차감 단가",
    description:
      "각 기능을 사용할 때 차감되는 포인트입니다. 모든 사용자에게 공통 적용되며, 수정하면 해당 기능 화면에 즉시 반영됩니다.",
  },
  {
    key: "balance",
    label: "잔액 관리",
    icon: Coins,
    title: "사용자별 포인트 잔액",
    description:
      "사용자별 보유 포인트를 충전하거나 조정합니다. 모든 변동은 사용 내역에 기록됩니다.",
  },
  {
    key: "logs",
    label: "사용 내역",
    icon: History,
    title: "포인트 사용 내역",
    description:
      "누가·언제·어떤 기능에서 얼마를 사용했는지 확인할 수 있습니다.",
  },
] as const;

type AdminTab = (typeof TABS)[number]["key"];

/** 관리자 화면 컨테이너 — 단가·잔액·사용 내역을 탭으로 나눠 관리한다 */
export function AdminView() {
  const balances = usePointsStore((s) => s.balances);
  const logCount = usePointsStore((s) => s.logs.length);
  const resetAll = usePointsStore((s) => s.resetAll);

  const [tab, setTab] = useState<AdminTab>("price");
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const mounted = useMounted();

  const totalBalance = useMemo(
    () => USERS.reduce((sum, u) => sum + balanceOf(balances, u.id), 0),
    [balances]
  );

  const active = TABS.find((t) => t.key === tab) ?? TABS[0];

  return (
    <div className="min-h-[calc(100vh-65px)] bg-muted/20">
      <div className="container mx-auto space-y-6 px-4 py-8">
        {/* 페이지 헤더 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">관리자 · 사용자/포인트 관리</h1>
          <p className="text-sm text-muted-foreground">
            기능별 <b>차감 단가</b>와 사용자별 보유 포인트를 확인하고 수정합니다.
            설정값은 이 브라우저에만 저장되며, 목업이므로 접근 권한 검사는 하지
            않습니다.
          </p>
        </div>

        {/* 요약 스트립 */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="text-muted-foreground">
              총 보유 포인트{" "}
              <b className="text-lg font-bold text-foreground">
                {mounted ? totalBalance.toLocaleString() : "—"}
              </b>{" "}
              P
            </span>
            <span className="text-muted-foreground">
              사용자 <b className="font-semibold text-foreground">{USERS.length}</b>
              명
            </span>
            <span className="text-muted-foreground">
              등록 기능{" "}
              <b className="font-semibold text-foreground">{AGENTS.length}</b>개
            </span>
            <span className="text-muted-foreground">
              사용 내역{" "}
              <b className="font-semibold text-foreground">
                {mounted ? logCount : "—"}
              </b>
              건
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => setConfirmResetAll(true)}
          >
            <RotateCcw className="h-4 w-4" />
            기본값으로 초기화
          </Button>
        </div>

        {/* 탭 */}
        <div className="inline-flex rounded-md border bg-background p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded px-4 py-1.5 text-sm font-medium transition-colors",
                  tab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 활성 탭 콘텐츠 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{active.title}</CardTitle>
            <CardDescription>{active.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {tab === "price" && <PriceTable />}
            {tab === "balance" && <UserBalanceTable />}
            {tab === "logs" && <UsageLogTable />}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmResetAll}
        title="모두 기본값으로 초기화할까요?"
        description={`차감 단가·사용자별 잔액·현재 사용자가 초기화되고, 샘플 사용 내역 ${SEED_LOG_COUNT}건이 다시 채워집니다. 되돌릴 수 없습니다.`}
        confirmLabel="전체 초기화"
        onClose={() => setConfirmResetAll(false)}
        onConfirm={() => {
          resetAll();
          setConfirmResetAll(false);
          toast.success("모든 설정을 기본값으로 되돌렸습니다.");
        }}
      />
    </div>
  );
}
