"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface IndividualFormProps {
  /** 현재 등록된 개수 */
  count: number;
  /** 최대 등록 개수 */
  max: number;
  onAdd: (keyword: string, targetRank: number) => void;
}

export function IndividualForm({ count, max, onAdd }: IndividualFormProps) {
  const [keyword, setKeyword] = useState("");
  const [targetRank, setTargetRank] = useState("1");
  const [error, setError] = useState("");

  const isFull = count >= max;

  const handleAdd = () => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setError("키워드를 입력해주세요.");
      return;
    }
    if (isFull) {
      setError(`최대 ${max}개까지 등록할 수 있습니다.`);
      return;
    }
    const rank = Math.max(1, parseInt(targetRank, 10) || 1);
    onAdd(trimmed, rank);
    setKeyword("");
    setTargetRank("1");
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="kw-keyword">키워드</Label>
          <Input
            id="kw-keyword"
            placeholder="예: 삼성갤럭시"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isFull}
          />
        </div>
        <div className="w-full space-y-2 sm:w-32">
          <Label htmlFor="kw-rank">목표 순위</Label>
          <Input
            id="kw-rank"
            type="number"
            min={1}
            value={targetRank}
            onChange={(e) => setTargetRank(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isFull}
          />
        </div>
        <Button onClick={handleAdd} disabled={isFull} className="gap-1.5">
          <Plus className="h-4 w-4" />
          추가
        </Button>
      </div>

      <div className="flex items-center justify-between text-sm">
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          <span className="text-muted-foreground">
            키워드와 목표순위를 입력한 뒤 추가하세요. (Enter 키로도 추가)
          </span>
        )}
        <span
          className={
            isFull ? "font-medium text-destructive" : "text-muted-foreground"
          }
        >
          {count} / {max}
        </span>
      </div>
    </div>
  );
}
