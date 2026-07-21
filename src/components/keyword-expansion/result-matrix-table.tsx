"use client";

import { cn } from "@/lib/utils";
import { MALLS, MALL_KEYS } from "@/lib/keyword-mock";
import { formatNumber, formatCtr } from "@/lib/keyword-csv";
import type { KeywordResult, MallKey, Metrics } from "@/types/keyword";

interface ResultMatrixTableProps {
  results: KeywordResult[];
}

const METRIC_LABELS = ["노출수", "클릭수", "CTR", "CPC", "광고비"];

function Flag({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "font-semibold",
        on ? "text-emerald-600" : "text-gray-300"
      )}
    >
      {on ? "O" : "X"}
    </span>
  );
}

function metricValues(m: Metrics): string[] {
  return [
    formatNumber(m.impressions),
    formatNumber(m.clicks),
    formatCtr(m.ctr),
    formatNumber(m.cpc),
    formatNumber(m.cost),
  ];
}

export function ResultMatrixTable({ results }: ResultMatrixTableProps) {
  const th = "border px-2 py-1.5 text-center text-xs font-medium whitespace-nowrap";
  const td = "border px-2 py-1.5 text-center text-xs whitespace-nowrap";

  return (
    <div className="w-full overflow-auto rounded-md border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th className={cn(th, "sticky left-0 z-10 bg-muted/60")} rowSpan={2}>
              키워드
            </th>
            <th className={th} rowSpan={2}>
              연관 키워드
            </th>
            <th className={cn(th, "bg-primary/5")} colSpan={MALL_KEYS.length}>
              자동 완성 검색어
            </th>
            <th className={th} colSpan={MALL_KEYS.length}>
              연관 검색어
            </th>
            <th className={th} rowSpan={2}>
              목표 순위
            </th>
            <th className={cn(th, "bg-primary/5")} colSpan={5}>
              PC
            </th>
            <th className={th} colSpan={5}>
              모바일
            </th>
          </tr>
          <tr>
            {MALLS.map((m) => (
              <th key={`auto-${m.key}`} className={cn(th, "bg-primary/5")}>
                {m.label}
              </th>
            ))}
            {MALLS.map((m) => (
              <th key={`rel-${m.key}`} className={th}>
                {m.label}
              </th>
            ))}
            {METRIC_LABELS.map((l) => (
              <th key={`pc-${l}`} className={cn(th, "bg-primary/5")}>
                {l}
              </th>
            ))}
            {METRIC_LABELS.map((l) => (
              <th key={`mo-${l}`} className={th}>
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.flatMap((result) =>
            result.terms.map((term, i) => (
              <tr key={`${result.keyword}-${term.term}`} className="hover:bg-muted/30">
                <td className={cn(td, "sticky left-0 z-10 bg-background font-medium")}>
                  {i === 0 ? result.keyword : ""}
                </td>
                <td className={cn(td, "text-left font-medium")}>{term.term}</td>
                {MALL_KEYS.map((k: MallKey) => (
                  <td key={`a-${k}`} className={td}>
                    <Flag on={term.autocomplete[k]} />
                  </td>
                ))}
                {MALL_KEYS.map((k: MallKey) => (
                  <td key={`r-${k}`} className={td}>
                    <Flag on={term.related[k]} />
                  </td>
                ))}
                <td className={td}>{result.targetRank}</td>
                {metricValues(term.pc).map((v, idx) => (
                  <td key={`pc-${idx}`} className={cn(td, "text-right")}>
                    {v}
                  </td>
                ))}
                {metricValues(term.mobile).map((v, idx) => (
                  <td key={`mo-${idx}`} className={cn(td, "text-right")}>
                    {v}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
