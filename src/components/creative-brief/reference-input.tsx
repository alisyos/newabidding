"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_REFERENCE_CHARS } from "@/lib/creative-brief-spec";
import { cn } from "@/lib/utils";

interface ReferenceInputProps {
  id: string;
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * 참조 자료 입력 — 붙여넣기 또는 텍스트 파일 업로드.
 * 프롬프트 길이를 통제하기 위해 MAX_REFERENCE_CHARS 를 넘는 부분은 잘라낸다.
 */
export function ReferenceInput({
  id,
  label,
  hint,
  placeholder,
  value,
  onChange,
}: ReferenceInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  const applyText = (text: string, source?: string) => {
    // BOM 제거 후 상한 적용
    const clean = text.replace(/^﻿/, "");
    const trimmed = clean.slice(0, MAX_REFERENCE_CHARS);
    onChange(trimmed);
    if (clean.length > MAX_REFERENCE_CHARS) {
      setMessage(
        `${source ? `“${source}” ` : ""}${MAX_REFERENCE_CHARS.toLocaleString()}자를 초과해 뒷부분을 잘랐습니다.`
      );
    } else if (source) {
      setMessage(`“${source}” 파일에서 ${trimmed.length.toLocaleString()}자를 불러왔습니다.`);
    } else {
      setMessage("");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 같은 파일 재선택이 가능하도록 항상 초기화한다
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => applyText(String(reader.result ?? ""), file.name);
    reader.onerror = () => setMessage("파일을 읽지 못했습니다.");
    reader.readAsText(file);
  };

  const over = value.length >= MAX_REFERENCE_CHARS;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        <span
          className={cn(
            "ml-auto text-xs",
            over ? "font-medium text-destructive" : "text-muted-foreground"
          )}
        >
          {value.length.toLocaleString()} / {MAX_REFERENCE_CHARS.toLocaleString()}
        </span>
      </div>

      <Textarea
        id={id}
        className="min-h-[120px]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => applyText(e.target.value)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="gap-1.5"
        >
          <FileUp className="h-4 w-4" />
          파일 불러오기
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.csv,.md"
          className="hidden"
          onChange={handleFile}
        />
        <span className="text-xs text-muted-foreground">
          .txt · .csv · .md 텍스트 파일
        </span>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              setMessage("");
            }}
          >
            지우기
          </Button>
        )}
      </div>

      {message && (
        <p className="text-xs font-medium text-foreground">{message}</p>
      )}
    </div>
  );
}
