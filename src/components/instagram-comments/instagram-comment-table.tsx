"use client";

import { MessageSquare } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TablePagination,
  usePagedItems,
} from "@/components/common/table-pagination";
import { cn } from "@/lib/utils";
import { formatSeoulDateTime } from "@/lib/youtube-monitoring";
import type { InstagramComment } from "@/types/instagram-comment";

const PAGE_SIZE = 20;

interface InstagramCommentTableProps {
  comments: InstagramComment[];
}

export function InstagramCommentTable({ comments }: InstagramCommentTableProps) {
  const { page, setPage, totalPages, pageItems } = usePagedItems(
    comments,
    PAGE_SIZE
  );

  if (comments.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 rounded-md border text-sm text-muted-foreground">
        <MessageSquare className="h-6 w-6 opacity-60" />
        수집된 댓글이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">구분</TableHead>
              <TableHead className="w-[160px]">사용자명</TableHead>
              <TableHead className="min-w-[280px]">내용</TableHead>
              <TableHead className="w-[150px]">작성일시</TableHead>
              <TableHead className="w-[90px] text-right">좋아요</TableHead>
              <TableHead className="w-[80px] text-right">답글</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((comment, index) => (
              <TableRow key={`${comment.username}-${index}`}>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      comment.commentType === "답글"
                        ? "bg-muted text-muted-foreground"
                        : "bg-fuchsia-50 text-fuchsia-700"
                    )}
                  >
                    {comment.commentType || "댓글"}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  <a
                    href={comment.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    @{comment.username}
                  </a>
                </TableCell>
                <TableCell className="text-sm">
                  <p className="line-clamp-2 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatSeoulDateTime(comment.createdAt) || comment.createdAt}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {comment.likes.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {comment.replyCount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
