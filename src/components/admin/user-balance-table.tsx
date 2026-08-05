"use client";

import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Minus, Plus, RotateCcw, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { USERS, userOf } from "@/lib/users";
import { cn } from "@/lib/utils";
import { balanceOf, usePointsStore, MAX_LOGS_PER_USER } from "@/store/points";
import { USER_IDS, type UserId } from "@/types/user";
import {
  BalanceEditDialog,
  type BalanceEditMode,
} from "@/components/admin/balance-edit-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

interface UserStat {
  used: number;
  charged: number;
  count: number;
}

/** 사용자별 잔액 조회 · 충전 · 조정 테이블 */
export function UserBalanceTable() {
  const balances = usePointsStore((s) => s.balances);
  const logs = usePointsStore((s) => s.logs);
  const currentUserId = usePointsStore((s) => s.currentUserId);
  const setCurrentUser = usePointsStore((s) => s.setCurrentUser);
  const addBalance = usePointsStore((s) => s.addBalance);
  const resetBalances = usePointsStore((s) => s.resetBalances);

  const [editing, setEditing] = useState<{
    userId: UserId;
    mode: BalanceEditMode;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  /** 사용/충전 합계를 로그 1패스로 집계 */
  const stats = useMemo(() => {
    const acc = Object.fromEntries(
      USER_IDS.map((id) => [id, { used: 0, charged: 0, count: 0 }])
    ) as Record<UserId, UserStat>;

    for (const log of logs) {
      const stat = acc[log.userId];
      if (!stat) continue; // 알 수 없는 userId(옛 저장본)는 집계에서 제외
      if (log.amount < 0) stat.used += -log.amount;
      else stat.charged += log.amount;
      stat.count += 1;
    }
    return acc;
  }, [logs]);

  const editingUser = editing ? userOf(editing.userId) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          총 <span className="font-semibold text-foreground">{USERS.length}</span>
          명 · 합계{" "}
          <span className="font-semibold text-foreground">
            {USERS.reduce(
              (sum, u) => sum + balanceOf(balances, u.id),
              0
            ).toLocaleString()}
            P
          </span>
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setConfirmReset(true)}
        >
          <RotateCcw className="h-4 w-4" />
          전체 잔액 초기화
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 text-center">No.</TableHead>
              <TableHead>사용자</TableHead>
              <TableHead className="w-32">소속</TableHead>
              <TableHead className="w-24 text-center">권한</TableHead>
              <TableHead className="w-32 text-right">잔액</TableHead>
              <TableHead className="w-32 text-right">총 사용</TableHead>
              <TableHead className="w-32 text-right">총 충전</TableHead>
              <TableHead className="w-52 text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {USERS.map((user, idx) => {
              const balance = balanceOf(balances, user.id);
              const stat = stats[user.id];
              const isCurrent = user.id === currentUserId;
              return (
                <TableRow
                  key={user.id}
                  className={cn(isCurrent && "bg-primary/5 hover:bg-primary/5")}
                >
                  <TableCell className="text-center text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {user.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-medium">
                          {user.name}
                          {isCurrent && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              현재
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.team}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        user.role === "admin"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {user.role === "admin" ? "관리자" : "일반"}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold",
                      balance === 0 && "text-destructive"
                    )}
                  >
                    {balance.toLocaleString()}P
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {stat.used.toLocaleString()}P
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {stat.charged.toLocaleString()}P
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        disabled={isCurrent}
                        onClick={() => {
                          setCurrentUser(user.id);
                          toast.success(`${user.name}님으로 전환했습니다.`);
                        }}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        전환
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() =>
                          setEditing({ userId: user.id, mode: "charge" })
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                        충전
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() =>
                          setEditing({ userId: user.id, mode: "adjust" })
                        }
                      >
                        <Minus className="h-3.5 w-3.5" />
                        조정
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        총 사용·총 충전은 보관 중인 사용 내역(사용자당 최근 {MAX_LOGS_PER_USER}건)
        기준으로 집계한 값입니다.
      </p>

      {editing && editingUser && (
        <BalanceEditDialog
          key={`${editing.mode}-${editing.userId}`}
          user={editingUser}
          currentBalance={balanceOf(balances, editing.userId)}
          mode={editing.mode}
          onClose={() => setEditing(null)}
          onSave={(amount, detail) => {
            addBalance({ userId: editing.userId, amount, detail });
            setEditing(null);
            toast.success(
              `${editingUser.name}님 계정에 ${Math.abs(amount).toLocaleString()}P를 ${
                amount >= 0 ? "충전" : "차감"
              }했습니다.`
            );
          }}
        />
      )}

      <ConfirmDialog
        open={confirmReset}
        title="전체 잔액을 초기화할까요?"
        description="모든 사용자의 보유 포인트가 샘플 기본값으로 되돌아갑니다. 단가와 사용 내역은 유지됩니다."
        confirmLabel="초기화"
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetBalances();
          setConfirmReset(false);
          toast.success("전체 잔액을 초기화했습니다.");
        }}
      />
    </div>
  );
}
