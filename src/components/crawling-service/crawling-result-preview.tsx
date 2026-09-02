// 산출물 목업 3종.
//
// 실제 수집 결과 스크린샷을 아직 확보하지 못했고, 기획서가 추상 일러스트를 금지했으므로
// CSS 로 실제 산출물 형태를 그린다. 이미지 파일을 추가하지 않아 로딩 비용도 없다.
// 실제 캡처가 확보되면 각 컴포넌트를 <Image /> 로 교체하면 된다.

import { ArrowDown, ArrowUp } from "lucide-react";

const SHEET_COLUMNS = ["상품명", "판매가", "재고", "리뷰수", "수집시각"];

const SHEET_ROWS: {
  name: string;
  price: string;
  stock: string;
  reviews: string;
  at: string;
  trend?: "up" | "down";
}[] = [
  { name: "무선 청소기 A1", price: "289,000", stock: "재고", reviews: "1,284", at: "09:00", trend: "down" },
  { name: "무선 청소기 B2", price: "312,000", stock: "재고", reviews: "874", at: "09:00" },
  { name: "핸디 청소기 C3", price: "119,000", stock: "품절", reviews: "2,033", at: "09:00" },
  { name: "물걸레 청소기 D4", price: "245,000", stock: "재고", reviews: "651", at: "09:00", trend: "up" },
  { name: "스틱 청소기 E5", price: "398,000", stock: "재고", reviews: "1,507", at: "09:00" },
  { name: "로봇 청소기 F6", price: "529,000", stock: "재고", reviews: "3,192", at: "09:00", trend: "down" },
  { name: "차량용 청소기 G7", price: "64,900", stock: "재고", reviews: "418", at: "09:00" },
];

/** 히어로 우측 주력 비주얼 — 수집 결과 엑셀 시트 */
export function ExcelSheetMock() {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/10">
      {/* 창 크롬 */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 truncate text-xs text-slate-500">
          경쟁사_가격_20260901.xlsx
        </span>
      </div>

      <div className="relative">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            {/* 스프레드시트 열 머리글 */}
            <tr className="bg-slate-100 text-[10px] text-slate-400">
              <th className="w-8 border border-slate-200 py-1 text-center font-normal" />
              {["A", "B", "C", "D", "E"].map((col) => (
                <th
                  key={col}
                  className="border border-slate-200 py-1 text-center font-normal"
                >
                  {col}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50 text-[11px] font-medium text-slate-700">
              <th className="border border-slate-200 py-1.5 text-center text-[10px] font-normal text-slate-400">
                1
              </th>
              {SHEET_COLUMNS.map((col) => (
                <th key={col} className="border border-slate-200 px-2 py-1.5">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[11px] text-slate-700">
            {SHEET_ROWS.map((row, index) => (
              <tr key={row.name}>
                <td className="border border-slate-200 bg-slate-50 py-1.5 text-center text-[10px] text-slate-400">
                  {index + 2}
                </td>
                <td className="truncate border border-slate-200 px-2 py-1.5">
                  {row.name}
                </td>
                <td className="border border-slate-200 px-2 py-1.5 text-right tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    {row.trend === "down" && (
                      <ArrowDown className="h-3 w-3 text-red-500" />
                    )}
                    {row.trend === "up" && (
                      <ArrowUp className="h-3 w-3 text-emerald-600" />
                    )}
                    {row.price}
                  </span>
                </td>
                <td className="border border-slate-200 px-2 py-1.5">
                  <span
                    className={
                      row.stock === "품절"
                        ? "rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600"
                        : "rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700"
                    }
                  >
                    {row.stock}
                  </span>
                </td>
                <td className="border border-slate-200 px-2 py-1.5 text-right tabular-nums">
                  {row.reviews}
                </td>
                <td className="border border-slate-200 px-2 py-1.5 text-right tabular-nums text-slate-500">
                  {row.at}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* 행이 더 있다는 암시 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* 시트 탭 */}
      <div className="flex items-center gap-1 border-t border-slate-200 bg-slate-100 px-2 py-1.5">
        <span className="rounded-t border-x border-t border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-emerald-700">
          가격추이
        </span>
        <span className="px-2 py-1 text-[10px] text-slate-400">원본데이터</span>
      </div>
    </div>
  );
}

const SLACK_LINES = [
  { name: "무선 청소기 A1", change: "289,000 → 265,000", rate: "-8.3%" },
  { name: "로봇 청소기 F6", change: "529,000 → 499,000", rate: "-5.7%" },
  { name: "핸디 청소기 C3", change: "재고 있음 → 품절", rate: "품절" },
];

/** S5 알림 항목 — 슬랙 메시지 */
export function SlackAlertMock() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="h-8 w-8 shrink-0 rounded-md bg-blue-600 text-center text-sm font-bold leading-8 text-white">
          가
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-900">가격 알림</span>
            <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-500">
              앱
            </span>
            <span className="text-[10px] text-slate-400">오전 9:00</span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">
            가격 변동 3건이 감지되었습니다
          </p>
          <ul className="mt-2 space-y-1.5 border-l-2 border-blue-500 pl-3">
            {SLACK_LINES.map((line) => (
              <li key={line.name} className="text-xs text-slate-600">
                <span className="font-medium text-slate-800">{line.name}</span>
                <span className="mx-1.5 text-slate-400">·</span>
                <span className="tabular-nums">{line.change}</span>
                <span className="ml-1.5 rounded bg-red-50 px-1 py-0.5 text-[10px] font-medium text-red-600">
                  {line.rate}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const BAR_HEIGHTS = [42, 58, 35, 71, 64, 88, 52, 76, 61, 94];

/** S5 대시보드 항목 — 순수 장식이라 차트 라이브러리를 쓰지 않는다 */
export function DashboardMock() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-3 gap-2">
        {[
          { value: "12,480", label: "수집 건수" },
          { value: "99.2%", label: "성공률" },
          { value: "09:00", label: "최근 실행" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-md bg-slate-50 p-2 text-center">
            <p className="text-sm font-bold tabular-nums text-slate-900">
              {stat.value}
            </p>
            <p className="text-[10px] text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-20 items-end gap-1.5" aria-hidden>
        {BAR_HEIGHTS.map((height, index) => (
          <div
            key={index}
            style={{ height: `${height}%` }}
            className="flex-1 rounded-t-sm bg-blue-500/80"
          />
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-slate-400">
        최근 10일 일별 수집 건수
      </p>
    </div>
  );
}
