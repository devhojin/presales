import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isMemberAdminUnread, isOrderAdminUnread } from '@/lib/admin-read-state'
import { logger } from '@/lib/logger'

async function getAdminService() {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return { response: NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 }) }
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: me } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (me?.role !== 'admin') {
    return { response: NextResponse.json({ error: '관리자만 접근 가능합니다' }, { status: 403 }) }
  }

  return { service }
}

export async function GET() {
  try {
    const context = await getAdminService()
    if ('response' in context) return context.response
    const { service } = context

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString()

    const [annRes, feedRes, chatRes, consultRes, ordersRes, membersRes] = await Promise.all([
      service
        .from('announcements')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true)
        .gte('created_at', todayIso),
      service
        .from('community_posts')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true)
        .gte('created_at', todayIso),
      service
        .from('chat_rooms')
        .select('admin_unread_count')
        .eq('hidden_by_admin', false)
        .not('last_message', 'is', null)
        .gt('admin_unread_count', 0),
      service
        .from('consulting_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      service
        .from('orders')
        .select('id, status, created_at, admin_memo')
        .order('created_at', { ascending: false })
        .limit(10000),
      service
        .from('profiles')
        .select('id, role, created_at, admin_memo, deleted_at')
        .order('created_at', { ascending: false })
        .limit(5000),
    ])

    if (annRes.error) throw annRes.error
    if (feedRes.error) throw feedRes.error
    if (chatRes.error) throw chatRes.error
    if (consultRes.error) throw consultRes.error
    if (ordersRes.error) throw ordersRes.error
    if (membersRes.error) throw membersRes.error

    const chatUnread = (chatRes.data || []).reduce(
      (sum, room) => sum + Number(room.admin_unread_count || 0),
      0,
    )
    const unreadOrders = (ordersRes.data || []).filter(isOrderAdminUnread).length
    const unreadMembers = (membersRes.data || []).filter(isMemberAdminUnread).length

    return NextResponse.json({
      announcementsToday: annRes.count || 0,
      feedsToday: feedRes.count || 0,
      chatUnread,
      consultingPending: consultRes.count || 0,
      unreadOrders,
      unreadMembers,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('관리자 사이드바 뱃지 조회 실패', 'admin/sidebar-badges', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
