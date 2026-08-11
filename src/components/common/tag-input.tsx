"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TagInputProps {
  id: string;
  label: string;
  /** 라벨 옆 안내 문구 */
  hint?: string;
  placeholder?: string;
  values: string[];
  onChange: (values: string[]) => void;
  /** 최대 등록 개수 */
  max?: number;
  /** 필수 항목 표시(*) */
  required?: boolean;
  /** 인라인 검증 오류 */
  error?: string;
}

/** 쉼표/Enter 로 여러 값을 등록하는 text[] 공용 입력 */
export function TagInput({
  id,
  label,
  hint,
  placeholder,
  values,
  onChange,
  max = 10,
  required,
  error,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const isFull = values.length >= max;

  const add = () => {
    // 쉼표로 여러 개를 한 번에 붙여넣는 경우도 처리한다
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    const next = [...values];
    for (const p of parts) {
      if (next.length >= max) break;
      if (!next.includes(p)) next.push(p);
    }
    onChange(next);
    setDraft("");
  };

  const remove = (target: string) => {
    onChange(values.filter((v) => v !== target));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {hint && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
        <span
          className={cn(
            "ml-auto text-xs",
            isFull ? "font-medium text-destructive" : "text-muted-foreground"
          )}
        >
          {values.length} / {max}
        </span>
      </div>

      <div className="flex gap-2">
        <Input
          id={id}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isFull}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={isFull}
          className="shrink-0 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          추가
        </Button>
      </div>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs"
            >
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                className="text-muted-foreground transition-colors hover:text-destructive"
                aria-label={`${v} 삭제`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
