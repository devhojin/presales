import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Public API: Get published IT feeds
 * GET /api/feeds?page=1&pageSize=20&search=...&category=news
 * Returns only is_published=true AND status='published'
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20))
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let query = supabase
      .from('community_posts')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .eq('status', 'published')

    // Category filter
    if (category) {
      query = query.eq('category', category)
    }

    // Search filter
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,content.ilike.%${search}%`
      )
    }

    // Pagination
    const offset = (page - 1) * pageSize
    const { data: posts, error: queryError, count: total } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    return NextResponse.json({
      posts: posts || [],
      total: total || 0,
      page,
      pageSize,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
