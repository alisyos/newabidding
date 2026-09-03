"use client";

import { Check, Sparkles, Zap } from "lucide-react";

import { BANNER_MODELS, BANNER_MODEL_KEYS } from "@/lib/banner-resize-spec";
import { cn } from "@/lib/utils";
import type { BannerModelKey } from "@/types/banner-resize";

interface ModelSelectCardsProps {
  value: BannerModelKey;
  onChange: (model: BannerModelKey) => void;
  disabled?: boolean;
  /** 라디오 그룹 이름 — 재생성 다이얼로그와 겹치지 않게 분리한다 */
  groupName?: string;
}

const ICONS: Record<BannerModelKey, typeof Zap> = {
  "nano-banana-2": Zap,
  "gpt-image-2": Sparkles,
};

/** 기획서 5.1 — 카드형 모델 선택 */
export function ModelSelectCards({
  value,
  onChange,
  disabled,
  groupName = "banner-model",
}: ModelSelectCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {BANNER_MODEL_KEYS.map((key) => {
        const spec = BANNER_MODELS[key];
        const Icon = ICONS[key];
        const selected = value === key;
        const id = `${groupName}-${key}`;

        return (
          <label
            key={key}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-all",
              selected
                ? "border-primary/50 bg-primary/5 shadow-sm"
                : "hover:border-primary/30 hover:bg-muted/30",
              disabled && "pointer-events-none opacity-60"
            )}
          >
            <div className="flex items-center gap-2">
              <input
                id={id}
                type="radio"
                name={groupName}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(key)}
                className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
              />
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-semibold">{spec.label}</span>
              {selected && (
                <span className="ml-auto flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                  <Check className="h-3 w-3" />
                  선택됨
                </span>
              )}
            </div>

            <p className="text-xs font-medium text-muted-foreground">
              {spec.subLabel}
            </p>
            <p className="text-sm">{spec.tagline}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {spec.description}
            </p>
          </label>
        );
      })}
    </div>
  );
}
