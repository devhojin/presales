import type { Metadata } from 'next'
import { createServerClient } from '@supabase/ssr'
import { SITE_URL } from '@/lib/constants'

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
      openGraph: {
        title: data.title,
        description: desc,
        type: 'article',
        url: `${SITE_URL}/announcements/${id}`,
        siteName: 'PRESALES by AMARANS Partners',
      },
    }
  } catch {
    return { title: '공고 사업 | PRESALES' }
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
