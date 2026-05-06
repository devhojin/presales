'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, User, LogOut, Settings, ChevronRight } from 'lucide-react'
import { CartDrawer } from '@/components/CartDrawer'
import { createClient } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const navLinks = [
  { href: '/us', label: '우리는' },
  { href: '/store', label: '문서 스토어' },
  { href: '/consulting', label: '컨설팅' },
  { href: '/ai-analysis', label: 'AI 분석' },
  { href: '/ai-proposal-guide', label: 'AI 제안서 작성법' },
  { href: '/announcements', label: '입찰 공고' },
  { href: '/feeds', label: 'IT피드' },
  { href: '/brief', label: '모닝 브리프' },
  { href: '/faq', label: '고객지원' },
]

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 모바일 메뉴 열릴 때 body 스크롤 차단
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileMenu, setProfileMenu] = useState(false)
  const [profile, setProfile] = useState<{ name: string; role: string } | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setAuthLoading(false)
      if (user) {
        supabase.from('profiles').select('name, role').eq('id', user.id).single()
          .then(({ data }) => setProfile(data))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase.from('profiles').select('name, role').eq('id', session.user.id).single()
          .then(({ data }) => setProfile(data))
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Scroll detection for header background
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenu(false)
      }
    }
    if (profileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileMenu])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setProfileMenu(false)
    router.push('/')
    router.refresh()
  }

  if (pathname?.startsWith('/admin')) return null

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-5 xl:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.04]">
              <span className="text-primary-foreground text-xs font-bold tracking-tight">PS</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-foreground tracking-tight leading-none">
                프리세일즈
              </span>
              <span className="text-[9px] text-muted-foreground tracking-widest leading-none mt-0.5 uppercase">
                presales.co.kr
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden xl:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname?.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-semibold transition-all duration-300 active:scale-[0.98] xl:px-3 xl:text-sm 2xl:px-4 ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden xl:flex shrink-0 items-center gap-2">
            <CartDrawer />
            {authLoading || (user && !profile) ? (
              <div className="w-20 h-8" />
            ) : user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileMenu(!profileMenu)}
                  className="flex items-center gap-2 h-9 px-3 rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{profile?.name || '사용자'}</span>
                </button>
                {profileMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-200">
                    <Link
                      href="/mypage"
                      onClick={() => setProfileMenu(false)}
                      className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/80 transition-colors mx-1.5 rounded-lg"
                    >
                      <span className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-muted-foreground" /> 나의콘솔
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </Link>
                    {profile?.role === 'admin' && (
                      <a
                        href="/admin"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setProfileMenu(false)}
                        className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/80 transition-colors mx-1.5 rounded-lg"
                      >
                        <span className="flex items-center gap-2.5">
                          <Settings className="w-4 h-4 text-muted-foreground" /> 관리자
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )}
                    <div className="my-1 mx-3 border-t border-border" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 transition-colors w-[calc(100%-12px)] text-left mx-1.5 rounded-lg"
                    >
                      <LogOut className="w-4 h-4" /> 로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="whitespace-nowrap px-2 xl:px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  로그인
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex h-9 items-center whitespace-nowrap rounded-full bg-foreground px-3 xl:px-4 text-sm font-medium text-background transition-all duration-300 hover:bg-foreground/90 active:scale-[0.98]"
                >
                  무료로 시작하기
                </Link>
              </div>
            )}
          </div>

          {/* Mobile */}
          <div className="xl:hidden flex items-center gap-1">
            <CartDrawer />
            <button
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="메뉴 열기"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu — Full overlay (불투명 배경 + 스크롤 차단) */}
      <div
        className={`xl:hidden absolute left-0 right-0 top-16 bg-background z-[60] transition-all duration-500 overflow-y-auto ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ height: isMobileMenuOpen ? 'calc(100dvh - 4rem)' : 0 }}
      >
        <div className="flex flex-col px-6 pt-8 pb-6 min-h-full">
          <nav className="space-y-1 flex-1">
            {navLinks.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between text-lg font-medium min-h-[52px] px-2 rounded-xl transition-all duration-300 ${
                  pathname === link.href
                    ? 'text-primary bg-primary/5'
                    : 'text-foreground hover:bg-muted/50'
                }`}
                style={{ transitionDelay: isMobileMenuOpen ? `${i * 50}ms` : '0ms' }}
              >
                {link.label}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </nav>

          <div className="pt-6 border-t border-border space-y-3">
            {user ? (
              <>
                <Link
                  href="/mypage"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center h-12 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
                >
                  나의콘솔
                </Link>
                {profile?.role === 'admin' && (
                  <a
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center h-12 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
                  >
                    관리자
                  </a>
                )}
                <button
                  onClick={() => { handleLogout(); setIsMobileMenuOpen(false) }}
                  className="w-full flex items-center justify-center h-12 rounded-xl text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center h-12 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
                >
                  로그인
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center h-12 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
                >
                  무료로 시작하기
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
