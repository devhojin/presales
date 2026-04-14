import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Public API: Get published IT feeds
 * GET /api/feeds?page=1&pageSize=50&search=...&category=news&tab=unread|read|bookmarks
 * - tab 지정 시 로그인 사용자 기준으로 서버에서 필터링 + 총계 계산 (클라이언트 허수 방지)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('pageSize')) || 50))
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const tab = searchParams.get('tab') || '' // '', unread, read, bookmarks

  try {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 로그인 사용자 식별 (tab 필터용)
    let userId: string | null = null
    if (tab === 'unread' || tab === 'read' || tab === 'bookmarks') {
      const cookieStore = await cookies()
      const auth = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
      )
      const { data: { user } } = await auth.auth.getUser()
      userId = user?.id ?? null
    }

    // tab 필터용 post_id 집합 계산
    let idFilter: { op: 'in' | 'not_in'; ids: string[] } | null = null
    type BookmarkSnap = {
      post_id: string
      title: string | null
      excerpt: string | null
      url: string | null
      source: string | null
      source_name: string | null
      snapshot_at: string | null
      created_at: string | null
    }
    let bookmarkSnaps: BookmarkSnap[] = []
    if (userId && (tab === 'unread' || tab === 'read' || tab === 'bookmarks')) {
      const service = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      )
      if (tab === 'bookmarks') {
        const { data } = await service
          .from('feed_bookmarks')
          .select('post_id, title, excerpt, url, source, source_name, snapshot_at, created_at')
          .eq('user_id', userId)
          .limit(100000)
        bookmarkSnaps = (data as BookmarkSnap[]) || []
        idFilter = { op: 'in', ids: bookmarkSnaps.map(r => r.post_id) }
      } else {
        const { data } = await service
          .from('feed_reads')
          .select('post_id')
          .eq('user_id', userId)
          .limit(100000)
        const readIds = (data || []).map(r => r.post_id)
        idFilter = { op: tab === 'read' ? 'in' : 'not_in', ids: readIds }
      }
    }

    // 빈 in-리스트면 결과 없음
    if (idFilter?.op === 'in' && idFilter.ids.length === 0) {
      return NextResponse.json({ posts: [], total: 0, page, pageSize })
    }

    let query = anon
      .from('community_posts')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .eq('status', 'published')

    if (category) query = query.eq('category', category)
    if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    if (idFilter) {
      if (idFilter.op === 'in') query = query.in('id', idFilter.ids)
      else if (idFilter.ids.length > 0) query = query.not('id', 'in', `(${idFilter.ids.join(',')})`)
    }

    const offset = (page - 1) * pageSize
    const { data: posts, error: queryError, count: total } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    let finalPosts: unknown[] = posts || []

    // bookmarks 탭: 원본이 삭제된 항목은 스냅샷으로 복원 (B안)
    if (tab === 'bookmarks' && bookmarkSnaps.length > 0) {
      const existingIds = new Set((posts || []).map((p: { id: string }) => p.id))
      const missing = bookmarkSnaps.filter(s => !existingIds.has(s.post_id) && s.title)
      const restored = missing.map(s => ({
        id: s.post_id,
        title: s.title,
        content: s.excerpt,
        external_url: s.url,
        source: s.source,
        source_name: s.source_name,
        created_at: s.snapshot_at || s.created_at,
        is_published: true,
        status: 'published',
        _deleted: true, // UI에서 "원본 삭제됨" 배지 표시용
      }))
      finalPosts = [...finalPosts, ...restored].sort((a, b) => {
        const ad = (a as { created_at?: string }).created_at ?? ''
        const bd = (b as { created_at?: string }).created_at ?? ''
        return bd.localeCompare(ad)
      })
    }

    return NextResponse.json({
      posts: finalPosts,
      total: tab === 'bookmarks' ? bookmarkSnaps.length : total || 0,
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
