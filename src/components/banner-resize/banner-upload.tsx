"use client";

import { useRef, useState } from "react";
import { AlertCircle, ImageUp, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { readSourceFile } from "@/lib/banner-canvas";
import {
  ACCEPTED_EXT,
  MAX_SOURCE_EDGE,
  MAX_UPLOAD_BYTES,
  formatBytes,
  formatRatio,
} from "@/lib/banner-resize-spec";
import { cn } from "@/lib/utils";
import type { BannerSource } from "@/types/banner-resize";

interface BannerUploadProps {
  value: BannerSource | null;
  onChange: (source: BannerSource | null) => void;
  disabled?: boolean;
  error?: string;
}

/**
 * 원본 배너 업로드 — 드래그&드롭 + 파일 선택.
 * 업로드 즉시 크기·용량·포맷·비율·투명배경을 확인해 보여준다. (기획서 4.1)
 */
export function BannerUpload({
  value,
  onChange,
  disabled,
  error,
}: BannerUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [reading, setReading] = useState(false);

  const accept = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setMessage("");
    try {
      const source = await readSourceFile(file);
      onChange(source);
      if (source.downscaled) {
        setMessage(
          `원본이 커서 긴 변 ${MAX_SOURCE_EDGE}px 로 줄여 사용합니다. (${source.width}×${source.height})`
        );
      }
    } catch (e) {
      onChange(null);
      setMessage(e instanceof Error ? e.message : "이미지를 읽지 못했습니다.");
    } finally {
      setReading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 같은 파일 재선택이 가능하도록 항상 초기화한다
    e.target.value = "";
    void accept(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    void accept(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-3">
      {!value ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-input bg-muted/40",
            disabled && "opacity-60"
          )}
        >
          <ImageUp className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              원본 배너를 여기에 끌어다 놓으세요
            </p>
            <p className="text-xs text-muted-foreground">
              JPG · PNG · WEBP · 최대 {formatBytes(MAX_UPLOAD_BYTES)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || reading}
            onClick={() => inputRef.current?.click()}
          >
            {reading ? "읽는 중..." : "파일 선택"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-lg border bg-background p-4 sm:flex-row">
          <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-md bg-[linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%,transparent_75%,hsl(var(--muted))_75%),linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%,transparent_75%,hsl(var(--muted))_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.dataUrl}
              alt="원본 배너 미리보기"
              className="max-h-[200px] max-w-full object-contain"
            />
          </div>

          <dl className="w-full shrink-0 space-y-1.5 text-xs sm:w-64">
            <Row label="파일명" value={value.fileName} />
            <Row label="해상도" value={`${value.width} × ${value.height} px`} />
            <Row label="비율" value={formatRatio(value.width, value.height)} />
            <Row label="용량" value={formatBytes(value.byteSize)} />
            <Row
              label="포맷"
              value={value.mimeType.replace("image/", "").toUpperCase()}
            />
            <Row label="투명 배경" value={value.hasAlpha ? "있음" : "없음"} />

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={disabled || reading}
                onClick={() => inputRef.current?.click()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                교체
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                disabled={disabled}
                onClick={() => {
                  onChange(null);
                  setMessage("");
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                제거
              </Button>
            </div>
          </dl>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXT}
        className="hidden"
        onChange={handleInput}
      />

      {message && (
        <p className="text-xs font-medium text-foreground">{message}</p>
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-all font-medium">{value}</dd>
    </div>
  );
}
