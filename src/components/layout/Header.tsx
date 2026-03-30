'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { href: '/store', label: '템플릿 스토어' },
  { href: '/consulting', label: '컨설팅 패키지' },
  { href: '/about', label: '팀 소개' },
]

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

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

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/mypage"
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
        </div>

        <button
          className="md:hidden p-2 text-muted-foreground"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
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
              <Link
                href="/mypage"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2 rounded-lg border border-border hover:bg-muted text-sm font-medium transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/store"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
              >
                무료 가이드 받기
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
