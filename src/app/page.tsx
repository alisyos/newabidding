"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { AgentCard } from "@/components/home/agent-card";
import { AgentSearch } from "@/components/home/agent-search";

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const availableCount = AGENTS.filter((a) => a.status === "available").length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AGENTS.filter((a) => {
      if (category && a.category !== category) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, category]);

  return (
    <div className="min-h-[calc(100vh-65px)] bg-muted/20">
      <div className="container mx-auto space-y-8 px-4 py-8">
        {/* 히어로 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">AI 에이전트</h1>
          <p className="text-sm text-muted-foreground">
            쇼핑몰 운영에 필요한 작업을 자동화하는 에이전트 모음입니다. 필요한
            에이전트를 검색하고 바로 실행해보세요.
          </p>
          <p className="text-xs text-muted-foreground">
            전체{" "}
            <span className="font-semibold text-foreground">
              {AGENTS.length}
            </span>
            개 · 이용 가능{" "}
            <span className="font-semibold text-emerald-600">
              {availableCount}
            </span>
            개
          </p>
        </div>

        {/* 검색 + 카테고리 필터 */}
        <AgentSearch
          query={query}
          onQueryChange={setQuery}
          category={category}
          onCategoryChange={setCategory}
        />

        {/* 카드 그리드 */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-20 text-center">
            <SearchX className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">검색 결과가 없습니다.</p>
            <p className="text-xs text-muted-foreground">
              다른 검색어나 카테고리를 선택해보세요.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
