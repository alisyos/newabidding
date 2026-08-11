"use client";

// URL 하나를 받아 수집을 시작하는 폼 — 블로그·인스타 댓글 수집 공용.
//
// 수집 중에도 입력값을 숨기지 않고 fieldset 으로 잠근다.
// (도너는 폼을 통째로 감췄는데, 무엇을 수집 중인지 확인할 수 없어 불편했다)

import { Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UrlCollectFormProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** 수집 중단 — 진행 중일 때만 노출 */
  onCancel: () => void;
  error?: string;
  /** 수집이 진행 중인지 */
  busy: boolean;
  /** 입력 형식 예시 */
  examples: string[];
  /** 1회 실행 차감 포인트 */
  unitPrice: number;
  /** 현재 사용자 보유 포인트 */
  balance: number;
  submitLabel?: string;
}

export function UrlCollectForm({
  id,
  label,
  placeholder,
  value,
  onChange,
  onSubmit,
  onCancel,
  error,
  busy,
  examples,
  unitPrice,
  balance,
  submitLabel = "댓글 수집 시작",
}: UrlCollectFormProps) {
  return (
    <div className="space-y-5">
      <fieldset disabled={busy} className="space-y-2">
        <Label htmlFor={id}>
          {label}
          <span className="ml-1 text-destructive">*</span>
        </Label>
        <Input
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // 입력창에서 Enter 로 바로 시작할 수 있게 한다
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          aria-invalid={!!error}
        />
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="text-xs text-muted-foreground">
            <p className="mb-1">입력 예시</p>
            <ul className="list-inside list-disc space-y-0.5">
              {examples.map((example) => (
                <li key={example} className="font-mono">
                  {example}
                </li>
              ))}
            </ul>
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            예상 차감 {unitPrice.toLocaleString()}P
          </span>{" "}
          (실행 1회당 · 보유 {balance.toLocaleString()}P)
        </p>
        <div className="flex items-center gap-2">
          {busy && (
            <Button variant="outline" onClick={onCancel} className="gap-1.5">
              <Square className="h-3.5 w-3.5" />
              중단
            </Button>
          )}
          <Button onClick={onSubmit} disabled={busy} className="gap-1.5">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "수집 중..." : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
