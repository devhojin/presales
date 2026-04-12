import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'
import { BriefDetailClient } from './brief-detail-client'

interface Props {
  params: Promise<{ slug: string }>
}

async function getBrief(slug: string) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] } } },
  )

  const { data } = await supabase
    .from('daily_briefs')
    .select('id, brief_date, slug, subject, email_html, total_news, total_announcements, sent_at, created_at')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()

  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const brief = await getBrief(slug)
  if (!brief) return { title: '브리프를 찾을 수 없습니다' }

  const dateStr = new Date(brief.brief_date).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const title = `${brief.subject} | 모닝 브리프`
  const description = `${dateStr} 시장동향 브리프 — 뉴스 ${brief.total_news}건, 공고 ${brief.total_announcements}건`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/brief/${slug}`,
      type: 'article',
      publishedTime: brief.sent_at || brief.created_at,
    },
    twitter: {
      card: 'summary',
      title,
      description,
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
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: brief.subject,
            datePublished: brief.sent_at || brief.created_at,
            dateModified: brief.created_at,
            description: `${dateStr} 시장동향 브리프 — 뉴스 ${brief.total_news}건, 공고 ${brief.total_announcements}건`,
            publisher: {
              '@type': 'Organization',
              name: 'PRESALES by AMARANS Partners',
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
