"use client";

import { Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OptionCard } from "@/components/creative-brief/option-card";
import type {
  BriefSelection,
  CreativeBriefResult,
} from "@/types/creative-brief";

interface CreativeBriefResultsProps {
  result: CreativeBriefResult;
  selection: BriefSelection;
  onSelectionChange: (patch: Partial<BriefSelection>) => void;
  onCopy: (text: string) => void;
  onRegenerate: () => void;
  loading: boolean;
}

/** 섹션 제목 + 설명 */
function SectionHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  );
}

/** 헤드라인·바디카피·콘셉트 3개 섹션. 선택한 안은 그 자리에서 수정할 수 있다. */
export function CreativeBriefResults({
  result,
  selection,
  onSelectionChange,
  onCopy,
  onRegenerate,
  loading,
}: CreativeBriefResultsProps) {
  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          다시 생성
        </Button>
      </div>

      {/* 헤드라인 */}
      <section className="space-y-3">
        <SectionHeading
          title={`헤드라인 ${result.headlines.length}안`}
          hint="안을 선택하면 바로 수정할 수 있습니다."
        />
        <div className="space-y-3">
          {result.headlines.map((h, i) => {
            const selected = selection.headlineIndex === i;
            return (
              <OptionCard
                key={`headline-${i}`}
                seq={i + 1}
                groupName="cb-headline"
                selected={selected}
                onSelect={() =>
                  onSelectionChange({ headlineIndex: i, headlineText: h.text })
                }
                preview={h.text}
                tone={h.tone}
                reason={h.reason}
                copyText={selected ? selection.headlineText : h.text}
                onCopy={onCopy}
                fields={[
                  {
                    key: "text",
                    label: "헤드라인",
                    value: selection.headlineText,
                    onChange: (headlineText) =>
                      onSelectionChange({ headlineText }),
                    rows: 2,
                  },
                ]}
              />
            );
          })}
        </div>
      </section>

      {/* 바디카피 */}
      <section className="space-y-3">
        <SectionHeading
          title={`바디카피 ${result.bodyCopies.length}안`}
          hint="헤드라인을 뒷받침하는 본문입니다."
        />
        <div className="space-y-3">
          {result.bodyCopies.map((b, i) => {
            const selected = selection.bodyIndex === i;
            return (
              <OptionCard
                key={`body-${i}`}
                seq={i + 1}
                groupName="cb-body"
                selected={selected}
                onSelect={() =>
                  onSelectionChange({ bodyIndex: i, bodyText: b.text })
                }
                preview={b.text}
                tone={b.tone}
                reason={b.reason}
                copyText={selected ? selection.bodyText : b.text}
                onCopy={onCopy}
                fields={[
                  {
                    key: "text",
                    label: "바디카피",
                    value: selection.bodyText,
                    onChange: (bodyText) => onSelectionChange({ bodyText }),
                    rows: 4,
                  },
                ]}
              />
            );
          })}
        </div>
      </section>

      {/* 콘셉트 방향 */}
      <section className="space-y-3">
        <SectionHeading
          title={`콘셉트 방향 ${result.concepts.length}안`}
          hint="비주얼 디렉션이 함께 제공됩니다."
        />
        <div className="space-y-3">
          {result.concepts.map((c, i) => {
            const selected = selection.conceptIndex === i;
            return (
              <OptionCard
                key={`concept-${i}`}
                seq={i + 1}
                groupName="cb-concept"
                selected={selected}
                onSelect={() =>
                  onSelectionChange({
                    conceptIndex: i,
                    conceptName: c.name,
                    conceptDirection: c.direction,
                    conceptKeyMessage: c.keyMessage,
                    visualDirection: c.visualDirection,
                  })
                }
                title={c.name}
                preview={c.direction}
                reason={c.reason}
                copyText={
                  selected
                    ? [
                        selection.conceptName,
                        selection.conceptDirection,
                        selection.conceptKeyMessage,
                        selection.visualDirection,
                      ]
                        .filter(Boolean)
                        .join("\n")
                    : [c.name, c.direction, c.keyMessage, c.visualDirection].join(
                        "\n"
                      )
                }
                onCopy={onCopy}
                meta={[
                  { label: "핵심 메시지", value: c.keyMessage },
                  { label: "비주얼 디렉션", value: c.visualDirection },
                ]}
                fields={[
                  {
                    key: "name",
                    label: "콘셉트명",
                    value: selection.conceptName,
                    onChange: (conceptName) =>
                      onSelectionChange({ conceptName }),
                    rows: 1,
                  },
                  {
                    key: "direction",
                    label: "콘셉트 방향",
                    value: selection.conceptDirection,
                    onChange: (conceptDirection) =>
                      onSelectionChange({ conceptDirection }),
                    rows: 3,
                  },
                  {
                    key: "keyMessage",
                    label: "핵심 메시지",
                    value: selection.conceptKeyMessage,
                    onChange: (conceptKeyMessage) =>
                      onSelectionChange({ conceptKeyMessage }),
                    rows: 2,
                  },
                  {
                    key: "visual",
                    label: "비주얼 디렉션",
                    value: selection.visualDirection,
                    onChange: (visualDirection) =>
                      onSelectionChange({ visualDirection }),
                    rows: 4,
                  },
                ]}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
