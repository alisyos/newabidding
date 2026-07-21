"use client";

import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildTemplateCsv, downloadCsv } from "@/lib/keyword-csv";
import { SAMPLE_BULK_KEYWORDS } from "@/lib/keyword-mock";

interface BulkUploadProps {
  count: number;
  max: number;
  /** 여러 키워드를 한 번에 등록. 반환값은 실제로 추가된 개수 */
  onAddMany: (items: { keyword: string; targetRank: number }[]) => number;
}

export function BulkUpload({ count, max, onAddMany }: BulkUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  const handleTemplate = () => {
    downloadCsv("keyword_template.csv", buildTemplateCsv());
  };

  const parseCsv = (text: string) => {
    // BOM 제거 후 라인 파싱: "키워드,목표순위" 형태
    const clean = text.replace(/^﻿/, "");
    const lines = clean.split(/\r?\n/).filter((l) => l.trim());
    const items: { keyword: string; targetRank: number }[] = [];
    lines.forEach((line, idx) => {
      const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
      const kw = cols[0];
      if (!kw) return;
      // 헤더 행 스킵
      if (idx === 0 && (kw === "키워드" || kw.includes("키워드"))) return;
      const rank = Math.max(1, parseInt(cols[1], 10) || 1);
      items.push({ keyword: kw, targetRank: rank });
    });
    return items;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const finish = (items: { keyword: string; targetRank: number }[]) => {
      if (items.length === 0) {
        setMessage("등록할 키워드를 찾지 못했습니다. 양식을 확인해주세요.");
        return;
      }
      const added = onAddMany(items);
      const skipped = items.length - added;
      setMessage(
        `“${file.name}” 파일에서 ${added}개 등록되었습니다.` +
          (skipped > 0 ? ` (최대 ${max}개 초과 ${skipped}개 제외)` : "")
      );
    };

    if (file.name.toLowerCase().endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = () => finish(parseCsv(String(reader.result ?? "")));
      reader.readAsText(file);
    } else {
      // xlsx 등은 목업이므로 실제 파싱 대신 샘플 키워드 주입
      finish(SAMPLE_BULK_KEYWORDS.map((keyword) => ({ keyword, targetRank: 1 })));
    }

    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={handleTemplate} className="gap-1.5">
          <Download className="h-4 w-4" />
          양식 다운로드
        </Button>
        <Button onClick={() => inputRef.current?.click()} className="gap-1.5">
          <Upload className="h-4 w-4" />
          파일 등록
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFile}
        />
        <span className="text-sm text-muted-foreground">
          {count} / {max}
        </span>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
        <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p>
            양식 파일(키워드, 목표순위 2열)을 내려받아 작성한 뒤 등록하세요.
            최대 <span className="font-medium text-foreground">{max}개</span>까지
            등록할 수 있습니다.
          </p>
          {message && <p className="font-medium text-foreground">{message}</p>}
        </div>
      </div>
    </div>
  );
}
