"use client";

import { Trash2, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { POINT_PER_KEYWORD } from "@/store/points";
import type { RegisteredKeyword } from "@/types/keyword";

interface RegisteredListProps {
  items: RegisteredKeyword[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onRegister: () => void;
}

export function RegisteredList({
  items,
  onRemove,
  onClear,
  onRegister,
}: RegisteredListProps) {
  const cost = items.length * POINT_PER_KEYWORD;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          등록 대기 키워드{" "}
          <span className="font-semibold text-foreground">{items.length}</span>개
          <span className="ml-2 text-muted-foreground">
            · 수집 등록 시{" "}
            <span className="font-semibold text-amber-600">
              {cost.toLocaleString()}P
            </span>{" "}
            차감 (키워드당 {POINT_PER_KEYWORD}P)
          </span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClear}>
            전체 삭제
          </Button>
          <Button size="sm" onClick={onRegister} className="gap-1.5">
            <FolderPlus className="h-4 w-4" />
            수집 등록
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <div className="max-h-80 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-16">번호</TableHead>
                <TableHead>키워드</TableHead>
                <TableHead className="w-28 text-center">목표 순위</TableHead>
                <TableHead className="w-20 text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">{item.keyword}</TableCell>
                  <TableCell className="text-center">
                    {item.targetRank}위
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(item.id)}
                      aria-label="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
