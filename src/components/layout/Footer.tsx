'use client'

import { type MouseEvent } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Mail, MapPin } from 'lucide-react'
import { BUSINESS_INFO } from '@/lib/business-info'

const FOOTER_GROUPS = [
  {
    title: '서비스',
    links: [
      { href: '/store', label: '문서 스토어' },
      { href: '/store?price=free', label: '무료 자료' },
      { href: '/consulting', label: '전문가 컨설팅' },
      { href: '/announcements', label: '입찰 공고' },
    ],
  },
  {
    title: '콘텐츠',
    links: [
      { href: '/brief', label: '모닝 브리프' },
      { href: '/feeds', label: 'IT피드' },
      { href: '/notices', label: '공지사항' },
    ],
  },
  {
    title: '고객지원',
    links: [
      { href: '/faq', label: '자주 묻는 질문' },
      { href: 'mailto:help@presales.co.kr', label: '이메일 문의', external: true },
      { href: '/refund', label: '환불정책' },
    ],
  },
  {
    title: '프리세일즈',
    links: [
      { href: '/us', label: '회사 소개' },
      { href: '/terms', label: '이용약관' },
      { href: '/privacy', label: '개인정보처리방침', strong: true },
    ],
  },
]

const BUSINESS_INFO_URL = '/business-info'

export function Footer() {
  const openBusinessInfo = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const popup = window.open(
      BUSINESS_INFO_URL,
      'presales-business-info',
      'width=820,height=920,scrollbars=yes,resizable=yes'
    )
    if (popup) popup.opener = null
  }

  const renderFooterLink = (link: { href: string; label: string; strong?: boolean; external?: boolean }) => {
    const className = `text-sm transition-colors duration-300 inline-flex items-center gap-1 group ${
      link.strong
        ? 'font-medium text-foreground hover:text-primary'
        : 'text-muted-foreground hover:text-foreground'
    }`

    if (link.external) {
      return (
        <a href={link.href} className={className}>
          {link.label}
        </a>
      )
    }

    return (
      <Link href={link.href} className={className}>
        {link.label}
        {link.href === '/notices' && (
          <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
        )}
      </Link>
    )
  }

  return (
    <footer className="border-t border-border bg-[#F7F7F4]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="py-12 md:py-14">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.7fr] lg:gap-16">
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
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {FOOTER_GROUPS.map((group) => (
                <nav key={group.title} aria-label={group.title}>
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-5">{group.title}</h4>
                  <ul className="space-y-3.5">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        {renderFooterLink(link)}
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border py-8">
          <div className="rounded-2xl bg-[#0F172A] ring-1 ring-white/10 overflow-hidden shadow-[0_28px_80px_-52px_rgba(15,23,42,0.85)]">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
              <div className="border-b border-white/10 px-4 py-4 md:border-r xl:border-b-0">
                <p className="text-[11px] font-semibold text-slate-400">상호</p>
                <p className="mt-1 text-sm font-medium text-white">{BUSINESS_INFO.companyName}</p>
              </div>
              <div className="border-b border-white/10 px-4 py-4 xl:border-r xl:border-b-0">
                <p className="text-[11px] font-semibold text-slate-400">대표자</p>
                <p className="mt-1 text-sm font-medium text-white">{BUSINESS_INFO.ceoName}</p>
              </div>
              <div className="border-b border-white/10 px-4 py-4 md:border-r md:border-b-0">
                <p className="text-[11px] font-semibold text-slate-400">사업자등록번호</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-white">{BUSINESS_INFO.businessNumber}</span>
                  <a
                    href={BUSINESS_INFO_URL}
                    onClick={openBusinessInfo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 text-[11px] font-semibold text-slate-100 hover:border-blue-300/50 hover:bg-blue-500/15 hover:text-blue-100 transition-colors"
                    aria-label="사업자정보확인 새창 열기"
                  >
                    사업자정보확인
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="px-4 py-4">
                <p className="text-[11px] font-semibold text-slate-400">통신판매업신고</p>
                <p className="mt-1 text-sm font-medium text-white">{BUSINESS_INFO.commerceNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 border-t border-white/10 md:grid-cols-[1.25fr_0.75fr]">
              <div className="px-4 py-4 md:border-r border-white/10">
                <p className="text-[11px] font-semibold text-slate-400">사업장 주소</p>
                <p className="mt-1 inline-flex items-start gap-2 text-sm text-slate-100">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {BUSINESS_INFO.address}
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[11px] font-semibold text-slate-400">전자우편</p>
                <a href={`mailto:${BUSINESS_INFO.email}`} className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-slate-100 hover:text-blue-200">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {BUSINESS_INFO.email}
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 border-t border-white/10 md:grid-cols-3">
              <div className="px-4 py-4 md:border-r border-white/10">
                <p className="text-[11px] font-semibold text-slate-400">출판사 신고번호</p>
                <p className="mt-1 text-sm font-medium text-white">{BUSINESS_INFO.publisherNumber}</p>
              </div>
              <div className="px-4 py-4 md:border-r border-white/10">
                <p className="text-[11px] font-semibold text-slate-400">고객센터</p>
                <a href={`tel:${BUSINESS_INFO.phone.replace(/[^0-9+]/g, '')}`} className="mt-1 block text-sm font-medium text-white hover:text-blue-200">
                  {BUSINESS_INFO.phone}
                </a>
                <p className="mt-1 text-xs text-slate-400">{BUSINESS_INFO.supportHours}</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[11px] font-semibold text-slate-400">입금계좌</p>
                <p className="mt-1 text-sm font-medium text-white">{BUSINESS_INFO.bankAccount}</p>
              </div>
            </div>

            <div className="border-t border-white/10 px-4 py-4">
              <p className="text-[11px] font-semibold text-slate-400">문의 안내</p>
              <p className="mt-1 text-sm leading-6 text-slate-100">
                문서 구매, 다운로드, 입금 확인, 컨설팅 문의는 이메일 또는 채팅으로 접수됩니다.
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            프리세일즈의 디지털 문서 상품은 결제 또는 무통장입금 승인 후 다운로드가 제공됩니다.
            상품, 결제, 환불, 개인정보 처리 기준은 각 정책 문서에서 확인하실 수 있습니다.
          </p>
        </div>

        <div className="py-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground">이용약관</Link>
              <Link href="/privacy" className="font-semibold text-foreground hover:text-primary">개인정보처리방침</Link>
              <Link href="/refund" className="hover:text-foreground">환불정책</Link>
              <Link href="/notices" className="hover:text-foreground">공지사항</Link>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {BUSINESS_INFO.serviceName}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
