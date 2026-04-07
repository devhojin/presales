'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, User, LogOut, Settings } from 'lucide-react'
import { CartDrawer } from '@/components/CartDrawer'
import { createClient } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const navLinks = [
  { href: '/store', label: '템플릿 스토어' },
  { href: '/consulting', label: '컨설팅 패키지' },
  { href: '/about', label: '팀 소개' },
]

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profileMenu, setProfileMenu] = useState(false)
  const [profile, setProfile] = useState<{ name: string; role: string } | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
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

  // 프로필 드롭다운 외부 클릭 시 닫기
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

  // Hide header on admin pages
  if (pathname?.startsWith('/admin')) return null

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0B1629] flex items-center justify-center">
            <span className="text-white text-xs font-bold">PS</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-primary tracking-tight leading-none">
              프리세일즈
            </span>
            <span className="text-[9px] text-muted-foreground tracking-wider leading-none mt-0.5">
              공공조달 제안서 전문
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === link.href || pathname?.startsWith(link.href + '/')
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <CartDrawer />
          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileMenu(!profileMenu)}
                className="flex items-center gap-2 h-8 px-3 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-medium">{profile?.name || '사용자'}</span>
              </button>
              {profileMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg py-1 z-50">
                  <Link
                    href="/mypage"
                    onClick={() => setProfileMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <User className="w-4 h-4" /> 마이페이지
                  </Link>
                  {profile?.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setProfileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <Settings className="w-4 h-4" /> 관리자
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left text-red-600"
                  >
                    <LogOut className="w-4 h-4" /> 로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="inline-flex items-center h-7 px-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/store"
                className="inline-flex items-center h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
              >
                무료 가이드 받기
              </Link>
            </>
          )}
        </div>

        <div className="md:hidden flex items-center gap-2">
          <CartDrawer />
          <button
            className="p-2 text-muted-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="flex flex-col px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-left text-base font-medium py-2 ${
                  pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    href="/mypage"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center py-2 rounded-lg border border-border hover:bg-muted text-sm font-medium transition-colors"
                  >
                    마이페이지
                  </Link>
                  {profile?.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full text-center py-2 rounded-lg border border-border hover:bg-muted text-sm font-medium transition-colors"
                    >
                      관리자
                    </Link>
                  )}
                  <button
                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false) }}
                    className="w-full text-center py-2 rounded-lg text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center py-2 rounded-lg border border-border hover:bg-muted text-sm font-medium transition-colors"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
