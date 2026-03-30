'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, Users, MessageSquare, ArrowLeft } from 'lucide-react'

const adminNav = [
  { href: '/admin', icon: LayoutDashboard, label: '대시보드' },
  { href: '/admin/products', icon: Package, label: '상품 관리' },
  { href: '/admin/orders', icon: ShoppingCart, label: '주문 관리' },
  { href: '/admin/members', icon: Users, label: '회원 관리' },
  { href: '/admin/consulting', icon: MessageSquare, label: '컨설팅 신청' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0B1629] text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 text-sm text-blue-300 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> 사이트로 돌아가기
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">PS</span>
            </div>
            <div>
              <p className="font-bold text-sm">프리세일즈</p>
              <p className="text-[10px] text-blue-300">관리자</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {adminNav.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
