'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, Users, MessageSquare, Star, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const adminNav = [
  { href: '/admin', icon: LayoutDashboard, label: '대시보드' },
  { href: '/admin/products', icon: Package, label: '상품 관리' },
  { href: '/admin/orders', icon: ShoppingCart, label: '주문 관리' },
  { href: '/admin/members', icon: Users, label: '회원 관리' },
  { href: '/admin/consulting', icon: MessageSquare, label: '컨설팅 신청' },
  { href: '/admin/downloads', icon: Download, label: '다운로드 관리' },
  { href: '/admin/reviews', icon: Star, label: '리뷰 관리' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  // Auth guard: check if user is admin
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role !== 'admin') {
        router.replace('/')
        return
      }
      setAuthorized(true)
      setAuthChecked(true)
    }
    checkAuth()
  }, [router])

  if (!authChecked || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">권한 확인 중...</span>
        </div>
      </div>
    )
  }

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('admin-sidebar-collapsed', String(next))
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-[#0B1629] text-white flex flex-col shrink-0 transition-all duration-300 relative`}>
        {/* Toggle button */}
        <button
          onClick={toggle}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#0B1629] border-2 border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500 transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Header */}
        <div className={`${collapsed ? 'p-3' : 'p-6'} border-b border-white/10 transition-all duration-300`}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 text-sm text-blue-300 hover:text-white mb-4">
              <ArrowLeft className="w-4 h-4" /> 사이트로 돌아가기
            </Link>
          )}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">PS</span>
            </div>
            {!collapsed && (
              <div>
                <p className="font-bold text-sm">프리세일즈</p>
                <p className="text-[10px] text-blue-300">관리자</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className={`flex-1 ${collapsed ? 'p-2' : 'p-4'} space-y-1 transition-all duration-300`}>
          {adminNav.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Collapse hint */}
        {collapsed && (
          <div className="p-2 border-t border-white/10">
            <Link href="/" title="사이트로 돌아가기" className="flex items-center justify-center py-2 text-gray-500 hover:text-blue-300 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        )}
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
