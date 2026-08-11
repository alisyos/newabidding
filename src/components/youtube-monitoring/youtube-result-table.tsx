"use client";

import { Video } from "lucide-react";
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
import { VideoTypeBadge } from "@/components/youtube-monitoring/video-type-badge";
import type { YouTubeVideo } from "@/types/youtube-monitoring";

const PAGE_SIZE = 20;

interface YoutubeResultTableProps {
  /** 이미 필터·정렬이 적용된 목록 */
  videos: YouTubeVideo[];
}

export function YoutubeResultTable({ videos }: YoutubeResultTableProps) {
  const { page, setPage, totalPages, pageItems } = usePagedItems(
    videos,
    PAGE_SIZE
  );

  if (videos.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 rounded-md border text-sm text-muted-foreground">
        <Video className="h-6 w-6 opacity-60" />
        조건에 맞는 영상이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[96px]">구분</TableHead>
              <TableHead className="min-w-[260px]">제목</TableHead>
              <TableHead className="min-w-[140px]">채널</TableHead>
              <TableHead className="w-[150px]">등록일</TableHead>
              <TableHead className="w-[96px] text-right">재생시간</TableHead>
              <TableHead className="w-[110px] text-right">조회수</TableHead>
              <TableHead className="w-[96px] text-right">좋아요</TableHead>
              <TableHead className="w-[88px] text-right">댓글수</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((video) => (
              <TableRow key={video.videoId}>
                <TableCell>
                  <VideoTypeBadge isShorts={video.isShorts} />
                </TableCell>
                <TableCell>
                  <a
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={video.title}
                    className="line-clamp-2 font-medium hover:underline"
                  >
                    {video.title}
                  </a>
                </TableCell>
                <TableCell>
                  <a
                    href={video.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    {video.channelTitle}
                  </a>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {video.publishedAtFormatted}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                  {video.durationFormatted}
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {video.viewCount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {video.likeCount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {video.commentCount.toLocaleString()}
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
