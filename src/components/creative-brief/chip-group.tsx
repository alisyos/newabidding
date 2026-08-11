"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChipOption {
  value: string;
  label: string;
  /** 카드 하단 보조 설명 (있으면 카드형, 없으면 칩형으로 렌더) */
  hint?: string;
}

interface ChipGroupProps {
  label: string;
  /** 라벨 옆 안내 문구 */
  description?: string;
  options: ChipOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** 최대 선택 개수 — 초과 선택 시 가장 먼저 고른 값을 밀어낸다 */
  max: number;
  required?: boolean;
  error?: string;
}

/**
 * 복수 선택 토글 그룹.
 * 선택 순서와 무관하게 options 의 표시 순서를 유지한다.
 */
export function ChipGroup({
  label,
  description,
  options,
  selected,
  onChange,
  max,
  required,
  error,
}: ChipGroupProps) {
  const order = options.map((o) => o.value);
  const sort = (values: string[]) => order.filter((v) => values.includes(v));

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(sort(selected.filter((v) => v !== value)));
      return;
    }
    // 상한에 걸리면 가장 먼저 선택한 값을 떨어뜨려 항상 토글이 반응하게 한다
    const kept = selected.length >= max ? selected.slice(1) : selected;
    onChange(sort([...kept, value]));
  };

  const isCard = options.some((o) => o.hint);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {selected.length} / {max}
        </span>
      </div>

      {isCard ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {options.map((o) => {
            const active = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-all",
                  active
                    ? "border-primary/50 bg-primary/5 shadow-sm"
                    : "hover:border-primary/30 hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{o.label}</span>
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    )}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </span>
                </div>
                {o.hint && (
                  <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                    {o.hint}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const active = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:border-primary/40 hover:bg-muted/40"
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
