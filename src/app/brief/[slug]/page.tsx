import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_ALT, SITE_URL } from '@/lib/constants'
import { safeJsonLd } from '@/lib/json-ld'
import type { PublicBrief } from '@/lib/public-briefs'
import { getPublicMorningBriefBySlug } from '@/lib/public-briefs-server'
import { BriefDetailClient } from './brief-detail-client'

interface Props {
  params: Promise<{ slug: string }>
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getBrief(slug: string): Promise<PublicBrief | null> {
  try {
    return await getPublicMorningBriefBySlug(slug)
  } catch {
    return null
  }
}

function briefDescription(brief: PublicBrief, dateStr: string): string {
  return brief.total_announcements > 0
    ? `${dateStr} 시장동향 브리프 — 뉴스 ${brief.total_news}건, 공고 ${brief.total_announcements}건`
    : `${dateStr} 시장동향 브리프 — 뉴스 ${brief.total_news}건`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const brief = await getBrief(slug)
  if (!brief) return { title: '브리프를 찾을 수 없습니다' }

  const dateStr = new Date(brief.brief_date).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const title = `${brief.subject} | 모닝 브리프`
  const description = briefDescription(brief, dateStr)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/brief/${slug}`,
      type: 'article',
      publishedTime: brief.sent_at || brief.created_at,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: DEFAULT_OG_IMAGE_ALT }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
    alternates: {
      canonical: `${SITE_URL}/brief/${slug}`,
    },
  }
}

export default async function BriefSlugPage({ params }: Props) {
  const { slug } = await params
  const brief = await getBrief(slug)
  if (!brief) notFound()

  const dateStr = new Date(brief.brief_date).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-8 py-8 md:py-12">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: brief.subject,
            datePublished: brief.sent_at || brief.created_at,
            dateModified: brief.sent_at || brief.created_at,
            description: briefDescription(brief, dateStr),
            publisher: {
              '@type': 'Organization',
              name: 'PRESALES by AMARANS',
              url: SITE_URL,
            },
            mainEntityOfPage: `${SITE_URL}/brief/${slug}`,
          }),
        }}
      />

      <BriefDetailClient
        brief={{
          id: brief.id,
          brief_date: brief.brief_date,
          slug: brief.slug,
          subject: brief.subject,
          email_html: brief.email_html,
          total_news: brief.total_news,
          total_announcements: brief.total_announcements,
          sent_at: brief.sent_at,
          created_at: brief.created_at,
        }}
        dateStr={dateStr}
      />
    </div>
  )
}
