"use client";

import { useEffect, useState } from "react";

/**
 * 서버 렌더와 클라이언트 렌더가 갈릴 수 있는 UI를 게이트한다.
 *
 * - localStorage 복원값 (스토어가 skipHydration 이라 첫 렌더는 기본값)
 * - date-fns format() 처럼 런타임 로컬 타임존에 의존하는 출력
 *   (서버가 UTC, 브라우저가 KST 면 같은 시각이 9시간 어긋나 표시된다)
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
