"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/common/select-field";
import { TagInput } from "@/components/common/tag-input";
import { ChipGroup } from "@/components/creative-brief/chip-group";
import { CreativeBriefAdvanced } from "@/components/creative-brief/creative-brief-advanced";
import { INDUSTRIES } from "@/lib/ad-copy-spec";
import {
  AGE_RANGES,
  CREATIVE_MEDIA,
  CREATIVE_MEDIA_KEYS,
  GENDERS,
  MAX_MEDIA,
  MAX_TONES,
  OBJECTIVES,
  TONE_OPTIONS,
} from "@/lib/creative-brief-spec";
import type {
  CampaignObjective,
  CreativeBriefInput,
  CreativeMediaKey,
} from "@/types/creative-brief";

interface CreativeBriefFormProps {
  value: CreativeBriefInput;
  /** 변경된 필드만 부분 갱신한다 */
  onChange: (patch: Partial<CreativeBriefInput>) => void;
  errors: Record<string, string>;
  /** 생성 중에는 입력을 잠근다 */
  disabled?: boolean;
}

const MEDIA_OPTIONS = CREATIVE_MEDIA_KEYS.map((k) => ({
  value: k,
  label: CREATIVE_MEDIA[k].label,
  hint: CREATIVE_MEDIA[k].hint,
}));

const TONE_CHIP_OPTIONS = TONE_OPTIONS.map((t) => ({ value: t, label: t }));

/** 필수·권장 입력 폼 (선택 입력은 CreativeBriefAdvanced 로 분리) */
export function CreativeBriefForm({
  value,
  onChange,
  errors,
  disabled,
}: CreativeBriefFormProps) {
  return (
    <fieldset disabled={disabled} className="space-y-6 disabled:opacity-60">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="cb-advertiser">
            광고주명<span className="ml-0.5 text-destructive">*</span>
          </Label>
          <Input
            id="cb-advertiser"
            placeholder="예: 지피티카드"
            value={value.advertiser}
            onChange={(e) => onChange({ advertiser: e.target.value })}
          />
          {errors.advertiser && (
            <p className="text-xs text-destructive">{errors.advertiser}</p>
          )}
        </div>

        <SelectField
          id="cb-industry"
          label="업종"
          required
          value={value.industry}
          onChange={(industry) => onChange({ industry })}
          options={INDUSTRIES.map((i) => ({ value: i.key, label: i.label }))}
          error={errors.industry}
          hint="업종에 맞는 소구 방식과 표현 수위를 반영합니다."
        />

        <div className="space-y-2">
          <Label htmlFor="cb-product">브랜드/제품명</Label>
          <Input
            id="cb-product"
            placeholder="예: 퍼스트 체크카드"
            value={value.productName}
            onChange={(e) => onChange({ productName: e.target.value })}
          />
        </div>
      </div>

      <ChipGroup
        label="매체"
        required
        description={`소재를 집행할 매체를 최대 ${MAX_MEDIA}개까지 선택하세요.`}
        options={MEDIA_OPTIONS}
        selected={value.media}
        onChange={(media) => onChange({ media: media as CreativeMediaKey[] })}
        max={MAX_MEDIA}
        error={errors.media}
      />

      <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
        <p className="text-sm font-medium">타깃</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            id="cb-age"
            label="연령"
            value={value.targetAudience.ageRange}
            onChange={(ageRange) =>
              onChange({ targetAudience: { ...value.targetAudience, ageRange } })
            }
            options={AGE_RANGES}
            placeholder="선택하세요"
          />
          <SelectField
            id="cb-gender"
            label="성별"
            value={value.targetAudience.gender}
            onChange={(gender) =>
              onChange({ targetAudience: { ...value.targetAudience, gender } })
            }
            options={GENDERS}
            placeholder="선택하세요"
          />
          <div className="space-y-2">
            <Label htmlFor="cb-interests">관심사</Label>
            <Input
              id="cb-interests"
              placeholder="예: 재테크, 여행, 카페투어"
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

        <div className="space-y-2">
          <Label htmlFor="cb-audience">
            오디언스<span className="ml-0.5 text-destructive">*</span>
          </Label>
          <Textarea
            id="cb-audience"
            className="min-h-[70px]"
            placeholder="예: 첫 직장에 입사해 본인 명의 카드를 처음 만드는 사회초년생. 혜택은 원하지만 복잡한 조건은 피하고 싶어 한다."
            value={value.audienceDescription}
            onChange={(e) => onChange({ audienceDescription: e.target.value })}
          />
          {errors.audienceDescription ? (
            <p className="text-xs text-destructive">
              {errors.audienceDescription}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              타깃이 어떤 상황에 놓여 있고 무엇을 망설이는지 적을수록 카피가
              구체적으로 나옵니다.
            </p>
          )}
        </div>
      </div>

      <div className="sm:max-w-xs">
        <SelectField
          id="cb-objective"
          label="캠페인 목적"
          required
          value={value.objective}
          onChange={(objective) =>
            onChange({ objective: objective as CampaignObjective })
          }
          options={OBJECTIVES.map((o) => ({ value: o, label: o }))}
          hint="목적에 따라 소구 방식과 CTA 강도가 달라집니다."
        />
      </div>

      <ChipGroup
        label="톤앤매너"
        required
        description={`최대 ${MAX_TONES}개까지 조합할 수 있습니다.`}
        options={TONE_CHIP_OPTIONS}
        selected={value.toneAndManner}
        onChange={(toneAndManner) => onChange({ toneAndManner })}
        max={MAX_TONES}
        error={errors.toneAndManner}
      />

      <TagInput
        id="cb-key-messages"
        label="핵심 메시지 / USP"
        required
        hint="많이 입력할수록 안이 다양해집니다"
        placeholder="예: 연회비 없음 (Enter 또는 쉼표로 구분)"
        values={value.keyMessages}
        onChange={(keyMessages) => onChange({ keyMessages })}
        max={10}
        error={errors.keyMessages}
      />

      <CreativeBriefAdvanced value={value} onChange={onChange} />
    </fieldset>
  );
}
