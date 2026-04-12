'use client'

import { useMemo } from 'react'
import { Mail, Calendar, Newspaper, ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'
import DOMPurify from 'dompurify'

interface BriefData {
  id: number
  brief_date: string
  slug: string
  subject: string
  email_html: string
  total_news: number
  total_announcements: number
  sent_at: string | null
  created_at: string
}

export function BriefDetailClient({ brief, dateStr }: { brief: BriefData; dateStr: string }) {
  const sanitized = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return DOMPurify.sanitize(brief.email_html, {
      ADD_ATTR: ['target', 'rel', 'style'],
    })
  }, [brief.email_html])

  return (
    <>
      <Link
        href="/brief"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> 모닝 브리프 목록
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-5 h-5 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Morning Brief</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">{brief.subject}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> {dateStr}
          </span>
          <span className="flex items-center gap-1.5">
            <Newspaper className="w-4 h-4" /> 뉴스 {brief.total_news}건
          </span>
          {brief.total_announcements > 0 && (
            <span className="flex items-center gap-1.5">
              <Send className="w-4 h-4" /> 공고 {brief.total_announcements}건
            </span>
          )}
        </div>
      </div>

      {/* Email HTML body */}
      <div
        className="bg-card border border-border/50 rounded-2xl overflow-hidden"
      >
        <div
          className="brief-email-body"
          dangerouslySetInnerHTML={{ __html: sanitized }}
          style={{ maxWidth: '100%' }}
        />
      </div>

      {/* Subscribe CTA */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          매일 아침 이메일로 받아보고 싶으신가요?
        </p>
        <Link
          href="/brief"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
        >
          <Mail className="w-4 h-4" /> 구독 신청하기
        </Link>
      </div>
    </>
  )
}
