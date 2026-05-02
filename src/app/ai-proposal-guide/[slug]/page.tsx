import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarDays, Clock, Layers3 } from 'lucide-react'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { safeJsonLd } from '@/lib/json-ld'
import {
  AI_PROPOSAL_GUIDE_BASE_PATH,
  AI_PROPOSAL_GUIDE_TITLE,
  aiProposalGuideIndexUrl,
  aiProposalGuideUrl,
  getAdjacentAiProposalGuides,
  getAiProposalGuide,
  getAiProposalGuideCategory,
  getAiProposalGuideImageUrl,
  getAiProposalGuideSeoDescription,
  getAiProposalGuideSeoKeywords,
  getAiProposalGuideSeoTitle,
  getAiProposalGuideWordCount,
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
  const imageUrl = getAiProposalGuideImageUrl(guide)
  const seoDescription = getAiProposalGuideSeoDescription(guide)
  const seoKeywords = getAiProposalGuideSeoKeywords(guide)
  const seoTitle = getAiProposalGuideSeoTitle(guide)
  return {
    title: seoTitle,
    description: seoDescription,
    keywords: seoKeywords,
    category: 'business',
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    publisher: SITE_NAME,
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'article',
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
      images: [{ url: imageUrl, width: 1200, height: 760, alt: guide.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      images: [imageUrl],
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
  const imageUrl = getAiProposalGuideImageUrl(guide)
  const seoDescription = getAiProposalGuideSeoDescription(guide)
  const seoKeywords = getAiProposalGuideSeoKeywords(guide)
  const seoTitle = getAiProposalGuideSeoTitle(guide)
  const articleBodyText = plainTextFromGuideHtml(guide.bodyHtml)
  const sanitizedHtml = sanitizeGuideHtml(guide.bodyHtml)
  const relatedGuides = content.articles
    .filter((item) => item.slug !== guide.slug && item.categorySlug === guide.categorySlug)
    .slice(0, 4)
  const jsonLd = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: seoDescription,
    url,
    image: [imageUrl],
    thumbnailUrl: imageUrl,
    inLanguage: 'ko-KR',
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    keywords: seoKeywords,
    articleSection: category?.title || 'AI 제안서 작성법',
    articleBody: articleBodyText.slice(0, 5000),
    wordCount: getAiProposalGuideWordCount(guide),
    timeRequired: `PT${guide.readingMinutes}M`,
    isPartOf: {
      '@type': 'CreativeWorkSeries',
      name: AI_PROPOSAL_GUIDE_TITLE,
      url: aiProposalGuideIndexUrl(),
    },
    about: guide.keywords.slice(0, 6).map((keyword) => ({
      '@type': 'Thing',
      name: keyword,
    })),
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  })
  const webPageJsonLd = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seoTitle,
    description: seoDescription,
    url,
    inLanguage: 'ko-KR',
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: imageUrl,
    },
    about: seoKeywords.slice(0, 8).map((keyword) => ({
      '@type': 'Thing',
      name: keyword,
    })),
  })
  const breadcrumbJsonLd = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: SITE_NAME,
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: AI_PROPOSAL_GUIDE_TITLE,
        item: aiProposalGuideIndexUrl(),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: guide.title,
        item: url,
      },
    ],
  })

  return (
    <main className="overflow-x-hidden bg-[#F7F6F2] text-zinc-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: webPageJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1120px] gap-10 px-4 py-12 md:grid-cols-[1fr_300px] md:px-8 md:py-16">
          <div className="min-w-0">
            <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600" aria-label="breadcrumb">
              <Link href="/" className="hover:text-blue-700">{SITE_NAME}</Link>
              <span aria-hidden="true">/</span>
              <Link href={AI_PROPOSAL_GUIDE_BASE_PATH} className="hover:text-blue-700">{AI_PROPOSAL_GUIDE_TITLE}</Link>
              <span aria-hidden="true">/</span>
              <span className="text-zinc-950">{guide.title}</span>
            </nav>
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
          <h2 className="text-xl font-bold text-zinc-950">핵심 주제</h2>
          <p className="mt-4 break-words text-sm leading-7 text-slate-600">
            이 글은 {guide.primaryKeyword}를 중심으로 {seoKeywords.slice(1, 5).join(', ')} 실무를 함께 다룹니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {seoKeywords.slice(0, 8).map((keyword) => (
              <span key={keyword} className="inline-flex items-center border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                {keyword}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-14 border-t border-slate-200 pt-8">
          <h2 className="text-xl font-bold text-zinc-950">관련 페이지</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <LinkPill href="/store" label="제안서 템플릿 문서 스토어" />
            <LinkPill href="/announcements" label="나라장터 입찰 공고 보기" />
            <LinkPill href="/consulting" label="AI 제안서 컨설팅 문의" />
          </div>
        </section>

        {relatedGuides.length > 0 && (
          <section className="mt-10 border-t border-slate-200 pt-8">
            <h2 className="text-xl font-bold text-zinc-950">같은 카테고리 글</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {relatedGuides.map((relatedGuide) => (
                <Link
                  key={relatedGuide.slug}
                  href={`${AI_PROPOSAL_GUIDE_BASE_PATH}/${relatedGuide.slug}`}
                  className="group min-w-0 border border-slate-200 bg-white p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/35"
                >
                  <p className="text-xs font-semibold text-blue-700">{relatedGuide.primaryKeyword}</p>
                  <h3 className="mt-2 break-words text-sm font-bold text-zinc-950 group-hover:text-blue-800">
                    {relatedGuide.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-slate-600">
                    {relatedGuide.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

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
