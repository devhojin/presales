'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react'

const FALLBACK = {
  company_name: 'AMARANS',
  ceo_name: '채호진',
  business_number: '',
  commerce_number: '',
  address: '',
  email: 'help@presales.co.kr',
  phone: '',
  copyright: `${new Date().getFullYear()} AMARANS. All rights reserved.`,
}

const FOOTER_GROUPS = [
  {
    title: '문서와 서비스',
    links: [
      { href: '/store', label: '문서 스토어' },
      { href: '/store?price=free', label: '무료 자료' },
      { href: '/consulting', label: '전문가 컨설팅' },
      { href: '/announcements', label: '입찰 공고' },
    ],
  },
  {
    title: '콘텐츠와 소식',
    links: [
      { href: '/brief', label: '모닝 브리프' },
      { href: '/feeds', label: 'IT피드' },
      { href: '/notices', label: '공지사항' },
      { href: '/faq', label: '고객지원' },
    ],
  },
  {
    title: '회사와 정책',
    links: [
      { href: '/us', label: '우리는' },
      { href: '/terms', label: '이용약관' },
      { href: '/privacy', label: '개인정보처리방침', strong: true },
      { href: '/refund', label: '환불정책' },
    ],
  },
]

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
    <footer className="border-t border-border bg-[#FAFAF9]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="py-14 md:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_1.45fr] lg:gap-16">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-[0_16px_40px_-28px_rgba(37,99,235,0.75)]">
                  <span className="text-primary-foreground text-xs font-bold">PS</span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-foreground tracking-tight">프리세일즈</span>
                  <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">presales.co.kr</span>
                </div>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                공공조달 제안서 전문 플랫폼.
                나라장터, 조달청 입찰에 최적화된 기술제안서, 가격제안서,
                발표PT 템플릿과 전문가 컨설팅을 제공합니다.
              </p>
              <div className="mt-6 flex flex-col gap-2 text-xs text-muted-foreground">
                {s.email && (
                  <a href={`mailto:${s.email}`} className="inline-flex items-center gap-2 hover:text-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {s.email}
                  </a>
                )}
                {s.phone && (
                  <a href={`tel:${s.phone.replace(/[^0-9+]/g, '')}`} className="inline-flex items-center gap-2 hover:text-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {s.phone}
                  </a>
                )}
                {s.address && (
                  <span className="inline-flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {s.address}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {FOOTER_GROUPS.map((group) => (
                <nav key={group.title} aria-label={group.title}>
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-5">{group.title}</h4>
                  <ul className="space-y-3.5">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={`text-sm transition-colors duration-300 inline-flex items-center gap-1 group ${
                            link.strong
                              ? 'font-medium text-foreground hover:text-primary'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {link.label}
                          {link.href === '/notices' && (
                            <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>
        </div>

        <div className="py-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
              <p>
                <span className="font-medium text-foreground/80">{s.company_name}</span>
                {s.ceo_name && (
                  <>
                    <span className="mx-1.5 text-border">|</span>
                    대표: {s.ceo_name}
                  </>
                )}
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
                    {s.email && <span className="mx-1.5 text-border">|</span>}
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
