import type { Metadata } from 'next'
import { createServerClient } from '@supabase/ssr'
import { SITE_URL } from '@/lib/constants'
import { safeJsonLd } from '@/lib/json-ld'

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
      .select('title, organization, description, end_date')
      .eq('id', id)
      .eq('is_published', true)
      .single()

    if (!data) {
      return { title: '공고를 찾을 수 없습니다 | PRESALES' }
    }

    const desc = data.description
      ? data.description.substring(0, 160).replace(/\n/g, ' ')
      : `${data.organization || ''} - ${data.title}`

    return {
      title: `${data.title} | 공고 사업 | PRESALES`,
      description: desc,
      alternates: { canonical: `${SITE_URL}/announcements/${id}` },
      openGraph: {
        title: data.title,
        description: desc,
        type: 'article',
        url: `${SITE_URL}/announcements/${id}`,
        siteName: 'PRESALES by AMARANS',
      },
    }
  } catch {
    return { title: '공고 사업 | PRESALES' }
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
      .select('title, organization, description, start_date, end_date, updated_at')
      .eq('id', id)
      .eq('is_published', true)
      .single()
    if (data) {
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: data.title,
        description: data.description ? String(data.description).slice(0, 300) : data.title,
        datePublished: data.start_date || data.updated_at,
        dateModified: data.updated_at,
        author: { '@type': 'Organization', name: data.organization || 'PRESALES' },
        publisher: { '@type': 'Organization', name: 'PRESALES by AMARANS' },
        mainEntityOfPage: `${SITE_URL}/announcements/${id}`,
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
