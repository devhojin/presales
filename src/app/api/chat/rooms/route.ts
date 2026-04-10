import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, getAuthUser, isAdmin } from '@/lib/chat'

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
  if (!guestId) return NextResponse.json({ error: 'guest_id 필요' }, { status: 400 })

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

/** PATCH: 채팅방 상태 업데이트 (닫기, 읽음 처리 등) */
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { room_id, ...updates } = body
  if (!room_id) return NextResponse.json({ error: 'room_id 필요' }, { status: 400 })

  const user = await getAuthUser()
  const supabase = getServiceClient()

  // 관리자 확인
  if (user) {
    const admin = await isAdmin(user.id)
    if (admin) {
      const { error } = await supabase
        .from('chat_rooms')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', room_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
  }

  // 회원: 자기 방만 수정 가능
  if (user) {
    const { error } = await supabase
      .from('chat_rooms')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', room_id)
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // 비회원: guest_id로
  const guestId = body.guest_id
  if (guestId) {
    const { error } = await supabase
      .from('chat_rooms')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', room_id)
      .eq('guest_id', guestId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: '권한 없음' }, { status: 403 })
}
