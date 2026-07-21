"use client";

import { Coins } from "lucide-react";
import { usePointsStore } from "@/store/points";

/** 헤더 우측에 현재 포인트 잔액을 상시 표시 */
export function PointsBadge() {
  const balance = usePointsStore((s) => s.balance);

  return (
    <div className="flex items-center gap-1.5 rounded-full border bg-gray-50 px-3 py-1 text-sm font-semibold text-gray-800">
      <Coins className="h-4 w-4 text-amber-500" />
      {balance.toLocaleString()}
      <span className="text-xs font-normal text-gray-500">P</span>
    </div>
  );
}
