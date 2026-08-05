"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMounted } from "@/hooks/use-mounted";
import { USERS, isUserId, userInitial, userOf } from "@/lib/users";
import { usePointsStore } from "@/store/points";

/**
 * 헤더의 현재 사용자 전환 드롭다운 (목업 — 실제 인증은 없다).
 * 여기서 선택한 사용자의 잔액이 표시되고, 기능 사용 시 그 사용자에게 차감된다.
 */
export function UserSwitcher() {
  const currentUserId = usePointsStore((s) => s.currentUserId);
  const setCurrentUser = usePointsStore((s) => s.setCurrentUser);
  const mounted = useMounted();

  const user = userOf(currentUserId);

  return (
    <Select
      value={currentUserId}
      onValueChange={(value) => {
        if (isUserId(value)) setCurrentUser(value);
      }}
      // 복원 전에는 기본 사용자가 잠깐 보이므로 조작을 막아 오차감을 방지한다
      disabled={!mounted}
    >
      <SelectTrigger className="h-9 w-[168px] gap-2 bg-white text-sm">
        {/*
          SelectItem 의 children 은 트리거에도 그대로 복제 렌더된다.
          아래 목록은 2줄 마크업이라 그대로 두면 트리거 높이가 깨지므로,
          SelectValue 에 children 을 직접 주어 트리거 표시를 분리한다.
        */}
        <SelectValue>
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {userInitial(user.id)}
            </span>
            <span className="truncate font-medium">{user.name}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="w-[240px]">
        {USERS.map((u) => (
          <SelectItem key={u.id} value={u.id} className="py-2">
            <div className="min-w-0">
              <div className="font-medium">
                {u.name}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {u.team}
                </span>
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {u.email}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
