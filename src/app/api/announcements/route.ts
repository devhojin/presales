import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Public Announcements API
 * GET: List published announcements
 * - Query params: page, pageSize, search, area, status ('active'|'closed'|'all'),
 *                 tab ('unread'|'read'|'bookmarks')
 * - tab 지정 시 로그인 사용자 기준 서버에서 필터링 + 총계 계산 (클라이언트 허수 방지)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('pageSize')) || 20))
  const search = searchParams.get('search') || ''
  const area = searchParams.get('area') || ''
  const status = searchParams.get('status') || 'all'
  const tab = searchParams.get('tab') || ''

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

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

    let idFilter: { op: 'in' | 'not_in'; ids: string[] } | null = null
    type AnnBookmarkSnap = {
      announcement_id: string
      title: string | null
      excerpt: string | null
      url: string | null
      source: string | null
      source_name: string | null
      end_date: string | null
      snapshot_at: string | null
      created_at: string | null
    }
    let bookmarkSnaps: AnnBookmarkSnap[] = []
    if (userId && (tab === 'unread' || tab === 'read' || tab === 'bookmarks')) {
      if (tab === 'bookmarks') {
        const { data } = await supabase
          .from('announcement_bookmarks')
          .select('announcement_id, title, excerpt, url, source, source_name, end_date, snapshot_at, created_at')
          .eq('user_id', userId)
          .limit(100000)
        bookmarkSnaps = (data as AnnBookmarkSnap[]) || []
        idFilter = { op: 'in', ids: bookmarkSnaps.map(r => r.announcement_id) }
      } else {
        const { data } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', userId)
          .limit(100000)
        const readIds = (data || []).map(r => r.announcement_id)
        idFilter = { op: tab === 'read' ? 'in' : 'not_in', ids: readIds }
      }
    }

    if (idFilter?.op === 'in' && idFilter.ids.length === 0) {
      return NextResponse.json({ announcements: [], total: 0, page, pageSize })
    }

    let query = supabase
      .from('announcements')
      .select('*', { count: 'exact' })
      .eq('is_published', true)

    const today = new Date().toISOString().slice(0, 10)
    if (status === 'active') {
      query = query.eq('status', 'active').or(`end_date.gte.${today},end_date.is.null`)
    } else if (status === 'closed') {
      query = query.or(`status.eq.closed,end_date.lt.${today}`)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,organization.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (area) {
      query = query.contains('support_areas', [area])
    }

    if (idFilter) {
      if (idFilter.op === 'in') query = query.in('id', idFilter.ids)
      else if (idFilter.ids.length > 0) query = query.not('id', 'in', `(${idFilter.ids.join(',')})`)
    }

    const offset = (page - 1) * pageSize
    const { data: announcements, error: queryError, count: total } = await query
      .order('end_date', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    let finalAnns: unknown[] = announcements || []

    if (tab === 'bookmarks' && bookmarkSnaps.length > 0) {
      const existingIds = new Set((announcements || []).map((a: { id: string }) => a.id))
      const missing = bookmarkSnaps.filter(s => !existingIds.has(s.announcement_id) && s.title)
      const restored = missing.map(s => ({
        id: s.announcement_id,
        title: s.title,
        description: s.excerpt,
        source_url: s.url,
        source: s.source,
        source_name: s.source_name,
        end_date: s.end_date,
        created_at: s.snapshot_at || s.created_at,
        is_published: true,
        status: 'active',
        _deleted: true,
      }))
      finalAnns = [...finalAnns, ...restored]
    }

    // 상태별 카운트 (모집중/마감)
    let activeCount = 0, closedCount = 0
    {
      let cq = supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('is_published', true)
      if (search) cq = cq.or(`title.ilike.%${search}%,organization.ilike.%${search}%,description.ilike.%${search}%`)
      if (idFilter) {
        if (idFilter.op === 'in') cq = cq.in('id', idFilter.ids)
        else if (idFilter.ids.length > 0) cq = cq.not('id', 'in', `(${idFilter.ids.join(',')})`)
      }
      const [ac, cc] = await Promise.all([
        cq.eq('status', 'active').or(`end_date.gte.${today},end_date.is.null`),
        supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('is_published', true)
          .or(`status.eq.closed,end_date.lt.${today}`)
          .then(r => r),
      ])
      activeCount = ac.count || 0
      closedCount = cc.count || 0
    }

    // 탭별 카운트 (로그인 시)
    let unreadCount = 0, readCount = 0, bookmarkCount = 0
    if (userId) {
      const { data: readData } = await supabase.from('announcement_reads').select('announcement_id').eq('user_id', userId).limit(100000)
      const readIds = (readData || []).map(r => r.announcement_id)
      const { data: bmData } = await supabase.from('announcement_bookmarks').select('announcement_id').eq('user_id', userId).limit(100000)

      const { count: totalPub } = await supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('is_published', true)
      readCount = readIds.length
      unreadCount = (totalPub || 0) - readCount
      bookmarkCount = (bmData || []).length
    }

    return NextResponse.json({
      announcements: finalAnns,
      total: tab === 'bookmarks' ? bookmarkSnaps.length : total || 0,
      page,
      pageSize,
      counts: { active: activeCount, closed: closedCount, unread: unreadCount, read: readCount, bookmarks: bookmarkCount },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
