'use client'

import './admin-theme.css'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, Users, MessageSquare, MessageCircle, Star, Download, BarChart3, Menu, X, Settings, Tag, HelpCircle, Link2, Megaphone, Rss, Mail, Coins, Bell, BookOpen, UserCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileSearch } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type AdminNavItem = {
  href: string
  icon: typeof LayoutDashboard
  label: string
  description: string
}

type AdminSection = {
  key: string
  label: string
  shortLabel: string
  summary: string
  href: string
  icon: typeof LayoutDashboard
  items: AdminNavItem[]
}

type ChatNotification = {
  id: string
  label: string
  description: string
  unreadCount: number
  lastMessageAt: string | null
  href: string
}

const adminSections: AdminSection[] = [
  {
    key: 'home',
    label: '홈',
    shortLabel: 'Home',
    summary: '전체 운영 현황',
    href: '/admin',
    icon: LayoutDashboard,
    items: [
      { href: '/admin', icon: LayoutDashboard, label: '대시보드', description: '핵심 지표와 최근 활동' },
    ],
  },
  {
    key: 'sales',
    label: '영업',
    shortLabel: 'Sales',
    summary: '상품, 주문, 프로모션',
    href: '/admin/products',
    icon: ShoppingCart,
    items: [
      { href: '/admin/products', icon: Package, label: '상품 관리', description: '상품 등록과 수정' },
      { href: '/admin/orders', icon: ShoppingCart, label: '주문 관리', description: '결제와 주문 상태' },
      { href: '/admin/downloads', icon: Download, label: '다운로드 관리', description: '파일 다운로드 기록' },
      { href: '/admin/reviews', icon: Star, label: '리뷰 관리', description: '후기 승인과 노출' },
      { href: '/admin/coupons', icon: Tag, label: '쿠폰 관리', description: '프로모션 코드' },
      { href: '/admin/discount-matches', icon: Link2, label: '할인 매칭', description: '할인 상품 연결' },
    ],
  },
  {
    key: 'projects',
    label: '프로젝트',
    shortLabel: 'Projects',
    summary: '컨설팅과 RFP 분석',
    href: '/admin/consulting',
    icon: FileSearch,
    items: [
      { href: '/admin/consulting', icon: MessageSquare, label: '컨설팅 신청', description: '프로젝트 상담 접수' },
      { href: '/admin/rfp-analysis', icon: FileSearch, label: 'AI 분석 관리', description: 'RFP 분석 작업과 리포트' },
    ],
  },
  {
    key: 'content',
    label: '콘텐츠',
    shortLabel: 'Content',
    summary: '공고와 문서 콘텐츠',
    href: '/admin/announcements',
    icon: BookOpen,
    items: [
      { href: '/admin/announcements', icon: Megaphone, label: '공고 관리', description: '수집 공고 검수' },
      { href: '/admin/feeds', icon: Rss, label: 'IT피드 관리', description: '외부 피드 운영' },
      { href: '/admin/ai-proposal-guide', icon: BookOpen, label: 'AI 제안서 작성법', description: '가이드 콘텐츠' },
      { href: '/admin/notices', icon: Bell, label: '공지사항', description: '사이트 공지 작성' },
      { href: '/admin/faq', icon: HelpCircle, label: 'FAQ 관리', description: '자주 묻는 질문' },
      { href: '/admin/morning-brief', icon: Mail, label: '모닝브리프 기록', description: '메일 브리프 발송 이력' },
    ],
  },
  {
    key: 'customers',
    label: '고객',
    shortLabel: 'Customers',
    summary: '회원과 상담 대응',
    href: '/admin/members',
    icon: Users,
    items: [
      { href: '/admin/members', icon: Users, label: '회원 관리', description: '가입 회원과 권한' },
      { href: '/admin/chat', icon: MessageCircle, label: '채팅 관리', description: '고객 문의 응대' },
    ],
  },
  {
    key: 'system',
    label: '시스템',
    shortLabel: 'System',
    summary: '환경과 정책 설정',
    href: '/admin/settings',
    icon: Settings,
    items: [
      { href: '/admin/settings', icon: Settings, label: '사이트 설정', description: '기본 운영 설정' },
      { href: '/admin/analytics', icon: BarChart3, label: '이용현황', description: '방문과 매출 흐름' },
      { href: '/admin/settings/rewards', icon: Coins, label: '적립금', description: '리워드 정책' },
    ],
  },
]

const allAdminItems = adminSections.flatMap((section) => section.items)

function isHrefActive(pathname: string | null, href: string) {
  if (!pathname) return href === '/admin'
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getActiveItem(pathname: string | null) {
  return [...allAdminItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isHrefActive(pathname, item.href)) || allAdminItems[0]
}

function getActiveSection(pathname: string | null) {
  return adminSections.find((section) =>
    section.items.some((item) => isHrefActive(pathname, item.href)),
  ) || adminSections[0]
}

function getBadgeCountForSection(section: AdminSection, badges: Record<string, number>) {
  return section.items.reduce((sum, item) => sum + (badges[item.href] || 0), 0)
}

function formatNotificationTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sectionRailCollapsed, setSectionRailCollapsed] = useState(false)
  const [globalNavExpanded, setGlobalNavExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [badges, setBadges] = useState<Record<string, number>>({})
  const [chatNotifications, setChatNotifications] = useState<ChatNotification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const globalNavMenuRef = useRef<HTMLDivElement | null>(null)
  const activeSection = getActiveSection(pathname)
  const activeItem = getActiveItem(pathname)
  const ActiveSectionIcon = activeSection.icon

  useEffect(() => {
    setSectionRailCollapsed(localStorage.getItem('admin-section-rail-collapsed') === 'true')
    setGlobalNavExpanded(localStorage.getItem('admin-global-nav-expanded') === 'true')
  }, [])

  // 사이드바 뱃지 카운트 로드 (middleware가 admin 권한 보장)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    // auth 세션이 준비될 때까지 대기
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!ready) return
    const supabase = createClient()
    async function loadBadges() {
      try {
        const res = await fetch('/api/admin/sidebar-badges', {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (!res.ok) throw new Error(`badge API ${res.status}`)
        const data = await res.json() as {
          announcementsToday?: number
          feedsToday?: number
          chatUnread?: number
          consultingPending?: number
          unreadOrders?: number
          unreadMembers?: number
          chatNotifications?: ChatNotification[]
        }

        setBadges({
          '/admin/orders': data.unreadOrders || 0,
          '/admin/members': data.unreadMembers || 0,
          '/admin/announcements': data.announcementsToday || 0,
          '/admin/feeds': data.feedsToday || 0,
          '/admin/chat': data.chatUnread || 0,
          '/admin/consulting': data.consultingPending || 0,
        })
        setChatNotifications(data.chatNotifications || [])
      } catch (e) {
        console.error('badge load error', e)
      }
    }
    loadBadges()
    const interval = setInterval(loadBadges, 30000)

    const refreshBadges = () => { void loadBadges() }
    window.addEventListener('admin-badges-refresh', refreshBadges)

    const chatChannel = supabase
      .channel('admin-sidebar-chat-badges')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_rooms' },
        refreshBadges,
      )
      .subscribe()
    const orderChannel = supabase
      .channel('admin-sidebar-order-badges')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        refreshBadges,
      )
      .subscribe()
    const memberChannel = supabase
      .channel('admin-sidebar-member-badges')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        refreshBadges,
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      window.removeEventListener('admin-badges-refresh', refreshBadges)
      supabase.removeChannel(chatChannel)
      supabase.removeChannel(orderChannel)
      supabase.removeChannel(memberChannel)
    }
  }, [ready])

  const renderBadge = (count: number, tone: 'dark' | 'light' = 'dark') => {
    if (count <= 0) return null
    return (
      <span
        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
          tone === 'light'
            ? 'bg-[#c8ff2e] text-[#17171f]'
            : 'bg-[#17171f] text-[#c8ff2e]'
        }`}
      >
        {count > 999 ? '999+' : count}
      </span>
    )
  }

  const toggleSectionRail = () => {
    setSectionRailCollapsed((current) => {
      const next = !current
      localStorage.setItem('admin-section-rail-collapsed', String(next))
      return next
    })
  }

  const toggleGlobalNav = () => {
    setGlobalNavExpanded((current) => {
      const next = !current
      localStorage.setItem('admin-global-nav-expanded', String(next))
      return next
    })
  }

  useEffect(() => {
    if (!globalNavExpanded) return

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (globalNavMenuRef.current?.contains(target)) return

      setGlobalNavExpanded(false)
      localStorage.setItem('admin-global-nav-expanded', 'false')
    }

    document.addEventListener('pointerdown', closeOnOutsidePointerDown)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointerDown)
  }, [globalNavExpanded])

  const chatUnreadCount = badges['/admin/chat'] || 0

  const sectionMenu = (isMobile: boolean, isCollapsed = false) => {
    if (!isMobile && isCollapsed) {
      return (
        <>
          <div className="border-b border-[#ece9e2] px-2 py-4">
            <div
              className="mx-auto flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#17171f] text-[#c8ff2e]"
              title={`${activeSection.label}: ${activeSection.summary}`}
            >
              <ActiveSectionIcon className="h-5 w-5" />
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-2">
            {activeSection.items.map((item) => {
              const Icon = item.icon
              const isActive = activeItem.href === item.href
              const badgeCount = badges[item.href] || 0
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-[16px] border transition-all ${
                    isActive
                      ? 'border-[#17171f] bg-[#17171f] text-[#c8ff2e] shadow-[0_14px_28px_-22px_rgba(23,23,31,0.8)]'
                      : 'border-transparent bg-transparent text-[#5f5b52] hover:border-[#e4e0d7] hover:bg-white hover:text-[#17171f]'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {badgeCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2563eb] px-1 text-[10px] font-bold text-white">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </>
      )
    }

    return (
    <>
      <div className="border-b border-[#ece9e2] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase text-[#8a867f]">
              {activeSection.shortLabel}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[#17171f]">
              {activeSection.label}
            </h2>
            <p className="mt-1 text-xs text-[#767268]">{activeSection.summary}</p>
          </div>
          {isMobile && (
            <button
              type="button"
              title="메뉴 닫기"
              onClick={() => setMobileOpen(false)}
              className="rounded-full border border-[#e2ded5] bg-white p-2 text-[#5f5b52] hover:bg-[#f2f0eb]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {isMobile && (
        <nav className="border-b border-[#ece9e2] p-3">
          <p className="px-2 pb-2 font-mono text-[10px] font-semibold uppercase text-[#8a867f]">1Depth</p>
          <div className="grid grid-cols-2 gap-2">
            {adminSections.map((section) => {
              const Icon = section.icon
              const isActive = section.key === activeSection.key
              const badgeCount = getBadgeCountForSection(section, badges)
              return (
                <Link
                  key={section.key}
                  href={section.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-[16px] border px-3 py-2 text-sm font-semibold ${
                    isActive
                      ? 'border-[#17171f] bg-[#17171f] text-white'
                      : 'border-[#e4e0d7] bg-white text-[#35332e]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{section.label}</span>
                  {renderBadge(badgeCount, isActive ? 'light' : 'dark')}
                </Link>
              )
            })}
          </div>
        </nav>
      )}

      <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
        <p className="px-2 pb-2 font-mono text-[10px] font-semibold uppercase text-[#8a867f]">2Depth</p>
        {activeSection.items.map((item) => {
          const Icon = item.icon
          const isActive = activeItem.href === item.href
          const badgeCount = badges[item.href] || 0
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={isMobile ? () => setMobileOpen(false) : undefined}
              className={`group flex items-center gap-3 rounded-[18px] border px-3 py-3 transition-all ${
                isActive
                  ? 'border-[#17171f] bg-[#17171f] text-white shadow-[0_16px_34px_-28px_rgba(23,23,31,0.8)]'
                  : 'border-transparent text-[#5f5b52] hover:border-[#e4e0d7] hover:bg-white'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] ${
                  isActive
                    ? 'bg-[#c8ff2e] text-[#17171f]'
                    : 'bg-[#f1f0eb] text-[#17171f] group-hover:bg-[#e8e5dd]'
                }`}
              >
                <Icon className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{item.label}</span>
                <span className={`mt-0.5 block truncate text-xs ${isActive ? 'text-white/[0.62]' : 'text-[#8a867f]'}`}>
                  {item.description}
                </span>
              </span>
              {renderBadge(badgeCount, isActive ? 'light' : 'dark')}
            </Link>
          )
        })}
      </nav>
    </>
    )
  }

  return (
    <div className="admin-tone min-h-[100dvh] bg-background text-foreground">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b border-border/50 bg-card px-4 md:hidden">
        <button type="button" title="메뉴 열기" onClick={() => setMobileOpen(true)} className="rounded-xl p-1.5 transition-colors hover:bg-muted">
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(340px,88vw)] transform flex-col border-r border-[#ddd8ce] bg-[#f7f6f0] shadow-2xl transition-transform duration-500 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sectionMenu(true)}
      </aside>

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1720px] flex-col px-1.5 pb-4 pt-16 md:px-2.5 md:pb-5 md:pt-2.5">
        <header className="admin-global-bar hidden overflow-visible rounded-[30px] border border-[#262634] bg-[#191922] text-white shadow-[0_34px_80px_-56px_rgba(0,0,0,0.72)] md:block">
          <div className="flex h-[72px] items-center gap-4 px-5 py-4">
            <Link href="/admin" className="flex w-[245px] shrink-0 items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c8ff2e] text-sm font-black text-[#17171f]">
                PS
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-[-0.01em]">프리세일즈</span>
                <span className="block text-[11px] text-white/[0.45]">ADMIN CONSOLE</span>
              </span>
            </Link>

            <div className="min-w-0 flex-1" />

            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  title="읽지 않은 채팅 알림"
                  aria-label={`읽지 않은 채팅 ${chatUnreadCount}개`}
                  aria-expanded={notificationsOpen}
                  onClick={() => setNotificationsOpen((current) => !current)}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white/[0.72] hover:bg-white/10"
                >
                  <Bell className="h-4 w-4" />
                  {chatUnreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c8ff2e] px-1.5 text-[10px] font-black text-[#17171f] shadow-[0_10px_24px_-12px_rgba(200,255,46,0.7)]">
                      {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-[22px] border border-[#d8d4cb] bg-[#fbfaf5] text-[#17171f] shadow-[0_34px_80px_-42px_rgba(0,0,0,0.55)]">
                    <div className="border-b border-[#e4e0d6] px-4 py-3">
                      <p className="text-sm font-bold">채팅 알림</p>
                      <p className="mt-0.5 text-xs text-[#726e65]">
                        읽지 않은 채팅 {chatUnreadCount}개
                      </p>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto py-2">
                      {chatNotifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-[#726e65]">
                          읽지 않은 채팅이 없습니다
                        </div>
                      ) : (
                        chatNotifications.map((item) => (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => setNotificationsOpen(false)}
                            className="flex gap-3 px-4 py-3 text-left hover:bg-[#eeece5]"
                          >
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#17171f] text-[#c8ff2e]">
                              <MessageCircle className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-3">
                                <span className="truncate text-sm font-semibold">{item.label}</span>
                                <span className="shrink-0 text-[10px] text-[#8a867f]">{formatNotificationTime(item.lastMessageAt)}</span>
                              </span>
                              <span className="mt-1 block truncate text-xs text-[#726e65]">{item.description}</span>
                            </span>
                            <span className="mt-1 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#2563eb] px-1.5 text-[10px] font-bold text-white">
                              {item.unreadCount > 99 ? '99+' : item.unreadCount}
                            </span>
                          </Link>
                        ))
                      )}
                    </div>
                    <Link
                      href="/admin/chat"
                      onClick={() => setNotificationsOpen(false)}
                      className="block border-t border-[#e4e0d6] px-4 py-3 text-center text-xs font-semibold text-[#2563eb] hover:bg-[#eeece5]"
                    >
                      채팅 관리로 이동
                    </Link>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] py-1 pl-1 pr-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2b2b38] text-white">
                  <UserCircle className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs font-semibold">관리자</span>
                  <span className="block text-[10px] text-white/[0.45]">presales.co.kr</span>
                </span>
              </div>
            </div>
          </div>

          <div ref={globalNavMenuRef} className="border-t border-white/[0.08] px-5 py-2">
            <nav className="flex items-center gap-1">
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1">
                {adminSections.map((section) => {
                  const Icon = section.icon
                  const isActive = section.key === activeSection.key
                  const badgeCount = getBadgeCountForSection(section, badges)
                  return (
                    <Link
                      key={section.key}
                      href={section.href}
                      onClick={(event) => {
                        if (!isActive) return
                        event.preventDefault()
                        toggleGlobalNav()
                      }}
                      aria-expanded={isActive ? globalNavExpanded : undefined}
                      className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-white text-[#17171f]'
                          : 'text-white/[0.62] hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{section.label}</span>
                      <span className={`text-[10px] font-medium ${isActive ? 'text-[#5f5b52]' : 'text-white/[0.36]'}`}>
                        {section.shortLabel}
                      </span>
                      {renderBadge(badgeCount, isActive ? 'dark' : 'light')}
                      {isActive && <span className="absolute -bottom-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-[#c8ff2e]" />}
                    </Link>
                  )
                })}
              </div>
              <button
                type="button"
                title={globalNavExpanded ? '상단 메뉴 접기' : '상단 메뉴 펼치기'}
                aria-label={globalNavExpanded ? '상단 메뉴 접기' : '상단 메뉴 펼치기'}
                aria-expanded={globalNavExpanded}
                onClick={toggleGlobalNav}
                className="ml-2 inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 text-xs font-semibold text-white/[0.72] hover:bg-white/[0.1] hover:text-white"
              >
                {globalNavExpanded ? '접기' : '펼치기'}
                {globalNavExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </nav>

            <div className="mt-2 flex items-center gap-2 overflow-x-auto rounded-[22px] border border-white/[0.08] bg-black/[0.12] p-2">
              <div className="flex shrink-0 items-center gap-2 rounded-[14px] px-2 py-1.5 text-[11px] font-semibold text-white/[0.48]">
                <ActiveSectionIcon className="h-3.5 w-3.5 text-[#c8ff2e]" />
                <span>{activeSection.label} 메뉴</span>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                {activeSection.items.map((item) => {
                  const ItemIcon = item.icon
                  const isActive = activeItem.href === item.href
                  const badgeCount = badges[item.href] || 0
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex shrink-0 items-center gap-2 rounded-[14px] px-3 py-2 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-[#c8ff2e] text-[#17171f] shadow-[0_16px_34px_-24px_rgba(200,255,46,0.8)]'
                          : 'text-white/[0.62] hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <ItemIcon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                      {renderBadge(badgeCount, isActive ? 'dark' : 'light')}
                    </Link>
                  )
                })}
              </div>
            </div>

            {globalNavExpanded && (
              <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2 overflow-x-auto pb-2">
                {adminSections.map((section) => {
                  const SectionIcon = section.icon
                  const sectionActive = section.key === activeSection.key
                  return (
                    <div
                      key={section.key}
                      className={`min-w-[160px] rounded-[18px] border p-2 ${
                        sectionActive
                          ? 'border-[#c8ff2e]/45 bg-white/[0.08]'
                          : 'border-white/[0.08] bg-black/[0.12]'
                      }`}
                    >
                      <Link
                        href={section.href}
                        className="flex items-center gap-2 rounded-[14px] px-2 py-2 text-sm font-semibold text-white hover:bg-white/[0.08]"
                      >
                        <SectionIcon className="h-4 w-4 text-[#c8ff2e]" />
                        <span className="min-w-0 flex-1 truncate">{section.label}</span>
                        <span className="text-[10px] font-medium text-white/[0.38]">{section.shortLabel}</span>
                      </Link>
                      <div className="mt-1 space-y-1">
                        {section.items.map((item) => {
                          const ItemIcon = item.icon
                          const isActive = activeItem.href === item.href
                          const badgeCount = badges[item.href] || 0
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`flex items-center gap-2 rounded-[12px] px-2 py-1.5 text-xs transition-colors ${
                                isActive
                                  ? 'bg-[#c8ff2e] font-semibold text-[#17171f]'
                                  : 'text-white/[0.6] hover:bg-white/[0.08] hover:text-white'
                              }`}
                            >
                              <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                              {renderBadge(badgeCount, isActive ? 'dark' : 'light')}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-4 md:pt-4">
          <aside
            className={`admin-section-rail relative hidden shrink-0 flex-col rounded-[30px] border border-[#ddd8ce] bg-[#f7f6f0] md:flex ${
              sectionRailCollapsed ? 'w-[76px]' : 'w-[286px]'
            }`}
          >
            <button
              type="button"
              title={sectionRailCollapsed ? '왼쪽 메뉴 펼치기' : '왼쪽 메뉴 접기'}
              aria-label={sectionRailCollapsed ? '왼쪽 메뉴 펼치기' : '왼쪽 메뉴 접기'}
              onClick={toggleSectionRail}
              className="absolute -right-3 top-6 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#d8d4cb] bg-[#fbfaf5] text-[#5f5b52] shadow-[0_10px_24px_-16px_rgba(23,23,31,0.46)] hover:bg-white hover:text-[#17171f]"
            >
              {sectionRailCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            {sectionMenu(false, sectionRailCollapsed)}
          </aside>

          <main className="min-w-0 flex-1">
            <div className="admin-content p-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
