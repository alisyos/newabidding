"use client";

import { ClipboardCopy, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { industryLabel } from "@/lib/ad-copy-spec";
import { mediaLabel, sortMedia } from "@/lib/creative-brief-spec";
import type { BriefSelection, CreativeBriefInput } from "@/types/creative-brief";

interface FinalPreviewProps {
  input: CreativeBriefInput;
  selection: BriefSelection;
  onMemoChange: (memo: string) => void;
  onCopyAll: () => void;
  onDownload: () => void;
  createdDate: string;
}

/** 라벨 + 본문 블록 */
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 border-l-2 border-foreground/70 pl-3">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/** 값이 비었으면 안내 문구로 대체 */
function orDash(value: string) {
  const v = value.trim();
  return v ? v : <span className="text-muted-foreground">—</span>;
}

/** 선택·수정이 반영된 최종 기획안 미리보기 + 내보내기 */
export function FinalPreview({
  input,
  selection,
  onMemoChange,
  onCopyAll,
  onDownload,
  createdDate,
}: FinalPreviewProps) {
  const summary = [
    input.advertiser,
    industryLabel(input.industry),
    sortMedia(input.media).map(mediaLabel).join(", "),
    input.objective,
    input.toneAndManner.join(" + "),
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-background p-5">
        <div className="space-y-1 border-b pb-3">
          <p className="text-base font-bold">
            {input.advertiser || "광고주"} 소재 기획안
          </p>
          <p className="text-xs text-muted-foreground">
            {summary} · 작성일 {createdDate}
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <Block title="헤드라인">{orDash(selection.headlineText)}</Block>
          <Block title="바디카피">{orDash(selection.bodyText)}</Block>
          <Block title="콘셉트 방향">
            <p className="font-medium">{orDash(selection.conceptName)}</p>
            <p className="mt-1">{orDash(selection.conceptDirection)}</p>
            <p className="mt-1 text-muted-foreground">
              핵심 메시지 · {selection.conceptKeyMessage.trim() || "—"}
            </p>
          </Block>
          <Block title="비주얼 디렉션">{orDash(selection.visualDirection)}</Block>
          {selection.memo.trim() && (
            <Block title="AE 메모">{selection.memo}</Block>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cb-memo">AE 메모</Label>
        <Textarea
          id="cb-memo"
          className="min-h-[80px]"
          placeholder="제작팀에 전달할 참고 사항, 촬영 조건, 법무 확인 필요 항목 등을 적어주세요."
          value={selection.memo}
          onChange={(e) => onMemoChange(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCopyAll}
          className="gap-1.5"
        >
          <ClipboardCopy className="h-4 w-4" />
          전체 복사
        </Button>
        <Button type="button" onClick={onDownload} className="gap-1.5">
          <FileText className="h-4 w-4" />
          문서 다운로드 (.doc)
        </Button>
      </div>
    </div>
  );
}
