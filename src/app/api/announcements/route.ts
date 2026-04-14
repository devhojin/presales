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
    if (userId && (tab === 'unread' || tab === 'read' || tab === 'bookmarks')) {
      if (tab === 'bookmarks') {
        const { data } = await supabase
          .from('announcement_bookmarks')
          .select('announcement_id')
          .eq('user_id', userId)
          .limit(100000)
        idFilter = { op: 'in', ids: (data || []).map(r => r.announcement_id) }
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

    return NextResponse.json({
      announcements: announcements || [],
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
