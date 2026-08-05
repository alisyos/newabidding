"use client";

import { AlertTriangle, Copy, CopyX, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LengthBadge } from "@/components/ad-copy/length-badge";
import { MEDIA_SPECS } from "@/lib/ad-copy-spec";
import { cn } from "@/lib/utils";
import type { EvaluatedAdCopyItem } from "@/types/ad-copy";

interface AdCopyItemRowProps {
  item: EvaluatedAdCopyItem;
  checked: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onCopy: (text: string) => void;
}

/** 생성된 문구 1건 — 체크박스 + 문구 + 글자수 배지 + 위반 경고 + 생성 이유 */
export function AdCopyItemRow({
  item,
  checked,
  onToggle,
  onCopy,
}: AdCopyItemRowProps) {
  const spec = MEDIA_SPECS[item.media];
  const fieldSpec = spec.fields[item.field];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-md border p-3 transition-colors",
        item.hasError ? "border-destructive/30 bg-destructive/5" : "bg-background"
      )}
    >
      <Checkbox
        id={item.id}
        checked={checked}
        onCheckedChange={(v) => onToggle(item.id, v === true)}
        className="mt-1 shrink-0"
      />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-6 shrink-0 text-xs text-muted-foreground tabular-nums">
            {item.seq}.
          </span>
          <p className="text-sm font-medium">{item.text}</p>
          <LengthBadge
            measure={item.measure}
            mode={spec.counter}
            koCount={item.koCount}
            minLength={fieldSpec.minLength}
          />
          {item.duplicate && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
              <CopyX className="h-3 w-3" />
              중복
            </span>
          )}
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {item.angle}
          </span>
        </div>

        {item.hits.length > 0 && (
          <ul className="space-y-0.5">
            {item.hits.map((h) => (
              <li
                key={h.ruleId}
                className={cn(
                  "flex items-start gap-1 text-xs",
                  h.severity === "error" ? "text-destructive" : "text-amber-600"
                )}
              >
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  {h.name}: &ldquo;{h.matched}&rdquo; — {h.message}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="flex items-start gap-1 text-xs text-muted-foreground">
          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{item.reason}</span>
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onCopy(item.text)}
        aria-label="문구 복사"
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}
