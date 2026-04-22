import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getServiceClient, getAuthUser, isAdmin } from '@/lib/chat'
import { sendEmail, buildEmailHtml } from '@/lib/email'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { SITE_URL } from '@/lib/constants'

/** GET: 특정 방의 메시지 목록 */
export async function GET(request: NextRequest) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') ?? 'unknown'
  const rl = await checkRateLimitAsync(`chat:${ip}`, 30, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
    })
  }

  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get('room_id')
  if (!roomId) return NextResponse.json({ error: 'room_id 필요' }, { status: 400 })

  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50))
  const before = searchParams.get('before') // 페이지네이션용 cursor
  const guestId = searchParams.get('guest_id')

  const supabase = getServiceClient()

  // 인증: 로그인 유저 또는 room 의 guest_id 소유자만 조회 가능
  const authUser = await getAuthUser()
  if (!authUser) {
    if (!guestId) {
      return NextResponse.json({ error: '인증 정보 필요' }, { status: 401 })
    }
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('guest_id')
      .eq('id', roomId)
      .single()
    if (!room || room.guest_id !== guestId) {
      return NextResponse.json({ error: '방 접근 권한이 없습니다' }, { status: 403 })
    }
  } else {
    const admin = await isAdmin(authUser.id)
    if (!admin) {
      // 일반 회원: 자기 방만 접근 가능
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('user_id')
        .eq('id', roomId)
        .single()
      if (!room || room.user_id !== authUser.id) {
        return NextResponse.json({ error: '방 접근 권한이 없습니다' }, { status: 403 })
      }
    }
  }

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
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') ?? 'unknown'
  const rl = await checkRateLimitAsync(`chat:${ip}`, 30, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
    })
  }

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
    // 회원/관리자: 방 소유권 확인 (관리자 제외)
    if (!admin) {
      const { data: ownerRoom } = await supabase
        .from('chat_rooms')
        .select('user_id')
        .eq('id', room_id)
        .single()
      if (!ownerRoom || ownerRoom.user_id !== user.id) {
        return NextResponse.json({ error: '방 접근 권한이 없습니다' }, { status: 403 })
      }
    }
    senderId = user.id
    senderType = admin ? 'admin' : 'user'
  } else if (guest_id) {
    // 비회원: guest_id 가 실제로 이 방의 소유자인지 검증 (IDOR 방지)
    const { data: guestRoom } = await supabase
      .from('chat_rooms')
      .select('guest_id')
      .eq('id', room_id)
      .single()
    if (!guestRoom || guestRoom.guest_id !== guest_id) {
      return NextResponse.json({ error: '방 접근 권한이 없습니다' }, { status: 403 })
    }
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

  // 고객 → 관리자 첫 미확인 메시지일 때만 이메일 알림 (스팸 방지: 대화 시작 + 재개 시점)
  if ((senderType === 'user' || senderType === 'guest') && currentCount === 0) {
    try {
      const { data: roomInfo } = await supabase
        .from('chat_rooms')
        .select('guest_name, guest_email, user_id')
        .eq('id', room_id)
        .single()

      let senderInfo = '(식별 정보 없음)'
      if (senderType === 'guest' && roomInfo) {
        senderInfo = `비회원 · ${roomInfo.guest_name || '이름없음'}${roomInfo.guest_email ? ` (${roomInfo.guest_email})` : ''}`
      } else if (roomInfo?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('id', roomInfo.user_id)
          .single()
        senderInfo = `회원 · ${profile?.name || '이름없음'}${profile?.email ? ` (${profile.email})` : ''}`
      }

      const adminUrl = `${SITE_URL}/admin/chat?room=${room_id}`
      const html = buildEmailHtml(
        '새 채팅 문의 도착',
        `<h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">새 채팅 문의가 도착했습니다</h2>
         <p style="margin:0 0 8px;color:#334155;"><strong>보낸사람:</strong> ${senderInfo}</p>
         <p style="margin:0 0 16px;color:#334155;"><strong>내용:</strong></p>
         <div style="background:#f8fafc;border-left:3px solid #3b82f6;padding:12px 16px;border-radius:4px;color:#0f172a;white-space:pre-wrap;">${(content || preview).replace(/</g, '&lt;')}</div>
         <p style="margin:24px 0 0;"><a href="${adminUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">관리자 화면에서 답변하기</a></p>`
      )

      // 실패해도 메시지 전송은 이미 성공했으므로 swallow
      await sendEmail('hojin@amarans.co.kr', '[프리세일즈] 새 채팅 문의', html).catch(err => {
        console.error('[chat-email] send failed:', err)
      })
    } catch (err) {
      console.error('[chat-email] build failed:', err)
    }
  }

  return NextResponse.json({ message: msg })
}
