"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/common/tag-input";
import { ReferenceInput } from "@/components/creative-brief/reference-input";
import { COUNT_RANGE } from "@/lib/creative-brief-spec";
import { cn } from "@/lib/utils";
import type {
  BriefVariantCount,
  CreativeBriefInput,
} from "@/types/creative-brief";

interface CreativeBriefAdvancedProps {
  value: CreativeBriefInput;
  onChange: (patch: Partial<CreativeBriefInput>) => void;
}

const COUNT_FIELDS: { key: keyof BriefVariantCount; label: string }[] = [
  { key: "headlines", label: "헤드라인" },
  { key: "bodyCopies", label: "바디카피" },
  { key: "concepts", label: "콘셉트 방향" },
];

/** 선택 입력 — 기본은 접혀 있다 */
export function CreativeBriefAdvanced({
  value,
  onChange,
}: CreativeBriefAdvancedProps) {
  const [open, setOpen] = useState(false);

  const setCount = (field: keyof BriefVariantCount, raw: string) => {
    const parsed = parseInt(raw, 10);
    const n = Number.isNaN(parsed) ? value.variantCount[field] : parsed;
    const clamped = Math.min(COUNT_RANGE.max, Math.max(COUNT_RANGE.min, n));
    onChange({ variantCount: { ...value.variantCount, [field]: clamped } });
  };

  return (
    <div className="border-t pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
        고급 옵션
        <span className="text-xs font-normal">
          (필수 포함 문구 · 금지어 · 생성 개수 · 참조 자료)
        </span>
      </button>

      {open && (
        <div className="mt-4 animate-fade-slide-down space-y-6 rounded-lg border bg-muted/30 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TagInput
              id="cb-must-include"
              label="필수 포함 문구"
              hint="헤드라인 또는 바디카피에 반드시 들어갑니다"
              placeholder="예: 무이자 12개월"
              values={value.mustInclude}
              onChange={(mustInclude) => onChange({ mustInclude })}
              max={5}
            />
            <TagInput
              id="cb-exclude-words"
              label="사용 금지어"
              hint="브랜드 가이드상 쓸 수 없는 표현"
              placeholder="예: 최저가, 대박"
              values={value.excludeWords}
              onChange={(excludeWords) => onChange({ excludeWords })}
              max={10}
            />
          </div>

          <div className="space-y-2">
            <Label>생성 개수</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {COUNT_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label
                    htmlFor={`cb-count-${f.key}`}
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {f.label}
                  </Label>
                  <Input
                    id={`cb-count-${f.key}`}
                    type="number"
                    min={COUNT_RANGE.min}
                    max={COUNT_RANGE.max}
                    value={value.variantCount[f.key]}
                    onChange={(e) => setCount(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              각 {COUNT_RANGE.min}~{COUNT_RANGE.max}안까지 생성할 수 있습니다.
              기본값은 헤드라인 3안 · 바디카피 3안 · 콘셉트 방향 2안입니다.
            </p>
          </div>

          <div className="space-y-6 border-t pt-4">
            <p className="text-sm font-medium">
              참조 자료{" "}
              <span className="text-xs font-normal text-muted-foreground">
                입력하면 톤과 구조를 참고해 생성합니다 (문구를 그대로 복제하지
                않습니다)
              </span>
            </p>

            <ReferenceInput
              id="cb-reference-plan"
              label="과거 소재 기획안"
              hint="동일 업종에서 집행했던 기획안"
              placeholder="이전 기획안의 헤드라인·콘셉트·비주얼 디렉션을 붙여넣거나 파일로 불러오세요."
              value={value.referencePlan}
              onChange={(referencePlan) => onChange({ referencePlan })}
            />

            <ReferenceInput
              id="cb-copy-guide"
              label="브랜드 카피 가이드"
              hint="어휘 규칙·금지 표현은 반드시 지킵니다"
              placeholder="브랜드 보이스, 사용 어휘, 표기 규칙, 금지 표현 등을 붙여넣거나 파일로 불러오세요."
              value={value.copyGuide}
              onChange={(copyGuide) => onChange({ copyGuide })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
