"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { VIDEO_SORT_LABEL, VIDEO_TYPE_LABEL } from "@/lib/youtube-monitoring";
import type { VideoSortBy, VideoTypeFilter } from "@/types/youtube-monitoring";

const FILTERS: VideoTypeFilter[] = ["all", "video", "shorts"];
const SORTS: VideoSortBy[] = ["viewCount", "date", "likeCount", "commentCount"];

interface YoutubeFilterBarProps {
  total: number;
  videoCount: number;
  shortsCount: number;
  /** 현재 필터가 적용된 결과 수 (CSV 버튼 라벨용) */
  visibleCount: number;
  filter: VideoTypeFilter;
  onFilterChange: (filter: VideoTypeFilter) => void;
  sortBy: VideoSortBy;
  onSortChange: (sortBy: VideoSortBy) => void;
  onDownloadCsv: () => void;
}

export function YoutubeFilterBar({
  total,
  videoCount,
  shortsCount,
  visibleCount,
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  onDownloadCsv,
}: YoutubeFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        총 <span className="font-semibold text-foreground">{total}</span>건 · 일반영상{" "}
        <span className="font-medium text-sky-700">{videoCount}</span>건 · Shorts{" "}
        <span className="font-medium text-rose-700">{shortsCount}</span>건
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {/* 구분 필터 탭 */}
        <div className="inline-flex rounded-md border p-1">
          {FILTERS.map((key) => (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              className={cn(
                "rounded px-3 py-1 text-sm font-medium transition-colors",
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {VIDEO_TYPE_LABEL[key]}
            </button>
          ))}
        </div>

        {/* 정렬 */}
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as VideoSortBy)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue>{VIDEO_SORT_LABEL[sortBy]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((key) => (
              <SelectItem key={key} value={key}>
                {VIDEO_SORT_LABEL[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onDownloadCsv}
          disabled={visibleCount === 0}
        >
          <Download className="h-4 w-4" />
          CSV 다운로드 ({visibleCount})
        </Button>
      </div>
    </div>
  );
}
