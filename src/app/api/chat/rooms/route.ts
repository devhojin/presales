import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getServiceClient, getAuthUser, isAdmin } from '@/lib/chat'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/client-ip'

// UUID v4 형식 검증 (비회원 guest_id — 클라이언트 uuid 생성)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** DELETE: 채팅방 삭제 (hide | full) */
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
  const admin = await isAdmin(user.id)
  if (!admin) return NextResponse.json({ error: '관리자만 가능' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const mode = searchParams.get('mode') || 'hide'
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  const supabase = getServiceClient()

  if (mode === 'full') {
    // 완전 삭제 (cascade로 messages도 삭제됨)
    const { error } = await supabase.from('chat_rooms').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, mode: 'full' })
  }

  // 리스트에서만 숨김
  const { error } = await supabase
    .from('chat_rooms')
    .update({ hidden_by_admin: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, mode: 'hide' })
}

/** GET: 내 채팅방 목록 (회원) / 전체 (관리자) */
export async function GET() {
  const user = await getAuthUser()
  const supabase = getServiceClient()

  if (user) {
    const admin = await isAdmin(user.id)
    if (admin) {
      // 관리자: 전체 목록 (최신순)
      const { data: rooms, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('hidden_by_admin', false)
        .order('last_message_at', { ascending: false })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // profiles를 별도 조회 후 합치기 (FK가 auth.users라서 자동 조인 불가)
      const userIds = (rooms || []).filter(r => r.user_id).map(r => r.user_id as string)
      let profilesMap: Record<string, { name: string; email: string; phone: string | null; company: string | null }> = {}
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email, phone, company')
          .in('id', userIds)
        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { name: p.name, email: p.email, phone: p.phone, company: p.company }
          return acc
        }, {} as typeof profilesMap)
      }

      const roomsWithProfiles = (rooms || []).map(r => ({
        ...r,
        profiles: r.user_id ? profilesMap[r.user_id as string] || null : null,
      }))

      return NextResponse.json({ rooms: roomsWithProfiles })
    }
    // 회원: 내 방만
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rooms: data })
  }

  return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
}

/** POST: 채팅방 생성/조회 */
export async function POST(request: NextRequest) {
  // Rate limit: IP 당 분당 10회 (방 무한 생성 DoS 방지)
  const headersList = await headers()
  const ip = getClientIp(headersList)
  const rl = await checkRateLimitAsync(`chat-room-create:${ip}`, 10, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
    })
  }

  const body = await request.json()
  const supabase = getServiceClient()
  const user = await getAuthUser()

  // 회원 채팅방
  if (user && body.type !== 'guest') {
    // 기존 open 방 찾기
    const { data: existing } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) return NextResponse.json({ room: existing })

    // 신규 생성
    const { data: newRoom, error } = await supabase
      .from('chat_rooms')
      .insert({
        user_id: user.id,
        room_type: 'member',
        status: 'open',
        admin_unread_count: 1,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ room: newRoom, created: true })
  }

  // 비회원 채팅방
  const guestId = body.guest_id
  if (!guestId || typeof guestId !== 'string' || !UUID_REGEX.test(guestId)) {
    return NextResponse.json({ error: 'guest_id 가 유효하지 않습니다 (UUID v4)' }, { status: 400 })
  }

  // 기존 open 방 찾기
  const { data: existing } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('guest_id', guestId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) return NextResponse.json({ room: existing })

  // 비회원 번호 생성
  const { data: seqData } = await supabase.rpc('nextval_guest_name')
  const guestNum = seqData || Math.floor(Math.random() * 9999)
  const guestName = `비회원${String(guestNum).padStart(4, '0')}`

  const { data: newRoom, error } = await supabase
    .from('chat_rooms')
    .insert({
      guest_id: guestId,
      guest_name: guestName,
      room_type: 'guest',
      status: 'open',
      admin_unread_count: 1,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ room: newRoom, created: true })
}

/**
 * PATCH: 채팅방 상태 업데이트 (닫기, 읽음 처리 등)
 * 보안: allowedFields 만 허용 — user_id/guest_id/id/created_at 등 민감 컬럼 임의 수정 차단
 */
// 역할별 허용 필드 화이트리스트
const ADMIN_ALLOWED_FIELDS = new Set([
  'status',
  'last_message',
  'last_message_at',
  'user_unread_count',
  'admin_unread_count',
  'hidden_by_admin',
  'guest_name',
  'guest_email',
])
const MEMBER_ALLOWED_FIELDS = new Set([
  'status',
  'user_unread_count', // 본인 읽음 처리
])
const GUEST_ALLOWED_FIELDS = new Set([
  'status',
  'user_unread_count',
  'guest_name',
  'guest_email',
])

// 필드별 문자열 길이 제한 — DB 과다 저장 및 후속 렌더링 장애 방지
const FIELD_MAX_LENGTH: Record<string, number> = {
  guest_name: 50,
  guest_email: 254,
  last_message: 500,
}

function pickAllowed(
  updates: Record<string, unknown>,
  allowed: Set<string>,
): { picked: Record<string, unknown>; error?: string } {
  const picked: Record<string, unknown> = {}
  for (const k of Object.keys(updates)) {
    if (!allowed.has(k)) continue
    const v = updates[k]
    const max = FIELD_MAX_LENGTH[k]
    if (max !== undefined && typeof v === 'string' && v.length > max) {
      return { picked, error: `${k} 은 ${max}자 이하여야 합니다` }
    }
    picked[k] = v
  }
  return { picked }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { room_id, guest_id: _guestId, ...updates } = body as Record<string, unknown> & { room_id?: string; guest_id?: string }
  if (!room_id) return NextResponse.json({ error: 'room_id 필요' }, { status: 400 })

  const user = await getAuthUser()
  const supabase = getServiceClient()

  // 관리자
  if (user) {
    const admin = await isAdmin(user.id)
    if (admin) {
      const { picked: safe, error: lenErr } = pickAllowed(updates, ADMIN_ALLOWED_FIELDS)
      if (lenErr) return NextResponse.json({ error: lenErr }, { status: 400 })
      const { error } = await supabase
        .from('chat_rooms')
        .update({ ...safe, updated_at: new Date().toISOString() })
        .eq('id', room_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // 회원: 자기 방만 수정 가능
    const { picked: safe, error: lenErr } = pickAllowed(updates, MEMBER_ALLOWED_FIELDS)
    if (lenErr) return NextResponse.json({ error: lenErr }, { status: 400 })
    const { error } = await supabase
      .from('chat_rooms')
      .update({ ...safe, updated_at: new Date().toISOString() })
      .eq('id', room_id)
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // 비회원: guest_id로
  const guestId = body.guest_id
  if (guestId) {
    const { picked: safe, error: lenErr } = pickAllowed(updates, GUEST_ALLOWED_FIELDS)
    if (lenErr) return NextResponse.json({ error: lenErr }, { status: 400 })
    const { error } = await supabase
      .from('chat_rooms')
      .update({ ...safe, updated_at: new Date().toISOString() })
      .eq('id', room_id)
      .eq('guest_id', guestId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: '권한 없음' }, { status: 403 })
}
