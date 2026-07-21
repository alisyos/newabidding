"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Trash2,
  Eye,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CollectionSet } from "@/types/keyword";

/** 한 페이지당 표시 개수 (기본 20개) */
const PAGE_SIZE = 20;

interface SetListProps {
  sets: CollectionSet[];
  selectedSetId: string | null;
  onSelect: (id: string) => void;
  onDownload: (set: CollectionSet) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

/** 항목의 대표 키워드(앞 3개) 문자열 */
function representativeKeywords(set: CollectionSet): string {
  const names = set.keywords.map((k) => k.keyword);
  const head = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${head} 외 ${names.length - 3}개` : head;
}

export function SetList({
  sets,
  selectedSetId,
  onSelect,
  onDownload,
  onRemove,
  onClearAll,
}: SetListProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(sets.length / PAGE_SIZE));

  // 삭제 등으로 총 페이지 수가 줄면 현재 페이지를 보정
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (sets.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 rounded-md border text-sm text-muted-foreground">
        <FolderOpen className="h-6 w-6 opacity-60" />
        아직 등록된 항목이 없습니다. 키워드를 등록한 뒤 “수집 등록”을 눌러주세요.
      </div>
    );
  }

  const start = (page - 1) * PAGE_SIZE;
  const pageSets = sets.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          총 <span className="font-semibold text-foreground">{sets.length}</span>개
        </p>
        <Button variant="outline" size="sm" onClick={onClearAll}>
          전체 삭제
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">No.</TableHead>
              <TableHead>대표 키워드</TableHead>
              <TableHead className="w-24 text-center">키워드</TableHead>
              <TableHead className="w-24 text-center">검색어</TableHead>
              <TableHead className="w-28 text-center">생성일</TableHead>
              <TableHead className="w-52 text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageSets.map((set) => {
              const termCount = set.results.reduce(
                (n, r) => n + r.terms.length,
                0
              );
              const isSelected = set.id === selectedSetId;
              return (
                <TableRow
                  key={set.id}
                  className={cn(
                    "cursor-pointer",
                    isSelected && "bg-muted/60 hover:bg-muted/60"
                  )}
                  onClick={() => onSelect(set.id)}
                >
                  <TableCell className="text-center font-semibold">
                    {set.seq}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {representativeKeywords(set)}
                  </TableCell>
                  <TableCell className="text-center">
                    {set.keywords.length}개
                  </TableCell>
                  <TableCell className="text-center">{termCount}건</TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {set.createdAt}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="gap-1"
                        onClick={() => onSelect(set.id)}
                      >
                        <Eye className="h-4 w-4" />
                        보기
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => onDownload(set)}
                      >
                        <Download className="h-4 w-4" />
                        엑셀
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(set.id)}
                        aria-label="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{page}</span> /{" "}
            {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
