"use client";

// 표 하단 페이지네이션 + 페이지 슬라이싱 훅.
//
// 같은 블록이 usage-log-table.tsx / set-list.tsx 에 이미 각각 복사되어 있다.
// 새로 추가되는 수집 결과 표 3개까지 네 번째·다섯 번째 사본을 만들지 않으려고
// 여기로 뽑았다. (기존 두 곳은 이번 변경 범위 밖이라 건드리지 않았다)

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 목록을 페이지 단위로 자른다.
 * 항목이 줄어 현재 페이지가 사라지면 마지막 페이지로 당겨준다.
 */
export function usePagedItems<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, totalPages, pageItems };
}

interface TablePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** 페이지가 1장뿐이면 아무것도 그리지 않는다 */
export function TablePagination({
  page,
  totalPages,
  onPageChange,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-1">
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
        이전
      </Button>
      <span className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{page}</span> / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      >
        다음
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
