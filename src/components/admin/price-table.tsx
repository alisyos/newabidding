"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AGENTS } from "@/lib/agents";
import { defaultPriceOf, unitLabelOf } from "@/lib/point-pricing";
import { cn } from "@/lib/utils";
import { usePointsStore, useAgentPrice } from "@/store/points";
import type { Agent, AgentId } from "@/types/agent";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PriceEditDialog } from "@/components/admin/price-edit-dialog";

/** 단가 셀 — 에이전트 1개의 현재 단가를 구독한다 */
function PriceCell({ agent }: { agent: Agent }) {
  const price = useAgentPrice(agent.id);
  const basePrice = defaultPriceOf(agent.id);
  const changed = price !== basePrice;

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          "font-semibold",
          changed ? "text-amber-600" : "text-foreground"
        )}
      >
        {price.toLocaleString()}P
      </div>
      {changed && (
        <div className="text-[11px] text-muted-foreground">
          기본 {basePrice.toLocaleString()}P
        </div>
      )}
    </div>
  );
}

/** 기능별 차감 단가 조회·수정 테이블 */
export function PriceTable() {
  const prices = usePointsStore((s) => s.prices);
  const setPrice = usePointsStore((s) => s.setPrice);
  const resetPrices = usePointsStore((s) => s.resetPrices);

  const [editingId, setEditingId] = useState<AgentId | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const editing = AGENTS.find((a) => a.id === editingId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          총 <span className="font-semibold text-foreground">{AGENTS.length}</span>
          개 기능 · 기본값과 다른 단가는{" "}
          <span className="font-medium text-amber-600">주황색</span>으로 표시됩니다.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setConfirmReset(true)}
        >
          <RotateCcw className="h-4 w-4" />
          단가 전체 초기화
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 text-center">No.</TableHead>
              <TableHead>기능</TableHead>
              <TableHead className="w-24 text-center">상태</TableHead>
              <TableHead className="w-32 text-center">단위</TableHead>
              <TableHead className="w-32 text-right">차감 단가</TableHead>
              <TableHead className="w-24 text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {AGENTS.map((agent, idx) => {
              const { icon: Icon } = agent;
              const available = agent.status === "available";
              return (
                <TableRow key={agent.id}>
                  <TableCell className="text-center text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          available
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div
                          className={cn(
                            "font-medium",
                            !available && "text-muted-foreground"
                          )}
                        >
                          {agent.name}
                        </div>
                        <div className="line-clamp-1 text-xs text-muted-foreground">
                          {agent.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        available
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {available ? "이용 가능" : "준비중"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {unitLabelOf(agent.id)}
                    {!available && (
                      <div className="text-[11px]">(현재 미적용)</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <PriceCell agent={agent} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setEditingId(agent.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      수정
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        준비중 기능의 단가는 미리 설정해둘 수 있으나, 아직 차감이 발생하는 화면이
        없습니다.
      </p>

      {editing && (
        <PriceEditDialog
          key={editing.id}
          agent={editing}
          currentPrice={prices[editing.id] ?? defaultPriceOf(editing.id)}
          onClose={() => setEditingId(null)}
          onSave={(price) => {
            setPrice(editing.id, price);
            setEditingId(null);
            toast.success(
              `${editing.name} 단가를 ${price.toLocaleString()}P로 변경했습니다.`
            );
          }}
        />
      )}

      <ConfirmDialog
        open={confirmReset}
        title="단가를 전체 초기화할까요?"
        description="모든 기능의 차감 단가가 기본값으로 되돌아갑니다. 잔액과 사용 내역은 유지됩니다."
        confirmLabel="초기화"
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetPrices();
          setConfirmReset(false);
          toast.success("모든 단가를 기본값으로 되돌렸습니다.");
        }}
      />
    </div>
  );
}
