'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  FolderOpen,
  Mail,
  Megaphone,
  MessageCircle,
  Pen,
  RotateCcw,
  Rss,
  SearchCheck,
  ShieldCheck,
  Star,
  Target,
  Users,
} from 'lucide-react'
import { useCountUp, useScrollReveal } from '@/hooks/useScrollReveal'
import { createClient } from '@/lib/supabase'

const revealStyle = `
  [data-reveal] {
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  [data-reveal][data-visible="true"] {
    opacity: 1;
    transform: translateY(0);
  }
  [data-reveal-left] {
    opacity: 0;
    transform: translateX(-28px);
    transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  [data-reveal-left][data-visible="true"] {
    opacity: 1;
    transform: translateX(0);
  }
  [data-reveal-right] {
    opacity: 0;
    transform: translateX(28px);
    transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  [data-reveal-right][data-visible="true"] {
    opacity: 1;
    transform: translateX(0);
  }
  [data-reveal-scale] {
    opacity: 0;
    transform: scale(0.97);
    transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }
  [data-reveal-scale][data-visible="true"] {
    opacity: 1;
    transform: scale(1);
  }
  @keyframes hero-pan {
    0%, 100% { transform: scale(1.02) translate3d(0, 0, 0); }
    50% { transform: scale(1.06) translate3d(-1.5%, -1%, 0); }
  }
  @keyframes float-arrow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(7px); }
  }
  @keyframes marquee-scroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .us-hero-image {
    animation: hero-pan 18s ease-in-out infinite;
    transform-origin: center;
  }
  .us-grid-paper {
    background-image:
      linear-gradient(rgba(21, 18, 15, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(21, 18, 15, 0.045) 1px, transparent 1px);
    background-size: 34px 34px;
  }
  .us-text-balance {
    text-wrap: balance;
  }
  @media (prefers-reduced-motion: reduce) {
    [data-reveal],
    [data-reveal-left],
    [data-reveal-right],
    [data-reveal-scale] {
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }
    .us-hero-image,
    [data-marquee] {
      animation: none !important;
    }
  }
`

function Reveal({
  children,
  type = 'up',
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  type?: 'up' | 'left' | 'right' | 'scale'
  delay?: number
  className?: string
}) {
  const ref = useScrollReveal<HTMLDivElement>()
  const attr =
    type === 'left'
      ? 'data-reveal-left'
      : type === 'right'
        ? 'data-reveal-right'
        : type === 'scale'
          ? 'data-reveal-scale'
          : 'data-reveal'

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
  return (
    <>
      <span ref={ref}>0</span>
      {suffix}
    </>
  )
}

function DecimalCountUp({
  target,
  suffix = '',
  decimals = 1,
}: {
  target: number
  suffix?: string
  decimals?: number
}) {
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
          const duration = 1800

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

  return (
    <>
      <span ref={ref}>0</span>
      {suffix}
    </>
  )
}

const problemCards = [
  {
    title: '구색 맞추기 제안서',
    body: '요구사항을 채웠지만, 평가위원이 바로 확인해야 할 답변 구조가 흐려집니다.',
    icon: FileText,
  },
  {
    title: '감으로 시작하는 목차',
    body: '평가표와 목차의 연결이 약하면 좋은 기술도 설득의 순서에서 밀립니다.',
    icon: Pen,
  },
  {
    title: '근거 없는 재작성',
    body: '검증된 흐름 없이 다시 쓰면 마감 직전까지 판단 기준이 흔들립니다.',
    icon: BarChart3,
  },
]

const processSteps = [
  { title: '공고 해석', body: '요구사항과 평가 항목을 먼저 분리합니다.', icon: SearchCheck },
  { title: '목차 매핑', body: '수주 경험이 있는 제안 흐름으로 재배치합니다.', icon: ClipboardCheck },
  { title: '원본 편집', body: 'PPT, PDF 원본을 내려받아 바로 수정합니다.', icon: FolderOpen },
  { title: '제출 준비', body: '발표, 보완, 질의 대응까지 정리합니다.', icon: Target },
]

const ecosystemCards = [
  {
    icon: Megaphone,
    title: '입찰 공고',
    desc: '매일 수집되는 공공조달 공고에서 다음 기회를 빠르게 확인합니다.',
    href: '/announcements',
  },
  {
    icon: Rss,
    title: 'IT피드',
    desc: '정책, 기술, 산업 흐름을 제안서의 배경 근거로 활용합니다.',
    href: '/feeds',
  },
  {
    icon: Mail,
    title: '모닝 브리프',
    desc: '매일 아침 필요한 시장 신호와 신규 공고를 한 번에 받습니다.',
    href: '/brief',
  },
  {
    icon: Users,
    title: '전문가 컨설팅',
    desc: '제안 구조, 평가 대응, 발표 흐름을 실무 관점에서 함께 정리합니다.',
    href: '/consulting',
  },
]

const guaranteeItems = [
  { icon: ShieldCheck, label: '안전한 결제' },
  { icon: Download, label: '즉시 다운로드' },
  { icon: RotateCcw, label: '실전 검증 템플릿' },
  { icon: MessageCircle, label: '1:1 문의 지원' },
]

export default function UsPage() {
  const [productThumbs, setProductThumbs] = useState<{ id: string; title: string; thumbnail_url: string }[]>([])
  const [totalDownloads, setTotalDownloads] = useState<number | null>(null)
  const [productCount, setProductCount] = useState<number | null>(null)
  const [reviewAvg, setReviewAvg] = useState<number | null>(null)
  const [positiveReviewRate, setPositiveReviewRate] = useState<number | null>(null)
  const [testimonials, setTestimonials] = useState<{ quote: string; name: string; role: string }[]>([])

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .then(({ count }) => {
        if (count != null) setProductCount(count)
      })

    supabase
      .from('products')
      .select('download_count, review_avg')
      .eq('is_published', true)
      .then(({ data }) => {
        if (!data) return

        const downloads = data.reduce((sum, p) => sum + (p.download_count || 0), 0)
        setTotalDownloads(downloads)

        const withReviews = data.filter((p) => p.review_avg != null && p.review_avg > 0)
        if (withReviews.length > 0) {
          const avg = withReviews.reduce((sum, p) => sum + p.review_avg, 0) / withReviews.length
          setReviewAvg(Math.round(avg * 10) / 10)
        }
      })

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
        if (data) {
          setProductThumbs(data.filter((p): p is { id: string; title: string; thumbnail_url: string } => !!p.thumbnail_url))
        }
      })
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: revealStyle }} />
      <main className="overflow-x-hidden bg-[#f5f0e7] text-[#17130f]">
        <section className="relative min-h-[92dvh] overflow-hidden bg-[#17130f] text-white">
          <Image
            src="/images/us/presales-strategy-room-gemini.webp"
            alt="공공조달 제안 전략을 논의하는 프리세일즈 팀"
            fill
            priority
            sizes="100vw"
            className="us-hero-image object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,13,9,0.94)_0%,rgba(17,13,9,0.78)_43%,rgba(17,13,9,0.18)_72%,rgba(17,13,9,0.3)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,13,9,0.12)_0%,rgba(17,13,9,0.1)_72%,#f5f0e7_100%)]" />
          <div className="relative z-10 mx-auto flex min-h-[92dvh] max-w-7xl flex-col justify-center px-6 pb-24 pt-28 md:px-10">
            <div className="max-w-4xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.18] bg-white/10 px-4 py-2 text-sm font-semibold text-white/[0.88] backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-[#f2b84b]" />
                프리세일즈 공공조달 제안서 플랫폼
              </p>
              <h1 className="us-text-balance text-4xl font-black leading-[1.08] md:text-6xl lg:text-7xl">
                <span className="md:hidden">
                  <span className="block">제안서 작성 시간을</span>
                  <span className="block">줄이고,</span>
                  <span className="block">수주 가능성에</span>
                  <span className="block">집중하세요.</span>
                </span>
                <span className="hidden md:block">
                  제안서 작성 시간을 줄이고,
                  <br />
                  수주 가능성에 집중하세요.
                </span>
              </h1>
              <p className="mt-7 max-w-[21rem] text-base leading-8 text-white/[0.74] md:max-w-2xl md:text-xl">
                <span className="md:hidden">
                  전문가들이 고민하여 수주한 제안서 흐름을
                  <br />
                  문서 스토어에서 확인하세요.
                  <br />
                  공고 해석부터 제출 준비까지
                  <br />
                  더 선명하게 시작할 수 있습니다.
                </span>
                <span className="hidden md:inline">
                  전문가들이 고민하여 수주한 제안서 흐름을 문서 스토어에서 확인하세요.
                  공고 해석부터 목차 구성, 원본 편집, 제출 준비까지 더 선명하게 시작할 수 있습니다.
                </span>
              </p>
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/store"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-[#f6f0e6] px-8 text-sm font-bold text-[#17130f] shadow-[0_18px_54px_rgba(0,0,0,0.25)] transition hover:bg-white active:scale-[0.98]"
              >
                문서 스토어 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/consulting"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-full border border-white/[0.24] bg-white/10 px-8 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/[0.16] active:scale-[0.98]"
              >
                전문가 상담 받기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-12 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="border-y border-white/20 py-4">
                <p className="text-2xl font-black tabular-nums">{productCount ?? '집계 중'}</p>
                <p className="mt-1 text-xs font-medium text-white/[0.58]">실무형 템플릿</p>
              </div>
              <div className="border-y border-white/20 py-4">
                <p className="text-2xl font-black tabular-nums">{totalDownloads == null ? '집계 중' : `${totalDownloads.toLocaleString()}+`}</p>
                <p className="mt-1 text-xs font-medium text-white/[0.58]">누적 다운로드</p>
              </div>
              <div className="border-y border-white/20 py-4">
                <p className="text-2xl font-black tabular-nums">{reviewAvg == null ? '집계 중' : reviewAvg.toFixed(1)}</p>
                <p className="mt-1 text-xs font-medium text-white/[0.58]">평균 만족도</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/[0.52]" style={{ animation: 'float-arrow 2s ease-in-out infinite' }}>
            <ArrowDown className="h-5 w-5" />
          </div>
        </section>

        <section className="us-grid-paper px-6 py-20 md:px-10 md:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mb-12 max-w-3xl">
              <p className="mb-3 text-sm font-bold text-[#1e5bea]">WHY PRESALES</p>
              <h2 className="us-text-balance text-3xl font-black leading-[1.16] md:text-5xl">
                열심히 쓴 제안서가 마지막에 흔들리는 이유를 줄입니다.
              </h2>
            </Reveal>

            <div className="grid gap-5 md:grid-cols-3">
              {problemCards.map((card, idx) => (
                <Reveal key={card.title} delay={idx * 120}>
                  <article className="h-full rounded-lg border border-[#d8cdbd] bg-[#fffaf2]/90 p-7 shadow-[0_22px_70px_rgba(38,28,16,0.08)]">
                    <card.icon className="mb-8 h-7 w-7 text-[#1f63e9]" />
                    <h3 className="text-xl font-black">{card.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-[#6d6357]">{card.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#17130f] px-6 py-20 text-white md:px-10 md:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.78fr_1.22fr]">
            <Reveal type="left">
              <p className="mb-3 text-sm font-bold text-[#f2b84b]">THE METHOD</p>
              <h2 className="us-text-balance text-3xl font-black leading-[1.16] md:text-5xl">
                검증된 제안 흐름을 업무 자산으로 바꿉니다.
              </h2>
              <p className="mt-6 text-base leading-8 text-white/[0.68]">
                평가표, 요구사항, 목차, 산출물을 한 번에 보며 빈 문서에서 시작하는 시간을 줄입니다.
                공개 가능한 범위로 정리한 실무형 제안서와 원본 파일을 바로 활용할 수 있습니다.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  '민감정보 제거 후 재구성된 실무형 흐름',
                  'PPT, PDF 원본 기반 빠른 편집',
                  '공공조달 문맥에 맞춘 목차와 표현',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-semibold text-white/[0.82]">
                    <CheckCircle2 className="h-5 w-5 text-[#f2b84b]" />
                    {item}
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal type="right" className="grid gap-4 md:grid-cols-2">
              <div className="md:pt-12">
                <Image
                  src="/images/us/proposal-detail.jpg"
                  alt="공공조달 제안서 내부 페이지 예시"
                  width={900}
                  height={560}
                  className="rounded-lg border border-white/[0.12] shadow-[0_28px_80px_rgba(0,0,0,0.35)]"
                />
              </div>
              <div className="grid gap-4">
                <Image
                  src="/images/us/proposal-slides.jpg"
                  alt="제안서 슬라이드 전체 보기"
                  width={900}
                  height={560}
                  className="rounded-lg border border-white/[0.12] shadow-[0_28px_80px_rgba(0,0,0,0.3)]"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Image src="/images/us/toc-1.jpg" alt="제안서 목차 예시 1" width={420} height={560} className="rounded-lg border border-white/[0.12]" />
                  <Image src="/images/us/toc-2.jpg" alt="제안서 목차 예시 2" width={420} height={560} className="rounded-lg border border-white/[0.12]" />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="bg-[#f5f0e7] px-6 py-20 md:px-10 md:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-3xl">
                <p className="mb-3 text-sm font-bold text-[#1e5bea]">WORKFLOW</p>
                <h2 className="us-text-balance text-3xl font-black leading-[1.16] md:text-5xl">
                  공고를 읽고, 문서로 바꾸는 시간을 줄입니다.
                </h2>
              </div>
              <Link
                href="/store"
                className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-[#17130f] px-6 text-sm font-bold text-white transition hover:bg-[#2a221b]"
              >
                템플릿 확인
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>

            <div className="grid gap-4 lg:grid-cols-4">
              {processSteps.map((step, idx) => (
                <Reveal key={step.title} delay={idx * 100}>
                  <article className="relative min-h-64 rounded-lg border border-[#d8cdbd] bg-white/[0.72] p-6 shadow-[0_16px_50px_rgba(38,28,16,0.06)]">
                    <p className="text-sm font-black text-[#b9a58d]">0{idx + 1}</p>
                    <step.icon className="mt-10 h-8 w-8 text-[#1f63e9]" />
                    <h3 className="mt-6 text-xl font-black">{step.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-[#6d6357]">{step.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#fffaf2] px-6 py-20 md:px-10 md:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mb-12 max-w-3xl">
              <p className="mb-3 text-sm font-bold text-[#1e5bea]">BID INTELLIGENCE</p>
              <h2 className="us-text-balance text-3xl font-black leading-[1.16] md:text-5xl">
                제안서만이 아니라 입찰 준비 전체를 연결합니다.
              </h2>
            </Reveal>

            <div className="grid gap-5 md:grid-cols-2">
              {ecosystemCards.map((item, idx) => (
                <Reveal key={item.title} delay={idx * 110}>
                  <Link
                    href={item.href}
                    className="group grid min-h-56 rounded-lg border border-[#d8cdbd] bg-[#f5f0e7] p-7 shadow-[0_18px_62px_rgba(38,28,16,0.07)] transition hover:-translate-y-1 hover:border-[#1f63e9]"
                  >
                    <item.icon className="h-8 w-8 text-[#1f63e9]" />
                    <div className="mt-auto">
                      <h3 className="text-2xl font-black">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[#6d6357]">{item.desc}</p>
                      <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#1f63e9]">
                        바로 보기
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#17130f] px-6 py-20 text-white md:px-10 md:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mb-12 text-center">
              <p className="mb-3 text-sm font-bold text-[#f2b84b]">PROOF</p>
              <h2 className="text-3xl font-black leading-[1.16] md:text-5xl">숫자와 후기로 확인하세요.</h2>
            </Reveal>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                { target: totalDownloads, suffix: '+', label: '누적 다운로드', decimal: false },
                { target: productCount, suffix: '', label: '실무형 템플릿', decimal: false },
                { target: positiveReviewRate, suffix: '%', label: '긍정 후기 비율', decimal: false },
                { target: reviewAvg, suffix: '', label: '평균 만족도', decimal: true },
              ].map((stat, idx) => (
                <Reveal key={stat.label} delay={idx * 90}>
                  <div className="rounded-lg border border-white/[0.12] bg-white/[0.045] p-6 text-center">
                    <p className="text-3xl font-black text-[#f2b84b] tabular-nums md:text-4xl">
                      {stat.target == null ? (
                        <span className="text-base text-white/[0.45]">집계 중</span>
                      ) : stat.decimal ? (
                        <DecimalCountUp target={stat.target} suffix={stat.suffix} />
                      ) : (
                        <CountUp target={stat.target} suffix={stat.suffix} />
                      )}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-white/[0.52]">{stat.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {(testimonials.length > 0
                ? testimonials
                : [{ quote: '실제 구매자 후기가 준비되는 대로 여기에 표시됩니다.', name: '', role: '' }]
              ).map((t, idx) => (
                <Reveal key={`${t.name}-${idx}`} delay={idx * 130}>
                  <article className="h-full rounded-lg border border-white/[0.12] bg-white/[0.045] p-6">
                    <div className="mb-5 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-[#f2b84b] text-[#f2b84b]" />
                      ))}
                    </div>
                    <p className="text-sm leading-7 text-white/[0.74]">&quot;{t.quote}&quot;</p>
                    {(t.name || t.role) && <p className="mt-5 text-xs font-semibold text-white/[0.45]">— {[t.name, t.role].filter(Boolean).join(', ')}</p>}
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f5f0e7] px-6 py-20 md:px-10 md:py-28">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-3 text-sm font-bold text-[#1e5bea]">DOCUMENT STORE</p>
                <h2 className="us-text-balance text-3xl font-black leading-[1.16] md:text-5xl">
                  실무형 제안서를 먼저 훑어보세요.
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#6d6357]">
                  ITS, 스마트시티, 스마트팩토리, AI, 금융SI, 사업계획서까지 공공조달 문맥에 맞춘 문서 흐름을 확인할 수 있습니다.
                </p>
              </div>
              <Link
                href="/store"
                className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-[#1f63e9] px-6 text-sm font-bold text-white shadow-[0_16px_42px_rgba(31,99,233,0.25)] transition hover:bg-[#174fc0]"
              >
                {productCount ? `전체 ${productCount}개 보기` : '문서 스토어 보기'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>

            {productThumbs.length > 0 && (
              <Reveal delay={150}>
                <div
                  className="relative overflow-hidden py-2"
                  style={{
                    maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
                  }}
                >
                  <div data-marquee className="flex w-max gap-5" style={{ animation: 'marquee-scroll 34s linear infinite' }}>
                    {[...productThumbs, ...productThumbs].map((p, i) => (
                      <Link key={`${p.id}-${i}`} href={`/store/${p.id}`} className="group w-48 flex-shrink-0 md:w-60">
                        <div className="overflow-hidden rounded-lg border border-[#d8cdbd] bg-white shadow-[0_14px_48px_rgba(38,28,16,0.08)] transition group-hover:-translate-y-1 group-hover:border-[#1f63e9]">
                          <Image src={p.thumbnail_url} alt={p.title} width={360} height={480} className="h-auto w-full" />
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-[#2d251e]">{p.title}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </section>

        <section className="bg-[#fffaf2] px-6 py-20 md:px-10 md:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal type="left">
              <p className="mb-3 text-sm font-bold text-[#1e5bea]">OUR POINT OF VIEW</p>
              <h2 className="us-text-balance text-3xl font-black leading-[1.16] md:text-5xl">
                좋은 기술이 제안서 때문에 기회를 잃지 않도록.
              </h2>
            </Reveal>
            <Reveal type="right">
              <div className="rounded-lg border border-[#d8cdbd] bg-[#17130f] p-8 text-white shadow-[0_22px_70px_rgba(38,28,16,0.14)] md:p-10">
                <p className="text-xl font-black leading-9 md:text-3xl md:leading-[1.55]">
                  공공조달의 승부는 기술력만이 아니라, 그 기술을 평가 기준에 맞춰 읽히게 만드는 구조에서 갈립니다.
                </p>
                <p className="mt-7 text-base leading-8 text-white/[0.64]">
                  프리세일즈는 제안 흐름, 문서 원본, 공고 정보, 시장 브리프를 연결해 실력 있는 기업이 더 빠르게 준비하도록 돕습니다.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="bg-[#1f63e9] px-6 py-20 text-white md:px-10 md:py-24">
          <div className="mx-auto max-w-5xl text-center">
            <Reveal>
              <h2 className="us-text-balance text-3xl font-black leading-[1.16] md:text-5xl">
                다음 입찰, 더 선명하게 준비하세요.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/[0.74] md:text-base">
                {totalDownloads && totalDownloads > 0 ? `${totalDownloads.toLocaleString()}+ 다운로드가 쌓인` : '공공조달 실무형'} 제안서 템플릿을 지금 확인할 수 있습니다.
              </p>
            </Reveal>
            <Reveal delay={160} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/store"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-white px-8 text-sm font-black text-[#1f63e9] transition hover:bg-[#fffaf2] active:scale-[0.98]"
              >
                제안서 템플릿 둘러보기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/store?price=free"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-full border border-white/[0.35] px-8 text-sm font-black text-white transition hover:bg-white/[0.12] active:scale-[0.98]"
              >
                무료 샘플 받기
              </Link>
            </Reveal>
            <Reveal delay={280} className="mt-10 flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-white/70">
              {guaranteeItems.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
              ))}
            </Reveal>
          </div>
        </section>
      </main>
    </>
  )
}
