"use client";

import { Coins } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { useCurrentBalance } from "@/store/points";

/** 헤더 우측에 현재 사용자의 포인트 잔액을 상시 표시 */
export function PointsBadge() {
  const balance = useCurrentBalance();

  // localStorage 복원 전에는 기본 잔액이 잠깐 보이므로 마운트 후에만 값을 노출한다
  const mounted = useMounted();

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-gray-50 px-3 py-1 text-sm font-semibold text-gray-800">
      <Coins className="h-4 w-4 text-amber-500" />
      {mounted ? balance.toLocaleString() : "—"}
      <span className="text-xs font-normal text-gray-500">P</span>
    </div>
  );
}
