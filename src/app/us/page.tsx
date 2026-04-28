'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, ArrowDown, ShieldCheck, Download, RotateCcw, MessageCircle,
  Megaphone, Rss, Mail, Users, FileText, Pen, BarChart3, Star,
} from 'lucide-react'
import { useScrollReveal, useCountUp } from '@/hooks/useScrollReveal'
import { createClient } from '@/lib/supabase'

/* ============================================================
   CSS-in-JS: 스크롤 애니메이션 스타일 (Tailwind 보조)
   ============================================================ */
const revealStyle = `
  [data-reveal] {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
  }
  [data-reveal][data-visible="true"] {
    opacity: 1;
    transform: translateY(0);
  }
  [data-reveal-left] {
    opacity: 0;
    transform: translateX(-40px);
    transition: opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
  }
  [data-reveal-left][data-visible="true"] {
    opacity: 1;
    transform: translateX(0);
  }
  [data-reveal-right] {
    opacity: 0;
    transform: translateX(40px);
    transition: opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
  }
  [data-reveal-right][data-visible="true"] {
    opacity: 1;
    transform: translateX(0);
  }
  [data-reveal-scale] {
    opacity: 0;
    transform: scale(0.94);
    transition: opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.65s cubic-bezier(0.16, 1, 0.3, 1);
  }
  [data-reveal-scale][data-visible="true"] {
    opacity: 1;
    transform: scale(1);
  }
  @keyframes typing-cursor { 0%,100%{border-color:transparent} 50%{border-color:#3B82F6} }
  @keyframes float-arrow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
  @keyframes pulse-glow {
    0%,100%{opacity:0.06;transform:scale(1)}
    50%{opacity:0.12;transform:scale(1.05)}
  }
  @keyframes marquee-scroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-reveal],[data-reveal-left],[data-reveal-right],[data-reveal-scale] {
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }
  }
`

/* ============================================================
   Reveal wrapper component
   ============================================================ */
function Reveal({ children, type = 'up', delay = 0, className = '' }: {
  children: React.ReactNode
  type?: 'up' | 'left' | 'right' | 'scale'
  delay?: number
  className?: string
}) {
  const ref = useScrollReveal<HTMLDivElement>()
  const attr = type === 'left' ? 'data-reveal-left' : type === 'right' ? 'data-reveal-right' : type === 'scale' ? 'data-reveal-scale' : 'data-reveal'
  return (
    <div
      ref={ref}
      {...{ [attr]: true }}
      style={{ transitionDelay: `${delay}ms` }}
      className={className}
    >
      {children}
    </div>
  )
}

function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useCountUp(target)
  return <><span ref={ref}>0</span>{suffix}</>
}

/**
 * Decimal count-up: animates to a decimal value (e.g. 4.8)
 * Self-contained implementation with IntersectionObserver + requestAnimationFrame
 */
function DecimalCountUp({ target, suffix = '', decimals = 1 }: { target: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let rafId: number | null = null
    let cancelled = false

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const startTime = performance.now()
          const duration = 2000
          function animate(now: number) {
            if (cancelled) return
            const node = ref.current
            if (!node) return
            const progress = Math.min((now - startTime) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            node.textContent = (target * eased).toFixed(decimals)
            if (progress < 1) rafId = requestAnimationFrame(animate)
          }
          rafId = requestAnimationFrame(animate)
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => {
      cancelled = true
      if (rafId !== null) cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [target, decimals])

  return <><span ref={ref}>0</span>{suffix}</>
}

/* ============================================================
   Main Page
   ============================================================ */
export default function UsPage() {
  const [heroReady] = useState(true)
  const [productThumbs, setProductThumbs] = useState<{ id: string; title: string; thumbnail_url: string }[]>([])
  const [totalDownloads, setTotalDownloads] = useState<number | null>(null)
  const [productCount, setProductCount] = useState<number | null>(null)
  const [reviewAvg, setReviewAvg] = useState<number | null>(null)
  const [positiveReviewRate, setPositiveReviewRate] = useState<number | null>(null)
  const [testimonials, setTestimonials] = useState<{ quote: string; name: string; role: string }[]>([])

  // Fetch real stats from Supabase
  useEffect(() => {
    const supabase = createClient()

    // Product count
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .then(({ count }) => {
        if (count != null) setProductCount(count)
      })

    // Total downloads + review average
    supabase
      .from('products')
      .select('download_count, review_avg')
      .eq('is_published', true)
      .then(({ data }) => {
        if (data) {
          const downloads = data.reduce((sum, p) => sum + (p.download_count || 0), 0)
          setTotalDownloads(downloads)

          const withReviews = data.filter((p) => p.review_avg != null && p.review_avg > 0)
          if (withReviews.length > 0) {
            const avg = withReviews.reduce((sum, p) => sum + p.review_avg, 0) / withReviews.length
            setReviewAvg(Math.round(avg * 10) / 10)
          }
        }
      })

    // 긍정 후기 비율 (4점 이상 / 전체) — DB 기반 실제 수치
    supabase
      .from('reviews')
      .select('rating')
      .eq('is_published', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const positive = data.filter((r) => (r.rating ?? 0) >= 4).length
          setPositiveReviewRate(Math.round((positive / data.length) * 100))
        }
      })

    // 실제 후기 3건 (최신 4~5점 + 긴 본문)
    supabase
      .from('reviews')
      .select('content, title, reviewer_name, rating, helpful_count')
      .eq('is_published', true)
      .gte('rating', 4)
      .not('content', 'is', null)
      .order('helpful_count', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data || data.length === 0) return
        const pool = data.filter((r) => (r.content?.length ?? 0) >= 30 && (r.content?.length ?? 0) <= 180)
        const picks = (pool.length >= 3 ? pool : data).slice(0, 3).map((r) => ({
          quote: r.content ?? '',
          name: r.reviewer_name ? `${r.reviewer_name.charAt(0)}○○` : '익명',
          role: r.title ?? '구매 고객',
        }))
        if (picks.length > 0) setTestimonials(picks)
      })
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('products')
      .select('id, title, thumbnail_url')
      .eq('is_published', true)
      .not('thumbnail_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setProductThumbs(data.filter((p): p is { id: string; title: string; thumbnail_url: string } => !!p.thumbnail_url))
      })
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: revealStyle }} />
      <div className="overflow-x-hidden">

      {/* ─── ① HERO: 입찰의 밤 ─── */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center bg-[#0a0a0a] text-white overflow-hidden px-6">
        {/* Glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/[0.06]" style={{ filter: 'blur(120px)', animation: 'pulse-glow 8s ease-in-out infinite' }} />

        <div className="relative z-10 max-w-2xl text-center space-y-6">
          <h1
            className={`text-3xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-tight transition-all duration-1000 ${
              heroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            마감까지 48시간.
          </h1>
          <p
            className={`text-lg md:text-xl text-zinc-400 leading-relaxed transition-all duration-1000 delay-500 ${
              heroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            다 쓴 줄 알았던 제안서를<br className="md:hidden" /> 처음부터 다시 엽니다.
          </p>
          <p
            className={`text-sm text-zinc-500 italic transition-all duration-1000 delay-1000 ${
              heroReady ? 'opacity-100' : 'opacity-0'
            }`}
          >
            &quot;이번에도 떨어지면 어떡하지—&quot;
          </p>
          <div
            className={`flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 transition-all duration-1000 delay-[1200ms] ${
              heroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Link
              href="/store"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-[0.98]"
            >
              문서 스토어 보기
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/store?price=free"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-full border border-white/20 px-7 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              무료 샘플 먼저 보기
            </Link>
          </div>
        </div>

        {/* Scroll arrow */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-zinc-600" style={{ animation: 'float-arrow 2s ease-in-out infinite' }}>
          <ArrowDown className="w-5 h-5" />
        </div>
      </section>

      {/* ─── ② 문제 제기: 카드 팬아웃 ─── */}
      <section className="bg-[#0a0a0a] text-white py-24 md:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
              열심히 쓴 제안서가<br />떨어지는 <span className="text-blue-400">진짜 이유</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: '구색 맞추기 제안서', body: '요구사항을 나열만 하고, 평가위원이 확인해야 할 핵심 답변 구조가 약합니다.', icon: FileText, delay: 0 },
              { title: '처음 보는 구성', body: '공공조달 제안서는 평가표와 목차의 연결이 중요합니다. 그 흐름이 약하면 좋은 내용도 읽히기 어렵습니다.', icon: Pen, delay: 150 },
              { title: '레퍼런스 없는 도전', body: '검증된 제안서 흐름을 보지 못한 채 감으로 쓰면, 준비 시간이 길어지고 판단 기준이 흐려집니다.', icon: BarChart3, delay: 300 },
            ].map((card) => (
              <Reveal key={card.title} delay={card.delay}>
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 md:p-8 backdrop-blur-sm hover:border-blue-500/30 transition-colors">
                  <card.icon className="w-6 h-6 text-blue-400 mb-4" />
                  <h3 className="text-lg font-bold mb-3">{card.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{card.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ③ 전환점: "비밀이 있습니다" ─── */}
      <section className="relative min-h-[80vh] md:min-h-[100vh] flex items-center justify-center bg-[#0a0a0a] text-white px-6 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-full bg-blue-500/[0.1]" style={{ filter: 'blur(100px)' }} />
        </div>
        <div className="relative z-10 max-w-xl text-center space-y-6">
          <Reveal>
            <p className="text-sm text-blue-400 font-medium tracking-wider">그런데요,</p>
          </Reveal>
          <Reveal type="scale" delay={300}>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              <span className="text-blue-400">검증된 제안서 흐름</span>은<br />이미 있습니다.
            </h2>
          </Reveal>
          <Reveal delay={800}>
            <p className="text-lg text-zinc-400">
              수주 경험에서 검증된 목차와 설득 흐름을<br />참고할 수 있다면?
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── ④ 솔루션: 지그재그 ─── */}
      <section className="bg-[#0b0d13] text-white py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-20">
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-[4px] mb-3">PRESALES</p>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight">평가 흐름을 템플릿으로 정리했습니다</h2>
          </Reveal>

          {/* 01 — 실전 수주 경험 기반 구성 */}
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 mb-20">
            <Reveal type="left" className="flex-1">
              <p className="text-6xl font-bold text-blue-500/20 mb-4">01</p>
              <h3 className="text-xl md:text-2xl font-bold mb-4">실전 수주 경험 기반 구성</h3>
              <p className="text-zinc-400 leading-relaxed">ITS, 스마트시티, 스마트팩토리, AI, 금융SI. 민감정보를 제거하고 공개 가능한 범위에서 재구성한 실무형 제안 흐름을 담았습니다.</p>
            </Reveal>
            <Reveal type="right" delay={200} className="flex-1">
              <div className="w-full rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_0_40px_rgba(37,99,235,0.08)]">
                <Image src="/images/us/proposal-detail.jpg" alt="공공조달 제안서 내부 페이지 예시" width={800} height={450} className="w-full h-auto" />
              </div>
            </Reveal>
          </div>

          {/* 02 — 열어서 바로 편집 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16 mb-20">
            <Reveal type="right" className="flex-1">
              <p className="text-6xl font-bold text-blue-500/20 mb-4">02</p>
              <h3 className="text-xl md:text-2xl font-bold mb-4">열어서 바로 편집</h3>
              <p className="text-zinc-400 leading-relaxed">PPT, PDF 원본 파일을 내려받아 우리 회사의 실적, 기술, 일정에 맞게 바로 편집할 수 있습니다.</p>
            </Reveal>
            <Reveal type="left" delay={200} className="flex-1">
              <div className="w-full rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_0_40px_rgba(37,99,235,0.08)]">
                <Image src="/images/us/proposal-slides.jpg" alt="PPT 슬라이드 전체 보기" width={800} height={450} className="w-full h-auto" />
              </div>
            </Reveal>
          </div>

          {/* 03 — 분야별 맞춤 구성 (2x2 그리드) */}
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <Reveal type="left" className="flex-1">
              <p className="text-6xl font-bold text-blue-500/20 mb-4">03</p>
              <h3 className="text-xl md:text-2xl font-bold mb-4">분야별 맞춤 구성</h3>
              <p className="text-zinc-400 leading-relaxed">발주처가 기대하는 목차와 흐름을 이미 갖춘 상태에서 시작하세요. 정보시스템, 인프라, 컨설팅, 연구용역.</p>
            </Reveal>
            <Reveal type="right" delay={200} className="flex-1">
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.08] overflow-hidden p-2 bg-white/[0.02] shadow-[0_0_40px_rgba(37,99,235,0.08)]">
                <Image src="/images/us/toc-1.jpg" alt="제안서 목차 1" width={400} height={560} className="rounded-lg w-full h-auto" />
                <Image src="/images/us/toc-2.jpg" alt="제안서 목차 2" width={400} height={560} className="rounded-lg w-full h-auto" />
                <Image src="/images/us/toc-3.jpg" alt="제안서 목차 3" width={400} height={560} className="rounded-lg w-full h-auto" />
                <Image src="/images/us/toc-4.jpg" alt="제안서 목차 4" width={400} height={560} className="rounded-lg w-full h-auto" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── ⑤ 콘텐츠 생태계 ─── */}
      <section className="bg-[#0a0a0a] text-white py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs text-blue-400 font-semibold tracking-[4px] mb-3">입찰 생태계</p>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight">제안서만이 아닙니다</h2>
            <p className="text-zinc-400 mt-4 max-w-lg mx-auto">입찰 성공에 필요한 모든 것이 여기 있습니다</p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: Megaphone, title: '공고 사업', desc: '매일 자동 수집되는 최신 공공조달 공고. 놓치는 공고 없이 기회를 포착하세요.', href: '/announcements', color: 'from-blue-500/20 to-blue-600/10', delay: 0 },
              { icon: Rss, title: 'IT피드', desc: '스타트업·IT·정책 시장 동향을 실시간 업데이트. 제안서에 최신 트렌드를 반영하세요.', href: '/feeds', color: 'from-orange-500/20 to-orange-600/10', delay: 100 },
              { icon: Mail, title: '모닝 브리프', desc: '매일 아침 이메일로 받는 시장 인사이트. 구독 한 번이면 매일 아침 5분 브리핑.', href: '/brief', color: 'from-violet-500/20 to-violet-600/10', delay: 200 },
              { icon: Users, title: '전문가 컨설팅', desc: '입찰 전략부터 발표 리허설까지 1:1 코칭. 공공조달 전문가가 평가 대응 흐름을 함께 정리합니다.', href: '/consulting', color: 'from-blue-500/20 to-blue-700/10', delay: 300 },
            ].map((item) => (
              <Reveal key={item.title} delay={item.delay}>
                <Link
                  href={item.href}
                  className="block bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 md:p-8 hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ⑥ 사회적 증거: 카운트업 + 후기 ─── */}
      <section className="bg-[#0d0f14] text-white py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs text-blue-400 font-semibold tracking-[4px] mb-3">수주 실적</p>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight">숫자가 말합니다</h2>
          </Reveal>

          {/* 숫자 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { target: totalDownloads, suffix: '+', label: '누적 다운로드', decimal: false },
              { target: productCount, suffix: '', label: '실무형 템플릿', decimal: false },
              { target: positiveReviewRate, suffix: '%', label: '긍정 후기 비율', decimal: false },
              { target: reviewAvg, suffix: '', label: '평균 만족도 (5점)', decimal: true },
            ].map((stat) => (
              <Reveal key={stat.label} className="text-center">
                <p className="text-3xl md:text-5xl font-bold text-blue-400 tabular-nums">
                  {stat.target == null ? (
                    <span className="text-lg md:text-xl text-zinc-500">집계 중</span>
                  ) : stat.decimal ? (
                    <DecimalCountUp target={stat.target} suffix={stat.suffix} />
                  ) : (
                    <CountUp target={stat.target} suffix={stat.suffix} />
                  )}
                </p>
                <p className="text-xs text-zinc-500 mt-2">{stat.label}</p>
              </Reveal>
            ))}
          </div>

          {/* 후기 — DB 기반 실제 후기 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(testimonials.length > 0 ? testimonials : [
              { quote: '실제 구매자 후기가 준비되는 대로 여기에 표시됩니다.', name: '', role: '' },
            ]).map((t, idx) => (
              <Reveal key={`${t.name}-${idx}`} delay={idx * 150}>
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 hover:border-blue-500/20 transition-colors">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-blue-400 fill-blue-400" />
                    ))}
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-4">&quot;{t.quote}&quot;</p>
                  {(t.name || t.role) && (
                    <p className="text-xs text-zinc-500">— {[t.name, t.role].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ⑦ 상품 쇼케이스 (간략 — /store 유도) ─── */}
      <section className="bg-[#0a0a0a] text-white py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <Reveal>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4">실무형 제안서, 지금 확인하세요</h2>
            <p className="text-zinc-400 mb-10">ITS · 스마트시티 · 스마트팩토리 · AI · 금융SI · 사업계획서</p>
          </Reveal>
          <Reveal delay={200}>
            <Link
              href="/store"
              className="inline-flex items-center gap-2 h-14 px-10 rounded-full bg-blue-500 text-white font-semibold text-base hover:bg-blue-400 transition-all active:scale-[0.98] shadow-[0_0_30px_rgba(37,99,235,0.2)]"
            >
              {productCount ? `전체 ${productCount}개 템플릿 보기` : '문서 스토어 보기'}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Reveal>

          {/* 상품 미리보기 마퀴 */}
          {productThumbs.length > 0 && (
            <Reveal delay={400} className="mt-16">
              <div className="relative overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
                <div
                  className="flex gap-4 w-max"
                  style={{ animation: 'marquee-scroll 30s linear infinite' }}
                >
                  {[...productThumbs, ...productThumbs].map((p, i) => (
                    <Link key={`${p.id}-${i}`} href={`/store/${p.id}`} className="flex-shrink-0 w-40 md:w-48">
                      <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.03] hover:border-blue-500/30 transition-colors">
                        <Image
                          src={p.thumbnail_url}
                          alt={p.title}
                          width={240}
                          height={320}
                          className="w-full h-auto"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ─── ⑧ 철학 ─── */}
      <section className="relative min-h-[80vh] md:min-h-[100vh] flex items-center justify-center bg-[#050505] text-white px-6 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-full bg-blue-500/[0.05]" style={{ filter: 'blur(120px)' }} />
        </div>
        <div className="relative z-10 max-w-xl text-center space-y-10">
          <Reveal>
            <p className="text-xs text-blue-400 font-semibold tracking-[4px]">우리의 철학</p>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-xl md:text-2xl lg:text-3xl leading-[1.8] tracking-tight font-medium">
              좋은 기술을 가진 기업이<br />
              제안서 때문에 기회를 잃는 건<br />
              이 시장의 <span className="text-blue-400 underline underline-offset-4 decoration-blue-400/50">정보 격차</span>입니다.
            </p>
          </Reveal>
          <Reveal delay={600}>
            <p className="text-lg md:text-xl text-zinc-400 leading-[1.8]">
              우리는 수주 경험에서 얻은 흐름을 공유해서<br />
              실력 있는 기업이 정당하게 선정되는<br />
              조달 시장을 만들고 싶습니다.
            </p>
          </Reveal>
          <Reveal delay={1000}>
            <p className="text-sm text-zinc-600 italic">— 프리세일즈 팀</p>
          </Reveal>
        </div>
      </section>

      {/* ─── ⑨ 최종 CTA ─── */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)' }}>
        {/* Noise overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

        <div className="relative z-10 max-w-3xl mx-auto text-center text-white">
          <Reveal>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4">
              다음 입찰,<br className="md:hidden" /> 더 선명하게 준비하세요
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-white/70 mb-10">{totalDownloads && totalDownloads > 0 ? `${totalDownloads.toLocaleString()}+ 다운로드 달성` : '공공조달 실무형'} 제안서 템플릿</p>
          </Reveal>
          <Reveal delay={400} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              href="/store"
              className="h-14 px-10 rounded-full bg-white text-blue-800 font-bold text-base hover:bg-white/90 transition-all active:scale-[0.98] flex items-center gap-2 shadow-lg"
            >
              제안서 템플릿 둘러보기
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/store?price=free"
              className="h-14 px-10 rounded-full border-2 border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-all flex items-center gap-2"
            >
              무료 샘플 받기
            </Link>
          </Reveal>
          <Reveal delay={600}>
            <div className="flex flex-wrap items-center justify-center gap-6 text-white/60 text-xs">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> 안전한 결제</span>
              <span className="flex items-center gap-1.5"><Download className="w-4 h-4" /> 즉시 다운로드</span>
              <span className="flex items-center gap-1.5"><RotateCcw className="w-4 h-4" /> 실전 검증 템플릿</span>
              <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> 1:1 문의 지원</span>
            </div>
          </Reveal>
        </div>
      </section>
      </div>
    </>
  )
}
