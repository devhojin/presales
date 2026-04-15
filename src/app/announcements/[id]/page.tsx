import { type Metadata } from 'next'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SITE_URL, SITE_NAME } from '@/lib/constants'
import { formatPeriod } from '@/lib/announcements'
import AnnouncementDetailClient from './_components/AnnouncementDetailClient'

async function getAnnouncement(id: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  const { data } = await supabase
    .from('announcements')
    .select('id, title, organization, description, start_date, end_date, status, source')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  return data
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const ann = await getAnnouncement(id)

  if (!ann) {
    return {
      title: `공고를 찾을 수 없습니다 | ${SITE_NAME}`,
    }
  }

  const title = `${ann.title} | ${SITE_NAME}`
  const period = formatPeriod(ann.start_date, ann.end_date)
  const orgText = ann.organization ? `${ann.organization} · ` : ''
  const description = ann.description
    ? ann.description.slice(0, 120)
    : `${orgText}접수기간: ${period}`
  const pageUrl = `${SITE_URL}/announcements/${id}`

  return {
    title,
    description,
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
    alternates: {
      canonical: pageUrl,
    },
  }
}

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ann = await getAnnouncement(id)

  // NewsArticle JSON-LD for SEO structured data
  // Content is serialized via JSON.stringify from our own DB — safe from XSS
  const newsArticleJsonLd = ann
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: ann.title,
        ...(ann.description ? { description: ann.description.slice(0, 300) } : {}),
        ...(ann.start_date ? { datePublished: ann.start_date } : {}),
        ...(ann.end_date ? { dateModified: ann.end_date } : {}),
        author: ann.organization
          ? { '@type': 'Organization', name: ann.organization }
          : { '@type': 'Organization', name: SITE_NAME },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
        },
        url: `${SITE_URL}/announcements/${id}`,
      })
    : null

  return (
    <>
      {newsArticleJsonLd && (
        <script
          type="application/ld+json"
          // Content is JSON.stringify output from our own DB — not user-controlled HTML
          dangerouslySetInnerHTML={{ __html: newsArticleJsonLd }}
        />
      )}
      <AnnouncementDetailClient params={params} />
    </>
  )
}
