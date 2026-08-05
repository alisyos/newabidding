"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User } from "@/types/user";

/** 1회 충전 상한 */
const MAX_CHARGE = 1_000_000;

/** 충전 모드에서 제공하는 금액 칩 */
const QUICK_AMOUNTS = [10_000, 50_000, 100_000];

export type BalanceEditMode = "charge" | "adjust";

interface BalanceEditDialogProps {
  user: User;
  currentBalance: number;
  mode: BalanceEditMode;
  /** amount: 충전이면 양수, 조정 차감이면 음수 */
  onSave: (amount: number, detail: string) => void;
  onClose: () => void;
}

/**
 * 사용자 잔액 충전/조정 모달.
 * 부모에서 key={`${mode}-${user.id}`} 로 렌더하므로 열 때마다 입력값이 초기화된다.
 */
export function BalanceEditDialog({
  user,
  currentBalance,
  mode,
  onSave,
  onClose,
}: BalanceEditDialogProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const isCharge = mode === "charge";
  const parsed = Number(draft.replace(/,/g, "").trim());
  const valid = draft.trim() !== "" && Number.isFinite(parsed) && parsed > 0;
  const preview = valid
    ? Math.max(0, currentBalance + (isCharge ? parsed : -parsed))
    : currentBalance;

  const submit = () => {
    if (!valid) {
      setError("0보다 큰 숫자를 입력해주세요.");
      return;
    }
    const amount = Math.floor(parsed);
    if (isCharge && amount > MAX_CHARGE) {
      setError(`한 번에 ${MAX_CHARGE.toLocaleString()}P까지 충전할 수 있습니다.`);
      return;
    }
    if (!isCharge && amount > currentBalance) {
      setError(
        `보유 잔액(${currentBalance.toLocaleString()}P)보다 많이 차감할 수 없습니다.`
      );
      return;
    }
    onSave(
      isCharge ? amount : -amount,
      isCharge ? "관리자 충전" : "관리자 조정 차감"
    );
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {user.name} · 포인트 {isCharge ? "충전" : "조정 차감"}
          </DialogTitle>
          <DialogDescription>
            {user.team} · 현재 보유 {currentBalance.toLocaleString()}P
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isCharge && (
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDraft(String(amount));
                    setError("");
                  }}
                >
                  +{amount.toLocaleString()}P
                </Button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="balance-amount">
              {isCharge ? "충전 금액" : "차감 금액"}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="balance-amount"
                inputMode="numeric"
                autoFocus
                placeholder="금액을 입력하세요"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
              <span className="text-sm text-muted-foreground">P</span>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            현재{" "}
            <span className="font-medium">
              {currentBalance.toLocaleString()}P
            </span>{" "}
            <span className="text-muted-foreground">→</span> 변경 후{" "}
            <span
              className={
                isCharge
                  ? "font-semibold text-emerald-600"
                  : "font-semibold text-destructive"
              }
            >
              {preview.toLocaleString()}P
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit} variant={isCharge ? "default" : "destructive"}>
            {isCharge ? "충전" : "차감"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
