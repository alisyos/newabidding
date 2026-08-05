"use client";

import { Check } from "lucide-react";
import { AD_MEDIA_KEYS, MEDIA_SPECS } from "@/lib/ad-copy-spec";
import { cn } from "@/lib/utils";
import type { AdMediaKey } from "@/types/ad-copy";

interface MediaSelectProps {
  selected: AdMediaKey[];
  onChange: (media: AdMediaKey[]) => void;
  /** 선택한 업종을 등록할 수 없는 매체 (선택 시 경고 표시) */
  blocked?: AdMediaKey[];
  error?: string;
}

/** 대상 매체 복수 선택 — 매체별 소재 규격을 카드에 함께 노출한다 */
export function MediaSelect({
  selected,
  onChange,
  blocked = [],
  error,
}: MediaSelectProps) {
  const toggle = (key: AdMediaKey) => {
    onChange(
      selected.includes(key)
        ? selected.filter((k) => k !== key)
        : [...AD_MEDIA_KEYS.filter((k) => selected.includes(k) || k === key)]
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          대상 매체<span className="ml-0.5 text-destructive">*</span>
        </span>
        <span className="text-xs text-muted-foreground">
          여러 매체를 선택하면 매체 규격에 맞춰 동시에 생성합니다.
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {AD_MEDIA_KEYS.map((key) => {
          const spec = MEDIA_SPECS[key];
          const active = selected.includes(key);
          const isBlocked = blocked.includes(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                active
                  ? "border-primary/50 bg-primary/5 shadow-sm"
                  : "hover:border-primary/30 hover:bg-muted/40",
                isBlocked && active && "border-destructive/50 bg-destructive/5"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{spec.shortName}</span>
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  )}
                >
                  {active && <Check className="h-3 w-3" />}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {spec.productName}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                제목 {spec.fields.title.koEffective}자 · 설명{" "}
                {spec.fields.description.koEffective}자
                {spec.counter === "GOOGLE_CJK_2" && " (한글 기준)"}
              </p>
              {isBlocked && active && (
                <p className="mt-1.5 text-[11px] font-medium text-destructive">
                  선택한 업종은 등록할 수 없는 매체입니다.
                </p>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
