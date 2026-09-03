"use client";

import { useState } from "react";
import { AlertCircle, Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_SIZES,
  SIZE_PRESET_GROUPS,
  SIZE_RANGE,
  customSize,
  estimateCropLoss,
  formatRatio,
} from "@/lib/banner-resize-spec";
import { cn } from "@/lib/utils";
import type { BannerModelKey, BannerSize } from "@/types/banner-resize";

interface SizeSelectorProps {
  value: BannerSize[];
  onChange: (sizes: BannerSize[]) => void;
  /** 선택된 모델 — 만들 수 있는 비율이 모델마다 달라 손실률이 갈린다 */
  model: BannerModelKey;
  disabled?: boolean;
  error?: string;
}

/** 이 정도 아래는 반올림 수준이라 배지를 붙이지 않는다 */
const CROP_BADGE_THRESHOLD = 5;

/** 기획서 6장 — 매체별 프리셋 + 직접 입력 */
export function SizeSelector({
  value,
  onChange,
  model,
  disabled,
  error,
}: SizeSelectorProps) {
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [customError, setCustomError] = useState("");

  const selectedIds = new Set(value.map((s) => s.id));
  const full = value.length >= MAX_SIZES;

  const toggle = (size: BannerSize) => {
    if (selectedIds.has(size.id)) {
      onChange(value.filter((s) => s.id !== size.id));
      return;
    }
    if (full) return;
    onChange([...value, size]);
  };

  const addCustom = () => {
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);

    if (!Number.isFinite(w) || !Number.isFinite(h)) {
      setCustomError("가로·세로를 숫자로 입력해주세요.");
      return;
    }
    if (
      w < SIZE_RANGE.min ||
      w > SIZE_RANGE.max ||
      h < SIZE_RANGE.min ||
      h > SIZE_RANGE.max
    ) {
      setCustomError(
        `각 변은 ${SIZE_RANGE.min}~${SIZE_RANGE.max}px 사이여야 합니다.`
      );
      return;
    }
    const next = customSize(w, h);
    if (selectedIds.has(next.id)) {
      setCustomError("이미 선택한 규격입니다.");
      return;
    }
    if (full) {
      setCustomError(`규격은 한 번에 최대 ${MAX_SIZES}개까지 선택할 수 있습니다.`);
      return;
    }
    onChange([...value, next]);
    setWidth("");
    setHeight("");
    setCustomError("");
  };

  return (
    <div className="space-y-5">
      {/* 매체별 프리셋 */}
      <div className="space-y-3">
        {SIZE_PRESET_GROUPS.map((group) => (
          <div key={group.media} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              {group.media}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.sizes.map((size) => {
                const on = selectedIds.has(size.id);
                const loss = estimateCropLoss(model, size);
                return (
                  <button
                    key={size.id}
                    type="button"
                    disabled={disabled || (!on && full)}
                    onClick={() => toggle(size)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      on
                        ? "border-primary/50 bg-primary/5"
                        : "hover:border-primary/30 hover:bg-muted/30",
                      (disabled || (!on && full)) && "opacity-50",
                      !on && full && "cursor-not-allowed"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      )}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="font-medium">
                      {size.width}×{size.height}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {size.label}
                    </span>
                    {loss >= CROP_BADGE_THRESHOLD && (
                      <span
                        className="rounded-full border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        title={`이 모델은 ${size.width}×${size.height} 비율을 직접 만들지 못해 생성 후 ${loss}%를 잘라냅니다`}
                      >
                        크롭 {loss}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 직접 입력 */}
      <div className="space-y-2 rounded-md border bg-muted/30 p-3">
        <Label className="text-xs">직접 입력</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-24 bg-background"
            inputMode="numeric"
            placeholder="가로"
            value={width}
            disabled={disabled}
            onChange={(e) => setWidth(e.target.value.replace(/[^0-9]/g, ""))}
          />
          <span className="text-sm text-muted-foreground">×</span>
          <Input
            className="w-24 bg-background"
            inputMode="numeric"
            placeholder="세로"
            value={height}
            disabled={disabled}
            onChange={(e) => setHeight(e.target.value.replace(/[^0-9]/g, ""))}
          />
          <span className="text-sm text-muted-foreground">px</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={disabled}
            onClick={addCustom}
          >
            <Plus className="h-3.5 w-3.5" />
            사이즈 추가
          </Button>
        </div>
        {customError && (
          <p className="text-xs font-medium text-destructive">{customError}</p>
        )}
      </div>

      {/* 선택 목록 */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">
            선택한 규격{" "}
            <span className="font-medium text-foreground">
              {value.length} / {MAX_SIZES}
            </span>
          </p>
          {value.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={disabled}
              onClick={() => onChange([])}
            >
              모두 지우기
            </Button>
          )}
        </div>

        {value.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            생성할 광고 규격을 1개 이상 선택해주세요.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {value.map((size) => {
              // 프리셋 그리드에만 배지를 달면 직접 입력한 규격의 손실률을 놓친다.
              // 선택 목록은 프리셋·커스텀이 모두 모이는 유일한 자리다.
              const loss = estimateCropLoss(model, size);
              return (
              <span
                key={size.id}
                className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs"
              >
                <span className="font-medium">
                  {size.width}×{size.height}
                </span>
                <span className="text-muted-foreground">
                  {formatRatio(size.width, size.height)}
                </span>
                {loss >= CROP_BADGE_THRESHOLD && (
                  <span
                    className="rounded-full border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    title={`이 모델은 ${size.width}×${size.height} 비율을 직접 만들지 못해 생성 후 ${loss}%를 잘라냅니다`}
                  >
                    크롭 {loss}%
                  </span>
                )}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(size)}
                  aria-label={`${size.width}×${size.height} 제거`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
              );
            })}
          </div>
        )}

        {value.some((s) => estimateCropLoss(model, s) >= CROP_BADGE_THRESHOLD) && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              &lsquo;크롭&rsquo; 표시 규격은 선택한 모델이 그 비율을 직접 만들지 못해
              생성 후 일부를 잘라냅니다. 손실률은 <b>모델마다 다릅니다</b> —
              Nano Banana 2 는 4:1·8:1·1:4·1:8 을 지원해 1200×300·728×90 을 크롭 없이
              만들고, GPT-Image-2 는 3:1 까지라 그 근처 비율(320×100 등)에 강합니다.
              모델을 바꿔가며 배지의 숫자를 비교해보세요.
            </span>
          </p>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
