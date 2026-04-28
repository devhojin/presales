import type { Metadata } from 'next'
import { createServerClient } from '@supabase/ssr'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { safeJsonLd } from '@/lib/json-ld'
import { truncateSeoText } from '@/lib/seo-text'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return [] } } }
    )

    const { data } = await supabase
      .from('announcements')
      .select('title, organization, description, end_date, support_areas, regions')
      .eq('id', id)
      .eq('is_published', true)
      .single()

    if (!data) {
      return { title: '공고를 찾을 수 없습니다 | PRESALES' }
    }

    const fallbackParts = [
      data.organization,
      Array.isArray(data.support_areas) ? data.support_areas.slice(0, 2).join(', ') : null,
      Array.isArray(data.regions) ? data.regions.slice(0, 2).join(', ') : null,
      data.end_date ? `마감일 ${data.end_date}` : null,
    ].filter(Boolean)
    const desc = truncateSeoText(data.description, 155) || truncateSeoText(`${fallbackParts.join(' · ')} 공고입니다. ${data.title}`, 155)
    const title = `${truncateSeoText(data.title, 42)} | 공고 | ${SITE_NAME}`
    const pageUrl = `${SITE_URL}/announcements/${id}`

    return {
      title,
      description: desc,
      alternates: { canonical: pageUrl },
      openGraph: {
        title,
        description: desc,
        type: 'article',
        url: pageUrl,
        siteName: SITE_NAME,
        locale: 'ko_KR',
      },
      twitter: {
        card: 'summary',
        title,
        description: desc,
      },
    }
  } catch {
    return { title: `공고 사업 | ${SITE_NAME}` }
  }
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  let jsonLd: Record<string, unknown> | null = null
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return [] } } }
    )
    const { data } = await supabase
      .from('announcements')
      .select('title, organization, description, start_date, end_date, updated_at, source_url, support_areas, regions')
      .eq('id', id)
      .eq('is_published', true)
      .single()
    if (data) {
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: data.title,
        description: truncateSeoText(data.description, 300) || data.title,
        datePublished: data.start_date || data.updated_at,
        dateModified: data.updated_at,
        author: { '@type': 'Organization', name: data.organization || SITE_NAME },
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        mainEntityOfPage: `${SITE_URL}/announcements/${id}`,
        url: `${SITE_URL}/announcements/${id}`,
        ...(data.source_url ? { sameAs: data.source_url } : {}),
        ...(Array.isArray(data.support_areas) && data.support_areas.length > 0 ? { about: data.support_areas.join(', ') } : {}),
        ...(Array.isArray(data.regions) && data.regions.length > 0 ? { spatialCoverage: data.regions.join(', ') } : {}),
      }
    }
  } catch {}

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      )}
      {children}
    </>
  )
}
