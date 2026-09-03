"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/common/select-field";
import {
  COMPOSITION_OPTIONS,
  MAX_SOURCE_TEXT_CHARS,
} from "@/lib/banner-resize-spec";
import { cn } from "@/lib/utils";
import type {
  BannerComposition,
  BannerResizeOptions,
} from "@/types/banner-resize";

interface BannerOptionsProps {
  value: BannerResizeOptions;
  onChange: (patch: Partial<BannerResizeOptions>) => void;
  disabled?: boolean;
}

type BoolKey = {
  [K in keyof BannerResizeOptions]: BannerResizeOptions[K] extends boolean
    ? K
    : never;
}[keyof BannerResizeOptions];

const BASIC: { key: BoolKey; label: string; hint: string }[] = [
  {
    key: "preserveText",
    label: "원본 문구 유지",
    hint: "단어·철자는 원본 그대로 두고 위치와 크기만 새 규격에 맞게 재배치합니다.",
  },
  {
    key: "preserveProduct",
    label: "상품·인물 외형 유지",
    hint: "상품과 인물의 모양·색·재질을 원본과 동일하게 재현합니다.",
  },
  {
    key: "preserveLogo",
    label: "로고 유지",
    hint: "브랜드 로고를 원본 형태 그대로, 가려지지 않게 배치합니다.",
  },
];

const ADVANCED: { key: BoolKey; label: string; hint: string }[] = [
  {
    key: "expandBackground",
    label: "배경 적극 재생성",
    hint: "새 비율에 맞게 배경을 다시 구성합니다. 끄면 원본 색·톤을 단순하게 확장합니다.",
  },
];

/** 기획서 7장 — 기본 설정은 항상 노출, 고급 설정은 접어 둔다 */
export function BannerOptions({ value, onChange, disabled }: BannerOptionsProps) {
  const [open, setOpen] = useState(false);

  const renderToggle = (item: { key: BoolKey; label: string; hint: string }) => (
    <div key={item.key} className="flex items-start gap-2">
      <Checkbox
        id={`br-${item.key}`}
        className="mt-0.5"
        checked={value[item.key]}
        disabled={disabled}
        onCheckedChange={(v) => onChange({ [item.key]: v === true })}
      />
      <div className="space-y-0.5">
        <Label htmlFor={`br-${item.key}`} className="cursor-pointer">
          {item.label}
        </Label>
        <p className="text-xs text-muted-foreground">{item.hint}</p>
      </div>
    </div>
  );

  const textLen = value.sourceText.length;

  return (
    <div className="space-y-4">
      <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        AI가 원본을 참고해 <span className="font-medium text-foreground">목표 규격에 맞게
        레이아웃을 다시 구성</span>합니다. 상품·문구·로고의 위치와 크기는 새 비율에 맞게
        재배치되며, 아래 옵션으로 무엇을 원본 그대로 지킬지 정합니다.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">{BASIC.map(renderToggle)}</div>

      <div className="border-t pt-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
          고급 설정
        </button>

        {open && (
          <div className="mt-3 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {ADVANCED.map(renderToggle)}
            </div>

            <div className="max-w-xs">
              <SelectField
                id="br-composition"
                label="레이아웃 중심"
                value={value.composition}
                onChange={(v) =>
                  onChange({ composition: v as BannerComposition })
                }
                options={COMPOSITION_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            </div>

            {/*
              모델이 이미지에서 글자를 읽어내는 과정에서 오차가 생긴다.
              정답 텍스트를 직접 주면 문구 재현 정확도가 크게 올라간다.
            */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="br-source-text">원본 문구</Label>
                <span className="text-xs text-muted-foreground">선택 입력</span>
                <span
                  className={cn(
                    "ml-auto text-xs",
                    textLen >= MAX_SOURCE_TEXT_CHARS
                      ? "font-medium text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  {textLen} / {MAX_SOURCE_TEXT_CHARS}
                </span>
              </div>
              <Textarea
                id="br-source-text"
                className="min-h-[90px]"
                placeholder={"배너에 들어간 문구를 그대로 적어주세요.\n예)\n여름 시즌 최대 50% 할인\n지금 구매하기"}
                value={value.sourceText}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    sourceText: e.target.value.slice(0, MAX_SOURCE_TEXT_CHARS),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                적어주시면 AI가 문구를 오탈자 없이 그대로 재현합니다. 비워 두면 원본
                이미지에서 읽어내므로 글자가 살짝 달라질 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
