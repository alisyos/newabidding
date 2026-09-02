"use client";

// 헤더 네비게이션 — AGENTS 레지스트리에서 카테고리 그룹을 파생해 그린다.
//
// 기능이 늘어날수록 링크를 나란히 두면 가로가 넘치므로 카테고리 드롭다운으로 묶었다.
// 항목이 하나뿐인 카테고리는 드롭다운 없이 바로 링크로 노출한다 (클릭 한 번 절약).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_GROUPS } from "@/lib/agents";
import { cn } from "@/lib/utils";

const linkClass = (active: boolean) =>
  cn(
    "whitespace-nowrap text-sm transition-colors hover:text-gray-900",
    active ? "font-medium text-gray-900" : "text-gray-600"
  );

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 items-center justify-center gap-5">
      <Link href="/" className={linkClass(pathname === "/")}>
        Home
      </Link>

      {NAV_GROUPS.map((group) => {
        const [first] = group.items;

        if (group.items.length === 1) {
          return (
            <Link
              key={group.category}
              href={first.href}
              className={linkClass(pathname === first.href)}
            >
              {first.name}
            </Link>
          );
        }

        const groupActive = group.items.some((item) => item.href === pathname);

        return (
          <DropdownMenu key={group.category}>
            <DropdownMenuTrigger
              className={cn(
                linkClass(groupActive),
                "flex items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
            >
              {group.category}
              <ChevronDown className="h-4 w-4 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {group.items.map(({ id, href, name, description, icon: Icon }) => (
                <DropdownMenuItem key={id} asChild>
                  <Link href={href} className="items-start gap-2.5">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">{name}</span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {description}
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}

      {/* 크롤링 개발 의뢰 — AGENTS 파생이 아닌 영업용 랜딩페이지라 별도 링크로 둔다.
          (포인트 차감이 없어 AGENT_IDS / AGENTS 에 등록하지 않는다)
          좁은 화면에서는 카테고리 메뉴와 함께 가로가 넘치므로 lg 이상에서만 노출한다. */}
      <Link
        href="/crawling-service"
        className={cn(
          linkClass(pathname === "/crawling-service"),
          "hidden lg:inline"
        )}
      >
        크롤링 개발 의뢰
      </Link>
    </nav>
  );
}
