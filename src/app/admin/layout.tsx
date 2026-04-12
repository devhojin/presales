'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, Users, MessageSquare, MessageCircle, Star, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Download, BarChart3, Menu, X, Settings, Tag, HelpCircle, Link2, Megaphone, Rss, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type NavItem = { href: string; icon: typeof LayoutDashboard; label: string } | { divider: true; label: string }

const adminNav: NavItem[] = [
  // 핵심
  { href: '/admin', icon: LayoutDashboard, label: '대시보드' },
  { href: '/admin/products', icon: Package, label: '상품 관리' },
  { href: '/admin/orders', icon: ShoppingCart, label: '주문 관리' },
  { href: '/admin/members', icon: Users, label: '회원 관리' },

  // 콘텐츠
  { divider: true, label: '콘텐츠' },
  { href: '/admin/announcements', icon: Megaphone, label: '공고 관리' },
  { href: '/admin/feeds', icon: Rss, label: 'IT피드 관리' },
  { href: '/admin/faq', icon: HelpCircle, label: 'FAQ 관리' },

  // 마케팅
  { divider: true, label: '마케팅' },
  { href: '/admin/brief', icon: Mail, label: '모닝 브리프' },
  { href: '/admin/coupons', icon: Tag, label: '쿠폰 관리' },
  { href: '/admin/discount-matches', icon: Link2, label: '할인 매칭' },
  { href: '/admin/reviews', icon: Star, label: '리뷰 관리' },

  // 운영
  { divider: true, label: '운영' },
  { href: '/admin/chat', icon: MessageCircle, label: '채팅 관리' },
  { href: '/admin/consulting', icon: MessageSquare, label: '컨설팅 신청' },
  { href: '/admin/downloads', icon: Download, label: '다운로드 관리' },
  { href: '/admin/analytics', icon: BarChart3, label: '통계 분석' },
  { href: '/admin/settings', icon: Settings, label: '사이트 설정' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [badges, setBadges] = useState<Record<string, number>>({})

  // 사이드바 뱃지 카운트 로드
  useEffect(() => {
    if (!authorized) return
    const supabase = createClient()
    async function loadBadges() {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayIso = today.toISOString()

        const [annRes, feedRes, chatRes, consultRes] = await Promise.all([
          // 오늘 등록된 공고
          supabase.from('announcements').select('id', { count: 'exact', head: true })
            .eq('is_published', true).gte('created_at', todayIso),
          // 오늘 등록된 피드
          supabase.from('community_posts').select('id', { count: 'exact', head: true })
            .eq('is_published', true).gte('created_at', todayIso),
          // 관리자 미읽은 채팅
          supabase.from('chat_rooms').select('admin_unread_count')
            .eq('hidden_by_admin', false).gt('admin_unread_count', 0),
          // pending 컨설팅
          supabase.from('consulting_requests').select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
        ])

        const chatUnread = (chatRes.data || []).reduce((sum, r) => sum + (r.admin_unread_count || 0), 0)

        setBadges({
          '/admin/announcements': annRes.count || 0,
          '/admin/feeds': feedRes.count || 0,
          '/admin/chat': chatUnread,
          '/admin/consulting': consultRes.count || 0,
        })
      } catch (e) {
        console.error('badge load error', e)
      }
    }
    loadBadges()
    const interval = setInterval(loadBadges, 30000)
    return () => clearInterval(interval)
  }, [authorized])

  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

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
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
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

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Header */}
      <div className={`${!isMobile && collapsed ? 'p-3' : 'px-5 py-5'} border-b border-white/10 transition-all duration-300`}>
        <div className="flex items-center justify-between">
          {(isMobile || !collapsed) && (
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> 사이트로 돌아가기
            </Link>
          )}
          {isMobile && (
            <button type="button" title="사이드바 닫기" onClick={() => setMobileOpen(false)} className="text-zinc-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className={`flex items-center mt-4 ${!isMobile && collapsed ? 'justify-center' : 'gap-2.5'}`}>
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <span className="text-primary-foreground text-xs font-bold">PS</span>
          </div>
          {(isMobile || !collapsed) && (
            <div>
              <p className="font-bold text-sm text-white tracking-tight">프리세일즈</p>
              <p className="text-[10px] text-zinc-400">관리자</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className={`flex-1 ${!isMobile && collapsed ? 'p-2' : 'p-3'} space-y-0.5 transition-all duration-300 overflow-y-auto`}>
        {adminNav.map((item, idx) => {
          if ('divider' in item) {
            if (!isMobile && collapsed) {
              return <div key={`div-${idx}`} className="my-2 border-t border-white/10" />
            }
            return (
              <div key={`div-${idx}`} className="pt-3 pb-1 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{item.label}</p>
              </div>
            )
          }
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname?.startsWith(item.href))
          const badgeCount = badges[item.href] || 0
          const isChat = item.href === '/admin/chat'
          const isConsulting = item.href === '/admin/consulting'
          const isRedBadge = isChat || isConsulting
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!isMobile && collapsed ? item.label : undefined}
              className={`flex items-center ${!isMobile && collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-zinc-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
              {(isMobile || !collapsed) && (
                <span className="flex-1">{item.label}</span>
              )}
              {(isMobile || !collapsed) && badgeCount > 0 && (
                <span className={`min-w-[22px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 ${
                  isRedBadge
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}>
                  {badgeCount > 999 ? '999+' : badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse hint */}
      {!isMobile && collapsed && (
        <div className="p-2 border-t border-white/10">
          <Link href="/" title="사이트로 돌아가기" className="flex items-center justify-center py-2 text-zinc-400 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      )}
    </>
  )

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border/50 flex items-center px-4 z-40 md:hidden">
        <button type="button" title="메뉴 열기" onClick={() => setMobileOpen(true)} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-[10px] font-bold">PS</span>
          </div>
          <span className="font-bold text-sm tracking-tight">관리자</span>
        </div>
      </div>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r border-white/10 flex flex-col z-50 transform transition-transform duration-500 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent(true)}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} bg-zinc-900 border-r border-white/10 hidden md:flex flex-col shrink-0 transition-all duration-300 relative`}>
        <button
          type="button"
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          onClick={toggle}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center text-zinc-400 hover:text-white hover:border-primary transition-all z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
        {sidebarContent(false)}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="pt-14 md:pt-0">
          <div className="p-4 md:p-8 max-w-[1400px]">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
