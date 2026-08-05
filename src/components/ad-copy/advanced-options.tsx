"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ad-copy/select-field";
import { TagInput } from "@/components/ad-copy/tag-input";
import {
  DIVERSITY_LEVELS,
  MEDIA_SPECS,
  TONES,
  findIndustry,
} from "@/lib/ad-copy-spec";
import { cn } from "@/lib/utils";
import type { AdCopyInput, AdMediaKey, AdVariantCount } from "@/types/ad-copy";

interface AdvancedOptionsProps {
  value: AdCopyInput;
  onChange: (patch: Partial<AdCopyInput>) => void;
  errors: Record<string, string>;
}

/** 선택(optional) tier 입력 — 기본은 접혀 있다 */
export function AdvancedOptions({
  value,
  onChange,
  errors,
}: AdvancedOptionsProps) {
  const [open, setOpen] = useState(false);

  const industry = findIndustry(value.industry);
  const needsReviewNumber = industry?.reviewNumberRequired === true;

  const setVariantCount = (
    media: AdMediaKey,
    field: keyof AdVariantCount,
    raw: string
  ) => {
    const spec = MEDIA_SPECS[media].fields[
      field === "titles" ? "title" : "description"
    ];
    const parsed = parseInt(raw, 10);
    const n = Number.isNaN(parsed) ? spec.defaultCount : parsed;
    const clamped = Math.min(spec.maxCount, Math.max(spec.minCount, n));
    const current = value.variantCount[media] ?? {
      titles: MEDIA_SPECS[media].fields.title.defaultCount,
      descriptions: MEDIA_SPECS[media].fields.description.defaultCount,
    };
    onChange({
      variantCount: {
        ...value.variantCount,
        [media]: { ...current, [field]: clamped },
      },
    });
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
          (톤앤매너 · 프로모션 · 가격 · 금칙어 · 생성 개수)
        </span>
      </button>

      {open && (
        <div className="animate-fade-slide-down mt-4 space-y-6">
          {/* 표현 제어 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="ac-tone"
              label="톤앤매너"
              value={value.toneAndManner}
              onChange={(toneAndManner) => onChange({ toneAndManner })}
              options={TONES.map((t) => ({ value: t, label: t }))}
            />
            <SelectField
              id="ac-diversity"
              label="변형 다양성"
              value={value.diversityLevel}
              onChange={(v) =>
                onChange({ diversityLevel: v as AdCopyInput["diversityLevel"] })
              }
              options={DIVERSITY_LEVELS.map((d) => ({ value: d, label: d }))}
              hint="혜택·가격·신뢰·긴급성·브랜드 소구축 분배 폭을 조절합니다."
            />
          </div>

          {/* 프로모션 */}
          <div className="space-y-2">
            <Label>프로모션</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="할인율/할인액 (예: 30%)"
                value={value.promotion.discountRate}
                onChange={(e) =>
                  onChange({
                    promotion: {
                      ...value.promotion,
                      discountRate: e.target.value,
                    },
                  })
                }
              />
              <Input
                placeholder="기간 (예: 8월 31일까지)"
                value={value.promotion.period}
                onChange={(e) =>
                  onChange({
                    promotion: { ...value.promotion, period: e.target.value },
                  })
                }
              />
              <Input
                placeholder="사은품·이벤트"
                value={value.promotion.event}
                onChange={(e) =>
                  onChange({
                    promotion: { ...value.promotion, event: e.target.value },
                  })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              할인율은 모든 이용자에게 공통 적용되는 기준값만 입력하세요. 어떤
              상품 기준인지 명시해야 반려를 피할 수 있습니다.
            </p>
          </div>

          {/* 가격 */}
          <div className="space-y-2">
            <Label>가격 정보</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="항목명 (예: 기본형)"
                value={value.price.itemName}
                onChange={(e) =>
                  onChange({
                    price: { ...value.price, itemName: e.target.value },
                  })
                }
              />
              <Input
                placeholder="금액 (예: 29,000원)"
                value={value.price.amount}
                onChange={(e) =>
                  onChange({ price: { ...value.price, amount: e.target.value } })
                }
              />
              <Input
                placeholder="수식어 (부터/최대/평균)"
                value={value.price.qualifier}
                onChange={(e) =>
                  onChange({
                    price: { ...value.price, qualifier: e.target.value },
                  })
                }
              />
            </div>
          </div>

          {/* 타깃 고객 */}
          <div className="space-y-2">
            <Label>타깃 고객</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="성별 (예: 여성)"
                value={value.targetAudience.gender}
                onChange={(e) =>
                  onChange({
                    targetAudience: {
                      ...value.targetAudience,
                      gender: e.target.value,
                    },
                  })
                }
              />
              <Input
                placeholder="연령대 (예: 30~40대)"
                value={value.targetAudience.ageRange}
                onChange={(e) =>
                  onChange({
                    targetAudience: {
                      ...value.targetAudience,
                      ageRange: e.target.value,
                    },
                  })
                }
              />
              <Input
                placeholder="관심사 (예: 홈트레이닝)"
                value={value.targetAudience.interests}
                onChange={(e) =>
                  onChange({
                    targetAudience: {
                      ...value.targetAudience,
                      interests: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>

          {/* 필수 포함 / 제외어 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <TagInput
              id="ac-must-include"
              label="필수 포함 문구"
              hint="법적 고지·슬로건"
              placeholder="예: 심의필 제2026-000호"
              values={value.mustInclude}
              onChange={(mustInclude) => onChange({ mustInclude })}
              max={5}
            />
            <TagInput
              id="ac-exclude-words"
              label="제외/금칙어"
              hint="브랜드 자체 금칙어"
              placeholder="예: 무료"
              values={value.excludeWords}
              onChange={(excludeWords) => onChange({ excludeWords })}
              max={20}
            />
          </div>

          {/* 최상급 표현 */}
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="ac-superlative"
                checked={value.superlative.use}
                onCheckedChange={(v) =>
                  onChange({
                    superlative: { ...value.superlative, use: v === true },
                  })
                }
              />
              <Label htmlFor="ac-superlative" className="cursor-pointer">
                최상급 표현(최고·1위·유일) 사용
              </Label>
            </div>
            {value.superlative.use && (
              <div className="space-y-1.5">
                <Input
                  placeholder="근거 자료 (예: 2025 한국소비자만족지수 1위 수상)"
                  value={value.superlative.evidence}
                  onChange={(e) =>
                    onChange({
                      superlative: {
                        ...value.superlative,
                        evidence: e.target.value,
                      },
                    })
                  }
                />
                {errors.superlative ? (
                  <p className="text-xs text-destructive">
                    {errors.superlative}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    공신력 있는 조사기관 자료·수상 내역·통계 출처가 없으면
                    반려됩니다. 랜딩페이지에도 근거가 노출되어야 합니다.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 심의필 번호 */}
          {needsReviewNumber && (
            <div className="space-y-2">
              <Label htmlFor="ac-review-number">
                심의필 번호
                <span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="ac-review-number"
                placeholder="예: 심의필 제2026-000호"
                value={value.reviewNumber}
                onChange={(e) => onChange({ reviewNumber: e.target.value })}
              />
              {errors.reviewNumber ? (
                <p className="text-xs text-destructive">
                  {errors.reviewNumber}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {industry?.label}은 사전심의 대상 업종입니다.
                </p>
              )}
            </div>
          )}

          {/* 생성 개수 */}
          {value.media.length > 0 && (
            <div className="space-y-2">
              <Label>생성 개수</Label>
              <div className="space-y-2">
                {value.media.map((m) => {
                  const spec = MEDIA_SPECS[m];
                  const counts = value.variantCount[m] ?? {
                    titles: spec.fields.title.defaultCount,
                    descriptions: spec.fields.description.defaultCount,
                  };
                  return (
                    <div
                      key={m}
                      className="flex flex-wrap items-center gap-3 rounded-md border p-2.5"
                    >
                      <span className="w-14 text-sm font-medium">
                        {spec.shortName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          제목
                        </span>
                        <Input
                          type="number"
                          className="h-8 w-20"
                          min={spec.fields.title.minCount}
                          max={spec.fields.title.maxCount}
                          value={counts.titles}
                          onChange={(e) =>
                            setVariantCount(m, "titles", e.target.value)
                          }
                        />
                        <span className="text-[11px] text-muted-foreground">
                          ({spec.fields.title.minCount}~
                          {spec.fields.title.maxCount})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          설명
                        </span>
                        <Input
                          type="number"
                          className="h-8 w-20"
                          min={spec.fields.description.minCount}
                          max={spec.fields.description.maxCount}
                          value={counts.descriptions}
                          onChange={(e) =>
                            setVariantCount(m, "descriptions", e.target.value)
                          }
                        />
                        <span className="text-[11px] text-muted-foreground">
                          ({spec.fields.description.minCount}~
                          {spec.fields.description.maxCount})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
