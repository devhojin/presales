'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowUpRight } from 'lucide-react'

const FALLBACK = {
  company_name: 'AMARANS Partners',
  ceo_name: '채호진',
  business_number: '',
  commerce_number: '',
  address: '',
  email: 'contact@presales.co.kr',
  copyright: `${new Date().getFullYear()} AMARANS Partners. All rights reserved.`,
}

export function Footer() {
  const [s, setS] = useState(FALLBACK)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('site_settings')
      .select('key, value')
      .in('key', Object.keys(FALLBACK))
      .then(({ data }) => {
        if (data && data.length > 0) {
          const map = Object.fromEntries(
            data.map((r: { key: string; value: string }) => [r.key, r.value])
          )
          setS((prev) => ({ ...prev, ...map }))
        }
      })
  }, [])

  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* Top section */}
        <div className="py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
            {/* Brand */}
            <div className="md:col-span-5">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">PS</span>
                </div>
                <span className="text-lg font-bold text-foreground tracking-tight">프리세일즈</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                공공조달 제안서 전문 플랫폼.
                나라장터, 조달청 입찰에 최적화된 기술제안서, 가격제안서,
                발표PT 템플릿과 전문가 컨설팅을 제공합니다.
              </p>
            </div>

            {/* Links */}
            <div className="md:col-span-3">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-5">서비스</h4>
              <ul className="space-y-3.5">
                {[
                  { href: '/store', label: '문서 스토어' },
                  { href: '/consulting', label: '전문가 컨설팅' },
                  { href: '/store?price=free', label: '무료 가이드' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 inline-flex items-center gap-1 group">
                      {link.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-5">지원</h4>
              <ul className="space-y-3.5">
                {[
                  { href: '/about', label: '회사소개' },
                  { href: '/faq', label: '자주 묻는 질문' },
                  { href: '/consulting', label: '문의하기' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-5">법적 고지</h4>
              <ul className="space-y-3.5">
                {[
                  { href: '/terms', label: '이용약관' },
                  { href: '/privacy', label: '개인정보처리방침' },
                  { href: '/refund', label: '환불정책' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`text-sm transition-colors duration-300 ${
                        link.href === '/privacy'
                          ? 'text-foreground font-medium hover:text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
              <p>
                <span className="font-medium text-foreground/80">{s.company_name}</span>
                <span className="mx-1.5 text-border">|</span>
                대표: {s.ceo_name}
                {s.business_number && (
                  <>
                    <span className="mx-1.5 text-border">|</span>
                    사업자등록번호: {s.business_number}
                  </>
                )}
                {s.commerce_number && (
                  <>
                    <span className="mx-1.5 text-border">|</span>
                    통신판매업신고: {s.commerce_number}
                  </>
                )}
              </p>
              <p>
                {s.address && (
                  <>
                    {s.address}
                    <span className="mx-1.5 text-border">|</span>
                  </>
                )}
                {s.email}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {s.company_name}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
