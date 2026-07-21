"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CollectionSet } from "@/types/keyword";
import { ResultMatrixTable } from "@/components/keyword-expansion/result-matrix-table";

interface SetDetailProps {
  set: CollectionSet;
  onDownload: (set: CollectionSet) => void;
}

export function SetDetail({ set, onDownload }: SetDetailProps) {
  const termCount = set.results.reduce((n, r) => n + r.terms.length, 0);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-base font-semibold">No. {set.seq} 상세</p>
          <p className="text-sm text-muted-foreground">
            키워드 {set.keywords.length}개 · 검색어 {termCount}건 · {set.createdAt}
          </p>
        </div>
        <Button onClick={() => onDownload(set)} className="gap-1.5">
          <Download className="h-4 w-4" />
          엑셀 다운로드
        </Button>
      </div>

      <ResultMatrixTable results={set.results} />
    </div>
  );
}
