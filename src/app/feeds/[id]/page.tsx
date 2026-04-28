import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Clock, ExternalLink, Rss } from 'lucide-react'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { getCategoryColor, getCategoryLabel, getSourceBadgeStyle, getSourceName } from '@/lib/feed-sources'
import { safeJsonLd } from '@/lib/json-ld'
import { normalizeSeoText, truncateSeoText } from '@/lib/seo-text'

type FeedPost = {
  id: string
  title: string
  content: string | null
  category: string
  source: string | null
  source_name: string | null
  external_url: string | null
  created_at: string | null
  updated_at: string | null
  views: number | null
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getFeedPost(id: string): Promise<FeedPost | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('community_posts')
    .select('id, title, content, category, source, source_name, external_url, created_at, updated_at, views')
    .eq('id', id)
    .eq('is_published', true)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !data) return null
  return data as FeedPost
}

function getFeedSourceLabel(feed: FeedPost): string {
  return feed.source_name || getSourceName(feed.source || '') || SITE_NAME
}

function getFeedDescription(feed: FeedPost): string {
  const contentDescription = truncateSeoText(feed.content, 155)
  if (contentDescription) return contentDescription
  return truncateSeoText(`${getFeedSourceLabel(feed)}에서 수집한 ${getCategoryLabel(feed.category)} IT피드입니다. ${feed.title}`, 155)
}

function formatDate(value: string | null): string {
  if (!value) return '날짜 미상'
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const feed = await getFeedPost(id)

  if (!feed) {
    return {
      title: `IT피드를 찾을 수 없습니다 | ${SITE_NAME}`,
      robots: { index: false, follow: false },
    }
  }

  const pageUrl = `${SITE_URL}/feeds/${id}`
  const title = `${truncateSeoText(feed.title, 42)} | IT피드 | ${SITE_NAME}`
  const description = getFeedDescription(feed)

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function FeedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const feed = await getFeedPost(id)
  if (!feed) notFound()

  const pageUrl = `${SITE_URL}/feeds/${feed.id}`
  const sourceLabel = getFeedSourceLabel(feed)
  const contentText = normalizeSeoText(feed.content)
  const description = getFeedDescription(feed)
  const publishedAt = feed.created_at || feed.updated_at
  const jsonLd = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: feed.title,
    description,
    datePublished: publishedAt,
    dateModified: feed.updated_at || publishedAt,
    articleSection: getCategoryLabel(feed.category),
    author: { '@type': 'Organization', name: sourceLabel },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: pageUrl,
    url: pageUrl,
    ...(feed.external_url ? { sameAs: feed.external_url, isBasedOn: feed.external_url } : {}),
  })

  return (
    <main className="max-w-[960px] mx-auto px-4 md:px-8 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <Link
        href="/feeds"
        className="inline-flex items-center gap-2 py-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        IT피드 목록으로 돌아가기
      </Link>

      <article className="py-8">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getCategoryColor(feed.category)}`}>
            {getCategoryLabel(feed.category)}
          </span>
          <span className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold ${getSourceBadgeStyle(feed.source || '')}`}>
            {sourceLabel}
          </span>
        </div>

        <h1 className="mb-5 text-3xl font-bold tracking-tight text-foreground leading-tight md:text-5xl">
          {feed.title}
        </h1>

        <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-border/50 pb-6 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {formatDate(publishedAt)}
          </span>
          <span>{(feed.views || 0).toLocaleString()} 조회</span>
        </div>

        <section className="mb-8 rounded-xl border border-border/50 bg-muted/30 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Rss className="w-4 h-4 text-primary" />
            프리세일즈 활용 메모
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            이 IT피드는 공공조달 제안서 작성 시 시장동향, 기술 트렌드, 정책 환경 근거로 참고할 수 있도록 수집한 자료입니다.
          </p>
        </section>

        {contentText ? (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
            {contentText}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">본문 요약이 제공되지 않은 피드입니다. 원문에서 상세 내용을 확인하세요.</p>
        )}

        {feed.external_url && (
          <div className="mt-10 border-t border-border/50 pt-6">
            <a
              href={feed.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              원문 보기
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </article>
    </main>
  )
}
