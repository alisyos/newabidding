"use client";

import { useEffect } from "react";
import { usePointsStore } from "@/store/points";

/**
 * localStorage 에 저장된 포인트 상태를 마운트 후 1회 복원한다.
 *
 * 스토어가 skipHydration: true 이므로 서버와 클라이언트의 첫 렌더는
 * 항상 기본값으로 일치하고, 복원은 이 시점에만 일어난다.
 * (헤더의 PointsBadge 가 모든 페이지에 있어 hydration 불일치가 발생하는 것을 막는다)
 */
export function PointsHydrator() {
  useEffect(() => {
    void usePointsStore.persist.rehydrate();
  }, []);

  return null;
}
