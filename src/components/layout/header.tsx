import Link from 'next/link'
import { PointsBadge } from '@/components/layout/points-badge'

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

        {/* 네비게이션 메뉴 */}
        <nav className="flex items-center space-x-6 flex-1 justify-center">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Home
          </Link>
          <Link
            href="/keyword-expansion"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            쇼핑몰 키워드 확장
          </Link>
          <Link
            href="/search-keyword-expansion"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            검색엔진 키워드 확장
          </Link>
        </nav>
        
        {/* 오른쪽: 포인트 잔액 */}
        <div className="flex items-center">
          <PointsBadge />
        </div>
      </div>
    </header>
  )
}