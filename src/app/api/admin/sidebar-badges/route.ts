import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isMemberAdminUnread, isOrderAdminUnread } from '@/lib/admin-read-state'
import { getKstStartOfDayIso } from '@/lib/kst-date'
import { logger } from '@/lib/logger'

const GUEST_MEMBER_EMAIL_SUFFIX = '@guest.presales.local'

type ChatNotification = {
  id: string
  label: string
  description: string
  unreadCount: number
  lastMessageAt: string | null
  href: string
}

function isGuestMemberProfile(member: { email?: string | null }) {
  return (member.email || '').toLowerCase().endsWith(GUEST_MEMBER_EMAIL_SUFFIX)
}

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

    const todayIso = getKstStartOfDayIso()

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
        .select('id, user_id, guest_name, room_type, last_message, last_message_at, admin_unread_count')
        .eq('hidden_by_admin', false)
        .not('last_message', 'is', null)
        .gt('admin_unread_count', 0)
        .order('last_message_at', { ascending: false }),
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
        .select('id, email, role, created_at, admin_memo, deleted_at')
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
    const unreadMembers = (membersRes.data || [])
      .filter((member) => !isGuestMemberProfile(member))
      .filter(isMemberAdminUnread).length
    const customerUnread = chatUnread + unreadMembers
    const chatUserIds = (chatRes.data || [])
      .map((room) => room.user_id)
      .filter((userId): userId is string => Boolean(userId))

    let profileMap: Record<string, { name: string | null; email: string | null }> = {}
    if (chatUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await service
        .from('profiles')
        .select('id, name, email')
        .in('id', Array.from(new Set(chatUserIds)))

      if (profilesError) throw profilesError
      profileMap = (profiles || []).reduce<Record<string, { name: string | null; email: string | null }>>((acc, profile) => {
        acc[profile.id] = { name: profile.name, email: profile.email }
        return acc
      }, {})
    }

    const chatNotifications: ChatNotification[] = (chatRes.data || []).slice(0, 8).map((room) => {
      const profile = room.user_id ? profileMap[room.user_id] : null
      const label = room.room_type === 'member'
        ? (profile?.name || profile?.email || '회원')
        : (room.guest_name || '비회원')

      return {
        id: room.id,
        label,
        description: room.last_message || '새 메시지',
        unreadCount: Number(room.admin_unread_count || 0),
        lastMessageAt: room.last_message_at,
        href: `/admin/chat?room=${room.id}`,
      }
    })

    return NextResponse.json({
      announcementsToday: annRes.count || 0,
      feedsToday: feedRes.count || 0,
      chatUnread,
      chatNotifications,
      consultingPending: consultRes.count || 0,
      unreadOrders,
      unreadMembers,
      customerUnread,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('관리자 사이드바 뱃지 조회 실패', 'admin/sidebar-badges', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
