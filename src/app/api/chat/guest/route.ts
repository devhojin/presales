import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getServiceClient } from '@/lib/chat'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/client-ip'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function enforceRateLimit() {
  const headersList = await headers()
  const ip = getClientIp(headersList)
  const rl = await checkRateLimitAsync(`chat-guest:${ip}`, 60, 60000)
  if (rl.allowed) return null

  return NextResponse.json({ error: 'Too many requests' }, {
    status: 429,
    headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
  })
}

/** GET: 비회원 채팅방 조회(guest_id 기준) */
export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit()
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const guestId = searchParams.get('guest_id')
  if (!guestId || !UUID_REGEX.test(guestId)) {
    return NextResponse.json({ error: 'guest_id가 유효하지 않습니다' }, { status: 400 })
  }

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

/** POST: 비회원 채팅 메시지 조회 */
export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit()
  if (limited) return limited

  const { room_id, guest_id } = await request.json()
  if (!room_id || !guest_id || typeof guest_id !== 'string' || !UUID_REGEX.test(guest_id)) {
    return NextResponse.json({ error: 'room_id, guest_id가 필요합니다' }, { status: 400 })
  }

  const supabase = getServiceClient()

  const { data: room } = await supabase
    .from('chat_rooms')
    .select('guest_id')
    .eq('id', room_id)
    .single()

  if (!room || room.guest_id !== guest_id) {
    return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 })
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
