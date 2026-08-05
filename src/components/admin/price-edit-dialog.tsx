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
import { MAX_PRICE, defaultPriceOf, unitLabelOf } from "@/lib/point-pricing";
import type { Agent } from "@/types/agent";

interface PriceEditDialogProps {
  agent: Agent;
  currentPrice: number;
  onSave: (price: number) => void;
  onClose: () => void;
}

/**
 * 단가 수정 모달.
 * 부모에서 key={agent.id} 로 렌더하므로 열릴 때마다 입력값이 초기화된다.
 */
export function PriceEditDialog({
  agent,
  currentPrice,
  onSave,
  onClose,
}: PriceEditDialogProps) {
  const [draft, setDraft] = useState(String(currentPrice));
  const [error, setError] = useState("");

  const basePrice = defaultPriceOf(agent.id);

  const submit = () => {
    const value = Number(draft.replace(/,/g, "").trim());
    if (draft.trim() === "" || !Number.isFinite(value) || value < 0) {
      setError("0 이상의 숫자를 입력해주세요.");
      return;
    }
    if (value > MAX_PRICE) {
      setError(`최대 ${MAX_PRICE.toLocaleString()}P까지 설정할 수 있습니다.`);
      return;
    }
    onSave(Math.floor(value));
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{agent.name} 단가 수정</DialogTitle>
          <DialogDescription>
            {unitLabelOf(agent.id)} 차감되는 포인트입니다. (기본값{" "}
            {basePrice.toLocaleString()}P)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="price">차감 단가</Label>
          <div className="flex items-center gap-2">
            <Input
              id="price"
              inputMode="numeric"
              autoFocus
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
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              0으로 설정하면 무료로 사용할 수 있습니다.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setDraft(String(basePrice));
              setError("");
            }}
          >
            기본값
          </Button>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
