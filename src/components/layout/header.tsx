import Link from 'next/link'
import { Settings } from 'lucide-react'
import { HeaderNav } from '@/components/layout/header-nav'
import { PointsBadge } from '@/components/layout/points-badge'
import { UserSwitcher } from '@/components/layout/user-switcher'

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* 로고 영역 */}
        <div className="flex items-center space-x-2">
          <Link href="/" className="text-xl font-bold text-gray-900">
            지피티코리아
          </Link>
        </div>

        {/* 네비게이션 메뉴 — 목록은 src/lib/agents.ts 의 AGENTS 에서 파생된다 */}
        <HeaderNav />

        {/* 오른쪽: 사용자 전환 + 포인트 잔액 + 관리자 */}
        <div className="flex shrink-0 items-center gap-3">
          <UserSwitcher />
          <PointsBadge />
          <Link
            href="/admin"
            className="flex items-center gap-1 whitespace-nowrap text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Settings className="h-4 w-4" />
            관리자
          </Link>
        </div>
      </div>
    </header>
  )
}