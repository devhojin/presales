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

  // 비회원
  if (guest_id) {
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
