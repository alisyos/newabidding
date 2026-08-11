"use client";

// 인스타그램 세션 만료 안내.
//
// 세션 쿠키는 수 일~수 주 안에 만료되고, 만료되면 댓글이 한 건도 수집되지 않는다.
// 실질적으로 가장 자주 마주치는 실패라서 대처 방법을 화면에 그대로 적어 둔다.

import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionExpiredNoticeProps {
  /** 미설정·만료 등 구체적인 사유 (서버가 내려준 문구) */
  message?: string | null;
  onRetry: () => void;
}

export function SessionExpiredNotice({
  message,
  onRetry,
}: SessionExpiredNoticeProps) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-900">
            인스타그램 로그인이 필요합니다
          </p>
          <p className="text-sm text-amber-800">
            {message ??
              "서버에 저장된 로그인 쿠키가 유효하지 않습니다. 쿠키를 갱신한 뒤 다시 시도해주세요."}
          </p>

          <details className="text-sm text-amber-800">
            <summary className="cursor-pointer font-medium">쿠키 갱신 방법</summary>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-relaxed">
              <li>브라우저에서 인스타그램에 로그인합니다.</li>
              <li>
                개발자 도구(F12) → Application → Cookies →{" "}
                <code className="rounded bg-amber-100 px-1">
                  https://www.instagram.com
                </code>{" "}
                를 엽니다.
              </li>
              <li>
                <code className="rounded bg-amber-100 px-1">sessionid</code>,{" "}
                <code className="rounded bg-amber-100 px-1">csrftoken</code>,{" "}
                <code className="rounded bg-amber-100 px-1">ds_user_id</code> 값을
                복사합니다.
              </li>
              <li>
                프로젝트의{" "}
                <code className="rounded bg-amber-100 px-1">.env.local</code> 에{" "}
                <code className="rounded bg-amber-100 px-1">INSTAGRAM_COOKIES</code>{" "}
                를 JSON 배열로 넣습니다.
                <pre className="mt-1 overflow-x-auto rounded bg-amber-100 p-2 text-[11px]">
                  {`INSTAGRAM_COOKIES=[{"name":"sessionid","value":"...","domain":".instagram.com","path":"/"}]`}
                </pre>
              </li>
              <li>개발 서버를 재시작합니다.</li>
            </ol>
            <p className="mt-2 text-xs text-amber-700">
              sessionid 는 계정 접근 권한 그 자체입니다. 저장소에 커밋하지 마세요.
            </p>
          </details>

          <Button variant="outline" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      </div>
    </div>
  );
}
