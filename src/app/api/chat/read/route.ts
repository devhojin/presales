import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, getAuthUser, isAdmin } from '@/lib/chat'

/** POST: 메시지 읽음 처리 + unread count 리셋 */
export async function POST(request: NextRequest) {
  const { room_id, guest_id } = await request.json()
  if (!room_id) return NextResponse.json({ error: 'room_id 필요' }, { status: 400 })

  const supabase = getServiceClient()
  const user = await getAuthUser()

  if (user) {
    const admin = await isAdmin(user.id)

    // 회원 — 자기 방만 읽음 처리 가능 (관리자는 전체)
    if (!admin) {
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('user_id')
        .eq('id', room_id)
        .single()
      if (!room || room.user_id !== user.id) {
        return NextResponse.json({ error: '방 접근 권한이 없습니다' }, { status: 403 })
      }
    }

    // 메시지 읽음 처리 (상대방이 보낸 것만) + unread 카운트 동기화
    if (admin) {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', room_id)
        .neq('sender_type', 'admin')
        .eq('is_read', false)

      await supabase
        .from('chat_rooms')
        .update({ admin_unread_count: 0, updated_at: new Date().toISOString() })
        .eq('id', room_id)
    } else {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('room_id', room_id)
        .eq('sender_type', 'admin')
        .eq('is_read', false)

      await supabase
        .from('chat_rooms')
        .update({ user_unread_count: 0, updated_at: new Date().toISOString() })
        .eq('id', room_id)
    }

    return NextResponse.json({ ok: true })
  }

  // 비회원 — guest_id 가 해당 room 의 소유자인지 DB 조회로 검증
  if (guest_id) {
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('guest_id')
      .eq('id', room_id)
      .single()
    if (!room || room.guest_id !== guest_id) {
      return NextResponse.json({ error: '방 접근 권한이 없습니다' }, { status: 403 })
    }

    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('room_id', room_id)
      .eq('sender_type', 'admin')
      .eq('is_read', false)

    await supabase
      .from('chat_rooms')
      .update({ user_unread_count: 0 })
      .eq('id', room_id)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: '인증 정보 필요' }, { status: 401 })
}
