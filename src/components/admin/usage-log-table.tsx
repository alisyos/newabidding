"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMounted } from "@/hooks/use-mounted";
import { agentName } from "@/lib/agents";
import { USERS, userName, userTeam } from "@/lib/users";
import { cn } from "@/lib/utils";
import { MAX_LOGS_PER_USER, usePointsStore } from "@/store/points";
import type { PointLog } from "@/types/points";
import type { UserId } from "@/types/user";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

const PAGE_SIZE = 10;

type TypeFilter = "all" | PointLog["type"];
type UserFilter = "all" | UserId;

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "use", label: "사용" },
  { key: "charge", label: "충전·조정" },
  { key: "reset", label: "초기화" },
];

/** 구분 배지 */
function TypeBadge({ type }: { type: PointLog["type"] }) {
  const style =
    type === "use"
      ? "bg-amber-50 text-amber-700"
      : type === "charge"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-muted text-muted-foreground";
  const label = type === "use" ? "사용" : type === "charge" ? "충전" : "초기화";

  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", style)}>
      {label}
    </span>
  );
}

/** 사용자별 포인트 사용·충전 내역 테이블 */
export function UsageLogTable() {
  const logs = usePointsStore((s) => s.logs);
  const clearLogs = usePointsStore((s) => s.clearLogs);

  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);
  const [confirmClear, setConfirmClear] = useState(false);

  // 일시 표시가 런타임 로컬 타임존에 의존하므로 마운트 후에만 렌더한다
  const mounted = useMounted();

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        if (userFilter !== "all" && log.userId !== userFilter) return false;
        // all 을 뺀 모든 키가 PointLog["type"] 과 1:1로 대응한다
        if (typeFilter !== "all" && log.type !== typeFilter) return false;
        return true;
      }),
    [logs, userFilter, typeFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // 삭제/필터로 총 페이지 수가 줄면 현재 페이지를 보정
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // 필터를 바꾸면 첫 페이지로 (사용자 필터도 반드시 포함해야 빈 화면이 안 뜬다)
  useEffect(() => {
    setPage(1);
  }, [userFilter, typeFilter]);

  const start = (page - 1) * PAGE_SIZE;
  const pageLogs = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* 사용자 필터 — 옵션이 6개라 토글 대신 Select */}
          <Select
            value={userFilter}
            onValueChange={(v) => setUserFilter(v as UserFilter)}
          >
            <SelectTrigger className="h-9 w-[180px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">사용자 전체</SelectItem>
              {USERS.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} · {u.team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 유형 필터 — 짧은 라벨 3개라 버튼 토글 유지 */}
          <div className="inline-flex rounded-md border p-1">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={cn(
                  "rounded px-3 py-1 text-sm font-medium transition-colors",
                  typeFilter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setConfirmClear(true)}
          disabled={logs.length === 0}
        >
          <Trash2 className="h-4 w-4" />
          내역 비우기
        </Button>
      </div>

      {!mounted ? (
        <div className="h-64 animate-pulse rounded-md border bg-muted/30" />
      ) : filtered.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-1 rounded-md border text-sm text-muted-foreground">
          <History className="h-6 w-6 opacity-60" />
          {logs.length === 0
            ? "아직 포인트 사용 내역이 없습니다."
            : "해당 조건의 내역이 없습니다."}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">일시</TableHead>
                  <TableHead className="w-32">사용자</TableHead>
                  <TableHead className="w-20 text-center">구분</TableHead>
                  <TableHead className="w-44">기능</TableHead>
                  <TableHead>내역</TableHead>
                  <TableHead className="w-28 text-right">증감</TableHead>
                  <TableHead className="w-28 text-right">잔액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(log.at), "yyyy.MM.dd HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{userName(log.userId)}</div>
                      <div className="text-xs text-muted-foreground">
                        {userTeam(log.userId)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <TypeBadge type={log.type} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.agentId ? agentName(log.agentId) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.detail || "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold",
                        // 0 을 초록색 "+0P" 로 보여주면 늘어난 것처럼 읽힌다.
                        // 초기화 기록과 단가 0(무료) 사용 기록이 여기에 해당한다.
                        log.amount === 0
                          ? "text-muted-foreground"
                          : log.amount > 0
                            ? "text-emerald-600"
                            : "text-destructive"
                      )}
                    >
                      {log.amount > 0 ? "+" : ""}
                      {log.amount.toLocaleString()}P
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {log.balanceAfter.toLocaleString()}P
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

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
        </>
      )}

      <p className="text-xs text-muted-foreground">
        사용자당 최근 {MAX_LOGS_PER_USER}건까지 보관됩니다.
      </p>

      <ConfirmDialog
        open={confirmClear}
        title="사용 내역을 비울까요?"
        description="기록된 포인트 사용·충전 내역이 모두 삭제됩니다. 샘플 내역도 되살아나지 않으며, 잔액과 단가는 유지됩니다."
        confirmLabel="비우기"
        onClose={() => setConfirmClear(false)}
        onConfirm={() => {
          clearLogs();
          setConfirmClear(false);
          toast.success("사용 내역을 비웠습니다.");
        }}
      />
    </div>
  );
}
