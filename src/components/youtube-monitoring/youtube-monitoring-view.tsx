"use client";

import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AlertCircle, AlertTriangle, Youtube } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { YoutubeSearchForm } from "@/components/youtube-monitoring/youtube-search-form";
import { YoutubeFilterBar } from "@/components/youtube-monitoring/youtube-filter-bar";
import { YoutubeResultTable } from "@/components/youtube-monitoring/youtube-result-table";
import { downloadCsv } from "@/lib/keyword-csv";
import { safeFileName } from "@/lib/download-file";
import { buildYouTubeCsv } from "@/lib/youtube-csv";
import { fileDateStamp } from "@/lib/table-csv";
import {
  filterAndSortVideos,
  seoulDateString,
  validateSearchInput,
} from "@/lib/youtube-monitoring";
import { userName } from "@/lib/users";
import {
  useAgentPrice,
  useCurrentBalance,
  useCurrentUserId,
  usePointsStore,
} from "@/store/points";
import type {
  VideoSortBy,
  VideoTypeFilter,
  YouTubeMonitoringResponse,
  YouTubeSearchInput,
  YouTubeVideo,
} from "@/types/youtube-monitoring";

/**
 * 과금 대상 에이전트.
 *
 * [주의] 이 포인트 차감은 화면상의 표시일 뿐 실제 사용 제한이 아니다.
 * /api/youtube-monitoring 에는 인증이 없어 API 를 직접 호출하면 그대로 우회된다.
 */
const AGENT_ID = "youtube-monitoring" as const;

interface SearchInfo extends YouTubeSearchInput {
  total: number;
  /** 조회 상한에 걸려 결과가 잘렸는지 */
  capped: boolean;
}

export function YoutubeMonitoringView() {
  const [form, setForm] = useState<YouTubeSearchInput>(() => ({
    keyword: "",
    // 기본값은 "어제 하루" — 전날 올라온 영상을 아침에 확인하는 흐름을 가정한다
    startDate: seoulDateString(-1),
    endDate: seoulDateString(-1),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [searchInfo, setSearchInfo] = useState<SearchInfo | null>(null);
  const [filter, setFilter] = useState<VideoTypeFilter>("all");
  const [sortBy, setSortBy] = useState<VideoSortBy>("viewCount");

  const deduct = usePointsStore((s) => s.deduct);
  const balance = useCurrentBalance();
  const currentUserId = useCurrentUserId();
  const unitPrice = useAgentPrice(AGENT_ID);

  const patchForm = (patch: Partial<YouTubeSearchInput>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setErrors({});
  };

  const visibleVideos = useMemo(
    () => filterAndSortVideos(videos, filter, sortBy),
    [videos, filter, sortBy]
  );

  const shortsCount = useMemo(
    () => videos.filter((v) => v.isShorts).length,
    [videos]
  );

  const handleSearch = async () => {
    const validation = validateSearchInput(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    if (balance < unitPrice) {
      toast.error(
        `포인트가 부족합니다. (필요 ${unitPrice.toLocaleString()}P · 보유 ${balance.toLocaleString()}P) 관리자 페이지에서 충전해주세요.`
      );
      return;
    }

    // 비동기 중에 헤더에서 사용자를 바꿔도 시작 시점 사용자에게 과금한다
    const chargeUserId = currentUserId;

    setLoading(true);
    setApiError(null);
    setVideos([]);
    setSearchInfo(null);
    setFilter("all");
    setSortBy("viewCount");

    try {
      const response = await fetch("/api/youtube-monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        const message =
          payload?.error?.message ?? "영상을 불러오지 못했습니다.";
        setApiError(message);
        toast.error(message);
        return;
      }

      const result = payload as YouTubeMonitoringResponse;
      setVideos(result.videos);
      setSearchInfo({
        keyword: result.keyword,
        startDate: result.startDate,
        endDate: result.endDate,
        total: result.total,
        capped: result.capped,
      });

      if (result.total === 0) {
        // 결과가 없으면 과금하지 않는다 — 사용자가 받은 것이 없다
        toast.warn(
          "조건에 맞는 영상이 없습니다. 키워드나 기간을 바꿔 다시 검색해보세요."
        );
        return;
      }

      if (
        deduct({
          userId: chargeUserId,
          agentId: AGENT_ID,
          amount: unitPrice,
          detail: `"${result.keyword}" 영상 ${result.total}건`,
        })
      ) {
        toast.success(
          `영상 ${result.total}건 조회 완료 · ${userName(chargeUserId)}님 계정에서 ${unitPrice.toLocaleString()}P 차감되었습니다.`
        );
      } else {
        // 검색 결과는 이미 화면에 있으므로 지우지 않고 경고만 띄운다
        toast.error(
          "포인트가 부족해 차감하지 못했습니다. 관리자 페이지에서 충전해주세요."
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "영상을 불러오는 중 오류가 발생했습니다.";
      setApiError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!searchInfo || visibleVideos.length === 0) {
      toast.error("다운로드할 결과가 없습니다.");
      return;
    }

    downloadCsv(
      `youtube_monitoring_${safeFileName(searchInfo.keyword)}_${fileDateStamp()}.csv`,
      buildYouTubeCsv(visibleVideos, {
        keyword: searchInfo.keyword,
        startDate: searchInfo.startDate,
        endDate: searchInfo.endDate,
        capped: searchInfo.capped,
      })
    );
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-muted/20">
      <div className="container mx-auto space-y-6 px-4 py-8">
        {/* 페이지 헤더 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">유튜브 모니터링</h1>
          <p className="text-sm text-muted-foreground">
            키워드와 기간으로 유튜브 영상을 검색해 <b>조회수·좋아요·댓글수</b>를 한
            번에 확인하고, Shorts와 일반영상을 구분해 CSV로 내려받습니다.
          </p>
        </div>

        {/* 1. 검색 조건 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. 검색 조건</CardTitle>
            <CardDescription>
              키워드와 기간을 입력하면 해당 기간에 게시된 영상을 조회수 순으로
              가져옵니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <YoutubeSearchForm
              value={form}
              onChange={patchForm}
              onSubmit={handleSearch}
              errors={errors}
              loading={loading}
              unitPrice={unitPrice}
              balance={balance}
            />

            {apiError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{apiError}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. 검색 결과 */}
        {searchInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Youtube className="h-5 w-5" />
                2. 검색 결과
              </CardTitle>
              <CardDescription>
                &ldquo;{searchInfo.keyword}&rdquo; · {searchInfo.startDate} ~{" "}
                {searchInfo.endDate}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {searchInfo.capped && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    조회 상한에 걸려 조회수 상위 {searchInfo.total}건까지만
                    가져왔습니다. 해당 기간의 전체 영상 목록이 아닙니다. 더 많이
                    보려면 기간을 좁히거나 <code>YOUTUBE_SEARCH_PAGES</code> 값을
                    올려주세요.
                  </span>
                </div>
              )}
              <YoutubeFilterBar
                total={searchInfo.total}
                videoCount={videos.length - shortsCount}
                shortsCount={shortsCount}
                visibleCount={visibleVideos.length}
                filter={filter}
                onFilterChange={setFilter}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onDownloadCsv={handleDownloadCsv}
              />
              <YoutubeResultTable videos={visibleVideos} />
            </CardContent>
          </Card>
        )}

        {/* 안내 사항 */}
        <div className="rounded-md border bg-background p-4">
          <h2 className="mb-2 text-sm font-semibold">안내 사항</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              YouTube Data API v3를 사용하며, 조회수가 높은 순으로 가져옵니다. 기본
              설정에서는 한 번에 최대 100건까지만 조회하므로, 결과가 많은 키워드는
              전체 목록이 아닐 수 있습니다.
            </li>
            <li>날짜는 한국 시간(KST) 기준으로 해석합니다.</li>
            <li>
              60초 이하이거나 제목·설명·태그에 #shorts 가 있으면 Shorts로 분류합니다.
            </li>
            <li>
              API 할당량이 하루 단위로 제한되어 있어, 검색을 많이 하면 일시적으로
              조회가 막힐 수 있습니다.
            </li>
            <li>CSV는 현재 선택한 필터·정렬 상태 그대로 저장됩니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
