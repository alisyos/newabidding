"use client";

import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { YouTubeSearchInput } from "@/types/youtube-monitoring";

interface YoutubeSearchFormProps {
  value: YouTubeSearchInput;
  onChange: (patch: Partial<YouTubeSearchInput>) => void;
  onSubmit: () => void;
  errors: Record<string, string>;
  loading: boolean;
  /** 1회 실행 차감 포인트 */
  unitPrice: number;
  balance: number;
}

export function YoutubeSearchForm({
  value,
  onChange,
  onSubmit,
  errors,
  loading,
  unitPrice,
  balance,
}: YoutubeSearchFormProps) {
  return (
    <div className="space-y-5">
      <fieldset disabled={loading} className="flex flex-wrap items-start gap-4">
        <div className="min-w-[220px] flex-1 space-y-2">
          <Label htmlFor="keyword">
            검색 키워드
            <span className="ml-1 text-destructive">*</span>
          </Label>
          <Input
            id="keyword"
            type="text"
            placeholder="예: 국민연금"
            value={value.keyword}
            onChange={(e) => onChange({ keyword: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmit();
              }
            }}
            aria-invalid={!!errors.keyword}
          />
          {errors.keyword && (
            <p className="text-sm text-destructive">{errors.keyword}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">
            시작일
            <span className="ml-1 text-destructive">*</span>
          </Label>
          <Input
            id="startDate"
            type="date"
            className="w-[170px]"
            value={value.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            aria-invalid={!!errors.startDate}
          />
          {errors.startDate && (
            <p className="text-sm text-destructive">{errors.startDate}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">
            종료일
            <span className="ml-1 text-destructive">*</span>
          </Label>
          <Input
            id="endDate"
            type="date"
            className="w-[170px]"
            value={value.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            aria-invalid={!!errors.endDate}
          />
          {errors.endDate && (
            <p className="text-sm text-destructive">{errors.endDate}</p>
          )}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            예상 차감 {unitPrice.toLocaleString()}P
          </span>{" "}
          (실행 1회당 · 보유 {balance.toLocaleString()}P)
        </p>
        <Button onClick={onSubmit} disabled={loading} className="gap-1.5">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {loading ? "검색 중..." : "영상 검색"}
        </Button>
      </div>
    </div>
  );
}
