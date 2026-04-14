'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Mail, Loader2, Calendar, ArrowLeft, Newspaper, CheckCircle2, Send,
} from 'lucide-react'
import DOMPurify from 'dompurify'
import { useToastStore } from '@/stores/toast-store'

interface DailyBrief {
  id: number
  brief_date: string
  slug: string
  subject: string
  email_html: string
  total_news: number
  total_announcements: number
  created_at: string
  sent_at: string | null
}

export default function BriefPage() {
  const { addToast } = useToastStore()
  const supabase = useMemo(() => createClient(), [])

  const [briefs, setBriefs] = useState<DailyBrief[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [subscribeEmail, setSubscribeEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeDone, setSubscribeDone] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('daily_briefs')
          .select('id, brief_date, slug, subject, email_html, total_news, total_announcements, created_at, sent_at')
          .eq('is_published', true)
          .order('brief_date', { ascending: false })
          .limit(365)
        if (error) throw error
        const list = (data || []) as DailyBrief[]
        setBriefs(list)
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id)
        }
      } catch (e) {
        addToast(e instanceof Error ? e.message : '브리프 로드 실패', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedBrief = useMemo(
    () => briefs.find((b) => b.id === selectedId) || null,
    [briefs, selectedId],
  )

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id)
    setShowDetail(true)
    // URL 해시 업데이트
    const b = briefs.find((x) => x.id === id)
    if (b) window.history.replaceState({}, '', `#${b.slug}`)
  }, [briefs])

  const handleSubscribe = async () => {
    const email = subscribeEmail.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addToast('올바른 이메일 주소를 입력해주세요', 'error')
      return
    }
    setSubscribing(true)
    try {
      const res = await fetch('/api/brief/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        addToast(data.error || '구독 신청 실패', 'error')
        return
      }
      setSubscribeDone(true)
      setSubscribeEmail('')
      addToast('✉️ 구독 신청 완료! 내일 아침부터 받으실 수 있습니다', 'success')
    } catch {
      addToast('요청 중 오류가 발생했습니다', 'error')
    } finally {
      setSubscribing(false)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
  }

  const formatDateShort = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      {/* Header */}
      <div className="py-8 md:py-12">
        <div className="flex items-center gap-3 mb-3">
          <Mail className="w-7 h-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">모닝 브리프</h1>
        </div>
        <p className="text-muted-foreground">
          공공조달·스마트시티·창업지원·AI/IoT 관련 시장 동향과 신규 공고를 매일 아침 정리해서 보내드립니다.
        </p>
      </div>

      {/* Subscribe banner */}
      <div className="mb-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Send className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm md:text-base">매일 아침 이메일로 받아보세요</h2>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              구독 무료 · 수신 거부 언제든 가능 · 하루 1통만 발송
            </p>
          </div>
          {subscribeDone ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              구독 완료
            </div>
          ) : (
            <div className="flex gap-2 w-full md:w-auto md:min-w-[360px]">
              <input
                type="email"
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubscribe() }}
                placeholder="your@email.com"
                disabled={subscribing}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
              <button
                onClick={handleSubscribe}
                disabled={subscribing || !subscribeEmail.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {subscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : '구독하기'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : briefs.length === 0 ? (
        <div className="text-center py-24">
          <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">아직 발송된 브리프가 없습니다</p>
          <p className="text-xs text-muted-foreground">구독해두시면 내일 아침부터 받으실 수 있어요</p>
        </div>
      ) : (
        <div className="flex gap-4 mb-12 items-start">
          {/* LEFT: 브리프 리스트 */}
          <div className={`${showDetail ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[38%] border border-border/50 rounded-2xl overflow-hidden bg-card`}>
            <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
              <p className="text-xs text-muted-foreground font-medium">{briefs.length}개 브리프 · 최신순</p>
            </div>
            <div className="divide-y divide-border/50">
              {briefs.map((b) => {
                const isActive = b.id === selectedId
                return (
                  <button
                    key={b.id}
                    onClick={() => handleSelect(b.id)}
                    className={`w-full text-left px-4 py-4 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-primary/5 border-l-2 border-l-primary'
                        : 'hover:bg-muted/50 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs font-semibold text-foreground">
                        {formatDate(b.brief_date)}
                      </span>
                    </div>
                    <p className={`text-sm leading-snug line-clamp-2 mb-2 ${isActive ? 'text-foreground font-semibold' : 'text-foreground'}`}>
                      {b.subject}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Newspaper className="w-3 h-3" /> 뉴스 {b.total_news}
                      </span>
                      {b.total_announcements > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" /> 공고 {b.total_announcements}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* SEO: 개별 브리프 링크 (크롤러용, 화면에 보이지 않음) */}
          <nav className="sr-only" aria-label="브리프 아카이브">
            {briefs.map((b) => (
              <a key={b.slug} href={`/brief/${b.slug}`}>
                {b.subject}
              </a>
            ))}
          </nav>

          {/* RIGHT: 이메일 본문 */}
          <div
            className={`${showDetail ? 'flex' : 'hidden md:flex'} flex-col flex-1 border border-border/50 rounded-2xl overflow-hidden bg-card sticky self-start`}
            style={{ top: '80px', height: 'calc(100vh - 100px)' }}
          >
            {selectedBrief ? (
              <BriefDetail brief={selectedBrief} onBack={() => setShowDetail(false)} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">좌측에서 브리프를 선택하세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BriefDetail({ brief, onBack }: { brief: DailyBrief; onBack: () => void }) {
  const sanitized = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return DOMPurify.sanitize(brief.email_html, {
      ADD_ATTR: ['target', 'rel', 'style'],
    })
  }, [brief.email_html])

  const formatFullDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    })
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50 bg-muted/20 shrink-0">
        <div className="min-w-0 flex-1">
          <button
            onClick={onBack}
            className="md:hidden flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" /> 목록으로
          </button>
          <h2 className="text-sm md:text-base font-semibold truncate">{brief.subject}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            📅 {formatFullDate(brief.brief_date)}
            {' · '}
            뉴스 <strong>{brief.total_news}</strong>건
            {brief.total_announcements > 0 && (
              <> · 공고 <strong>{brief.total_announcements}</strong>건</>
            )}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="brief-email-body"
          dangerouslySetInnerHTML={{ __html: sanitized }}
          style={{ maxWidth: '100%' }}
        />
      </div>
    </>
  )
}
