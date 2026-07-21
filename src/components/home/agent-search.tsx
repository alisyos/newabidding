"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/agents";

interface AgentSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  category: string | null;
  onCategoryChange: (value: string | null) => void;
}

export function AgentSearch({
  query,
  onQueryChange,
  category,
  onCategoryChange,
}: AgentSearchProps) {
  return (
    <div className="space-y-3">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="에이전트 이름, 설명, 태그로 검색"
          className="pl-9 pr-9"
          aria-label="에이전트 검색"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="검색어 지우기"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[null, ...CATEGORIES].map((c) => (
          <button
            key={c ?? "all"}
            type="button"
            onClick={() => onCategoryChange(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              category === c
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            {c ?? "전체"}
          </button>
        ))}
      </div>
    </div>
  );
}
