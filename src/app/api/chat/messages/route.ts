import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, getAuthUser, isAdmin } from '@/lib/chat'

/** GET: 특정 방의 메시지 목록 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get('room_id')
  if (!roomId) return NextResponse.json({ error: 'room_id 필요' }, { status: 400 })

  const limit = parseInt(searchParams.get('limit') || '50')
  const before = searchParams.get('before') // 페이지네이션용 cursor

  const supabase = getServiceClient()

  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ messages: (data || []).reverse() })
}

/** POST: 메시지 전송 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { room_id, content, message_type, file_url, file_name, file_size, file_type, metadata, guest_id } = body

  if (!room_id) return NextResponse.json({ error: 'room_id 필요' }, { status: 400 })
  if (!content && !file_url) return NextResponse.json({ error: '내용이 필요합니다' }, { status: 400 })

  const supabase = getServiceClient()
  const user = await getAuthUser()

  let senderId: string
  let senderType: string

  if (user) {
    const admin = await isAdmin(user.id)
    senderId = user.id
    senderType = admin ? 'admin' : 'user'
  } else if (guest_id) {
    senderId = guest_id
    senderType = 'guest'
  } else {
    return NextResponse.json({ error: '인증 정보 필요' }, { status: 401 })
  }

  // 메시지 삽입
  const { data: msg, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id,
      sender_id: senderId,
      sender_type: senderType,
      message_type: message_type || 'text',
      content: content || null,
      file_url: file_url || null,
      file_name: file_name || null,
      file_size: file_size || null,
      file_type: file_type || null,
      metadata: metadata || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 채팅방 업데이트 (마지막 메시지 + unread count)
  const preview = content
    ? content.slice(0, 50)
    : file_name
      ? `[파일] ${file_name}`
      : '[첨부파일]'

  const unreadField = senderType === 'admin' ? 'user_unread_count' : 'admin_unread_count'

  // 현재 unread count 가져와서 +1
  const { data: room } = await supabase
    .from('chat_rooms')
    .select(unreadField)
    .eq('id', room_id)
    .single()

  const currentCount = (room as Record<string, number> | null)?.[unreadField] || 0

  await supabase
    .from('chat_rooms')
    .update({
      last_message: preview,
      last_message_at: new Date().toISOString(),
      [unreadField]: currentCount + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', room_id)

  return NextResponse.json({ message: msg })
}
