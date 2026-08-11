"use client";

import { Copy, Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** 선택 시 편집 가능한 필드 하나 */
export interface EditableField {
  key: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

interface OptionCardProps {
  /** 1부터 시작하는 안 번호 */
  seq: number;
  /** 라디오 그룹 이름 (섹션별로 달라야 한다) */
  groupName: string;
  selected: boolean;
  onSelect: () => void;
  /** 카드 제목 — 콘셉트는 콘셉트명, 카피는 생략 */
  title?: string;
  /** 미선택 상태에서 보여줄 원문 */
  preview: string;
  /** 선택 상태에서 노출할 편집 필드 (원문 대신 표시) */
  fields: EditableField[];
  /** 부가 정보 줄 (콘셉트 핵심 메시지 등) */
  meta?: { label: string; value: string }[];
  tone?: string;
  reason?: string;
  onCopy: (text: string) => void;
  /** 복사 대상 텍스트 (편집본 기준) */
  copyText: string;
}

/**
 * 생성된 안 1개.
 * 선택하면 Textarea 로 바뀌어 그 자리에서 수정할 수 있고, 수정본이 최종 문서에 반영된다.
 */
export function OptionCard({
  seq,
  groupName,
  selected,
  onSelect,
  title,
  preview,
  fields,
  meta,
  tone,
  reason,
  onCopy,
  copyText,
}: OptionCardProps) {
  const radioId = `${groupName}-${seq}`;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all",
        selected
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "hover:border-primary/30 hover:bg-muted/30"
      )}
    >
      <div className="flex items-start gap-3">
        <input
          id={radioId}
          type="radio"
          name={groupName}
          checked={selected}
          onChange={onSelect}
          className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
        />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={radioId}
              className="cursor-pointer text-xs font-semibold text-muted-foreground"
            >
              안 {seq}
            </label>
            {title && !selected && (
              <span className="text-sm font-semibold">{title}</span>
            )}
            {tone && (
              <span className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                {tone}
              </span>
            )}
            {selected && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                선택됨 · 수정 가능
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto h-7 w-7 shrink-0"
              onClick={() => onCopy(copyText)}
              aria-label={`안 ${seq} 복사`}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>

          {selected ? (
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label
                    htmlFor={`${radioId}-${f.key}`}
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {f.label}
                  </Label>
                  <Textarea
                    id={`${radioId}-${f.key}`}
                    rows={f.rows ?? 2}
                    className="bg-background"
                    value={f.value}
                    onChange={(e) => f.onChange(e.target.value)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              <p
                className="cursor-pointer whitespace-pre-wrap text-sm leading-relaxed"
                onClick={onSelect}
              >
                {preview}
              </p>
              {meta?.map((m) => (
                <p key={m.label} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{m.label}</span>{" "}
                  {m.value}
                </p>
              ))}
            </>
          )}

          {reason && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{reason}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
