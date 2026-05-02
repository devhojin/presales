import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarDays, Clock, Layers3 } from 'lucide-react'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { safeJsonLd } from '@/lib/json-ld'
import {
  AI_PROPOSAL_GUIDE_BASE_PATH,
  aiProposalGuideIndexUrl,
  aiProposalGuideUrl,
  getAdjacentAiProposalGuides,
  getAiProposalGuide,
  getAiProposalGuideCategory,
  plainTextFromGuideHtml,
  sanitizeGuideHtml,
  type AiProposalGuideStep,
} from '@/lib/ai-proposal-guide'
import { getPublishedAiProposalGuideServerContent } from '@/lib/ai-proposal-guide-server'
import { GuideCover } from '@/components/ai-proposal-guide/GuideCover'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const content = await getPublishedAiProposalGuideServerContent()
  const guide = getAiProposalGuide(slug, content)
  if (!guide) return { title: `페이지를 찾을 수 없습니다 | ${SITE_NAME}` }

  const url = aiProposalGuideUrl(guide.slug)
  return {
    title: `${guide.title} | AI 제안서 작성법`,
    description: guide.description,
    keywords: guide.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: `${guide.title} | ${SITE_NAME}`,
      description: guide.description,
      url,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'article',
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
      images: [{ url: guide.coverImageUrl || '/images/hero-ai-readiness.webp', width: 1200, height: 630, alt: guide.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${guide.title} | ${SITE_NAME}`,
      description: guide.description,
      images: [guide.coverImageUrl || '/images/hero-ai-readiness.webp'],
    },
  }
}

export default async function AiProposalGuideDetailPage({ params }: PageProps) {
  const { slug } = await params
  const content = await getPublishedAiProposalGuideServerContent()
  const guide = getAiProposalGuide(slug, content)
  if (!guide) notFound()

  const category = getAiProposalGuideCategory(guide.categorySlug, content)
  const { previous, next } = getAdjacentAiProposalGuides(guide.step, content)
  const url = aiProposalGuideUrl(guide.slug)
  const articleBodyText = plainTextFromGuideHtml(guide.bodyHtml)
  const sanitizedHtml = sanitizeGuideHtml(guide.bodyHtml)
  const jsonLd = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    url,
    inLanguage: 'ko-KR',
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    keywords: guide.keywords,
    articleSection: category?.title || 'AI 제안서 작성법',
    articleBody: articleBodyText.slice(0, 5000),
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  })

  return (
    <main className="overflow-x-hidden bg-[#F7F6F2] text-zinc-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-4 py-12 md:grid-cols-[1fr_300px] md:px-8 md:py-16">
          <div className="min-w-0">
            <Link
              href={AI_PROPOSAL_GUIDE_BASE_PATH}
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              AI 제안서 작성법 전체보기
            </Link>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 items-center bg-blue-700 px-3 text-xs font-bold text-white">
                {String(guide.step).padStart(2, '0')}
              </span>
              {category && (
                <span className="inline-flex h-8 items-center border border-blue-100 bg-blue-50 px-3 text-xs font-semibold text-blue-800">
                  {category.title}
                </span>
              )}
              <span className="inline-flex h-8 items-center gap-1 text-xs font-semibold text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                {guide.readingMinutes}분
              </span>
            </div>
            <h1 className="max-w-3xl break-words text-4xl font-black leading-tight tracking-normal text-zinc-950 md:text-6xl">
              {guide.title}
            </h1>
            <p className="mt-6 max-w-3xl break-words text-base leading-8 text-slate-600 md:text-lg">
              {guide.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(guide.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Layers3 className="h-3.5 w-3.5" />
                {guide.primaryKeyword}
              </span>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[260px] md:max-w-none">
            <GuideCover guide={guide} priority />
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-[880px] px-4 py-12 md:px-8 md:py-16">
        <div
          className="ai-guide-body break-words text-slate-700"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />

        <section className="mt-14 border-t border-slate-200 pt-8">
          <h2 className="text-xl font-bold text-zinc-950">관련 페이지</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <LinkPill href="/store" label="문서 스토어" />
            <LinkPill href="/announcements" label="입찰 공고" />
            <LinkPill href="/consulting" label="제안서 컨설팅" />
          </div>
        </section>

        <nav className="mt-10 grid gap-3 border-t border-slate-200 pt-8 md:grid-cols-2" aria-label="AI 제안서 작성법 이전 다음 글">
          {previous ? <AdjacentLink guide={previous} direction="prev" /> : <div />}
          {next ? <AdjacentLink guide={next} direction="next" /> : <div />}
        </nav>
      </article>
    </main>
  )
}

function LinkPill({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-zinc-900 transition-colors hover:border-blue-300 hover:text-blue-700"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

function AdjacentLink({ guide, direction }: { guide: AiProposalGuideStep; direction: 'prev' | 'next' }) {
  const isNext = direction === 'next'
  return (
    <Link
      href={`${AI_PROPOSAL_GUIDE_BASE_PATH}/${guide.slug}`}
      className={`group min-w-0 border border-slate-200 bg-white p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/35 ${
        isNext ? 'text-right' : ''
      }`}
    >
      <p className="text-xs font-semibold text-slate-500">{isNext ? '다음 글' : '이전 글'}</p>
      <div className={`mt-2 flex items-center gap-2 ${isNext ? 'justify-end' : 'justify-start'}`}>
        {!isNext && <ArrowLeft className="h-4 w-4 text-blue-700" />}
        <span className="min-w-0 break-words text-sm font-bold text-zinc-950 group-hover:text-blue-800">{guide.title}</span>
        {isNext && <ArrowRight className="h-4 w-4 text-blue-700" />}
      </div>
    </Link>
  )
}
