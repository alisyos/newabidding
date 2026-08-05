"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdvancedOptions } from "@/components/ad-copy/advanced-options";
import { MediaSelect } from "@/components/ad-copy/media-select";
import { SelectField } from "@/components/ad-copy/select-field";
import { TagInput } from "@/components/ad-copy/tag-input";
import { CTAS, INDUSTRIES, blockedMediaFor } from "@/lib/ad-copy-spec";
import type { AdCopyInput, AdMediaKey } from "@/types/ad-copy";

interface AdCopyFormProps {
  value: AdCopyInput;
  /** 변경된 필드만 부분 갱신한다 */
  onChange: (patch: Partial<AdCopyInput>) => void;
  errors: Record<string, string>;
  /** 생성 중에는 입력을 잠근다 */
  disabled?: boolean;
}

/** 필수·권장 tier 입력 폼 (선택 tier 는 AdvancedOptions 로 분리) */
export function AdCopyForm({
  value,
  onChange,
  errors,
  disabled,
}: AdCopyFormProps) {
  const blocked = blockedMediaFor(value.industry, value.media);

  return (
    <fieldset disabled={disabled} className="space-y-6 disabled:opacity-60">
      <MediaSelect
        selected={value.media}
        onChange={(media: AdMediaKey[]) => onChange({ media })}
        blocked={blocked}
        error={errors.media}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="ac-industry"
          label="업종/카테고리"
          required
          value={value.industry}
          onChange={(industry) => onChange({ industry })}
          options={INDUSTRIES.map((i) => ({ value: i.key, label: i.label }))}
          error={errors.industry}
          hint="업종별 심의 규칙과 등록 불가 매체를 판정합니다."
        />

        <div className="space-y-2">
          <Label htmlFor="ac-landing-url">
            연결(랜딩) URL<span className="ml-0.5 text-destructive">*</span>
          </Label>
          <Input
            id="ac-landing-url"
            placeholder="https://example.com/product"
            value={value.landingUrl}
            onChange={(e) => onChange({ landingUrl: e.target.value })}
          />
          {errors.landingUrl ? (
            <p className="text-xs text-destructive">{errors.landingUrl}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              네이버·카카오는 비즈채널 등록 도메인과 일치해야 합니다.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ac-brand">브랜드/상호명</Label>
          <Input
            id="ac-brand"
            placeholder="예: 지피티코리아"
            value={value.brandName}
            onChange={(e) => onChange({ brandName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ac-product">제품/서비스명</Label>
          <Input
            id="ac-product"
            placeholder="예: 무선 노이즈캔슬링 이어폰"
            value={value.productName}
            onChange={(e) => onChange({ productName: e.target.value })}
          />
        </div>
      </div>

      <TagInput
        id="ac-keywords"
        label="타깃 키워드"
        required
        hint="제목 앞부분에 반영됩니다"
        placeholder="예: 무선이어폰 (Enter 또는 쉼표로 구분)"
        values={value.targetKeywords}
        onChange={(targetKeywords) => onChange({ targetKeywords })}
        max={10}
        error={errors.targetKeywords}
      />

      <TagInput
        id="ac-benefits"
        label="핵심 혜택/셀링포인트"
        required
        hint="많이 입력할수록 변형이 다양해집니다"
        placeholder="예: 무료배송, 당일출고, 1년 A/S"
        values={value.keyBenefits}
        onChange={(keyBenefits) => onChange({ keyBenefits })}
        max={10}
        error={errors.keyBenefits}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ac-usp">차별점 (경쟁사 대비)</Label>
          <Input
            id="ac-usp"
            placeholder="예: 국내 자체 공장 생산으로 A/S 기간 단축"
            value={value.usp}
            onChange={(e) => onChange({ usp: e.target.value })}
          />
        </div>
        <SelectField
          id="ac-cta"
          label="행동유도 유형"
          value={value.cta}
          onChange={(cta) => onChange({ cta })}
          options={CTAS.map((c) => ({ value: c, label: c }))}
          placeholder="선택하세요"
        />
      </div>

      <AdvancedOptions value={value} onChange={onChange} errors={errors} />
    </fieldset>
  );
}
