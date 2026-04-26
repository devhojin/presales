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
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 로그인 사용자 식별 (tab 필터 + 카운트 계산용)
    let userId: string | null = null
    {
      const cookieStore = await cookies()
      const auth = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll() } }
      )
      const { data: { user } } = await auth.auth.getUser()
      userId = user?.id ?? null
    }

    // 사용자당 북마크/읽음은 수천 건이 현실적 상한 (PostgREST IN 절 URL 길이 제한)
    const USER_LIST_LIMIT = 5000

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
      if (tab === 'bookmarks') {
        const { data } = await service
          .from('feed_bookmarks')
          .select('post_id, title, excerpt, url, source, source_name, snapshot_at, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(USER_LIST_LIMIT)
        bookmarkSnaps = (data as BookmarkSnap[]) || []
        if (bookmarkSnaps.length === USER_LIST_LIMIT) {
          console.warn(`[feeds] user ${userId} bookmark list reached limit ${USER_LIST_LIMIT}`)
        }
        idFilter = { op: 'in', ids: bookmarkSnaps.map(r => r.post_id) }
      } else {
        const { data } = await service
          .from('feed_reads')
          .select('post_id')
          .eq('user_id', userId)
          .limit(USER_LIST_LIMIT)
        const readIds = (data || []).map(r => r.post_id)
        if (readIds.length === USER_LIST_LIMIT) {
          console.warn(`[feeds] user ${userId} read list reached limit ${USER_LIST_LIMIT}`)
        }
        idFilter = { op: tab === 'read' ? 'in' : 'not_in', ids: readIds }
      }
    }

    // 빈 in-리스트면 결과 없음
    if (idFilter?.op === 'in' && idFilter.ids.length === 0) {
      return NextResponse.json({ posts: [], total: 0, page, pageSize, counts: { unread: 0, read: 0, bookmarks: 0 } })
    }

    let query = service
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

    // 탭별 카운트 (로그인 시) — head:true 로 메모리 로드 없이 count 만
    let unreadCount = 0, readCount = 0, bookmarkCount = 0
    if (userId) {
      const [readRes, bmRes, totalRes] = await Promise.all([
        service.from('feed_reads').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        service.from('feed_bookmarks').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        service.from('community_posts').select('*', { count: 'exact', head: true }).eq('is_published', true).eq('status', 'published'),
      ])
      readCount = readRes.count || 0
      bookmarkCount = bmRes.count || 0
      unreadCount = (totalRes.count || 0) - readCount
    }

    return NextResponse.json({
      posts: finalPosts,
      total: tab === 'bookmarks' ? bookmarkSnaps.length : total || 0,
      page,
      pageSize,
      counts: { unread: unreadCount, read: readCount, bookmarks: bookmarkCount },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
