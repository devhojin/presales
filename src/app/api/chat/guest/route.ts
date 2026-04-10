import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/chat'

/** GET: 비회원 채팅방 조회 (guest_id로) */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const guestId = searchParams.get('guest_id')
  if (!guestId) return NextResponse.json({ error: 'guest_id 필요' }, { status: 400 })

  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('guest_id', guestId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ room: data || null })
}

/** GET messages for guest */
export async function POST(request: NextRequest) {
  const { room_id, guest_id } = await request.json()
  if (!room_id || !guest_id) {
    return NextResponse.json({ error: 'room_id, guest_id 필요' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // 방 소유권 확인
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('guest_id')
    .eq('id', room_id)
    .single()

  if (!room || room.guest_id !== guest_id) {
    return NextResponse.json({ error: '접근 권한 없음' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', room_id)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data })
}
