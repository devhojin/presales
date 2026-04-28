import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getServiceClient, getAuthUser, isAdmin } from '@/lib/chat'
import { sendEmail, buildEmailHtml } from '@/lib/email'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/client-ip'
import { SITE_URL } from '@/lib/constants'

const CHAT_EMAIL_TIMEOUT_MS = 1500

async function waitForBackgroundEmail(task: Promise<unknown>, timeoutMs = CHAT_EMAIL_TIMEOUT_MS) {
  await Promise.race([
    task,
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ])
}

/** GET: 특정 방의 메시지 목록 */
export async function GET(request: NextRequest) {
  const headersList = await headers()
  const ip = getClientIp(headersList)
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
  const ip = getClientIp(headersList)
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

  // 길이·타입 입력 검증 (DoS/서비스 저해 방지)
  if (typeof content === 'string' && content.length > 10000) {
    return NextResponse.json({ error: '메시지가 너무 깁니다 (최대 10,000자)' }, { status: 400 })
  }
  if (file_url) {
    if (typeof file_url !== 'string') {
      return NextResponse.json({ error: '허용되지 않은 파일 URL' }, { status: 400 })
    }
    // /api/chat/files 는 storage path(상대경로) 만 반환하고, TUS 업로드도 path 형태.
    // 외부 URL(https://evil.com/...) 이나 javascript:, data: 스킴 차단.
    const hasProtocol = /^[a-z][a-z0-9+.-]*:/i.test(file_url)
    if (hasProtocol) {
      const supabaseUrlBase = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
      if (!supabaseUrlBase || !file_url.startsWith(supabaseUrlBase)) {
        return NextResponse.json({ error: '허용되지 않은 파일 URL' }, { status: 400 })
      }
    }
    if (typeof file_size === 'number' && file_size > 1024 * 1024 * 1024) {
      return NextResponse.json({ error: '파일 크기가 너무 큽니다 (최대 1GB)' }, { status: 400 })
    }
  }

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
      await waitForBackgroundEmail(
        sendEmail('help@presales.co.kr', '[프리세일즈] 새 채팅 문의', html).catch(err => {
          console.error('[chat-email] send failed:', err)
        })
      )
    } catch (err) {
      console.error('[chat-email] build failed:', err)
    }
  }

  // 관리자 → 사용자 답변 알림 (Anthropic Fin AI Agent 패턴)
  //   - 창 닫아도 이메일로 답변 도착 통지
  //   - 1시간 쿨다운: 짧은 시간에 관리자가 여러 줄 답변해도 한 번만 발송
  if (senderType === 'admin') {
    try {
      const { data: roomInfo } = await supabase
        .from('chat_rooms')
        .select('guest_name, guest_email, user_id, last_user_notified_at')
        .eq('id', room_id)
        .single() as { data: {
          guest_name: string | null
          guest_email: string | null
          user_id: string | null
          last_user_notified_at: string | null
        } | null }

      if (roomInfo) {
        const oneHourAgo = Date.now() - 60 * 60 * 1000
        const lastNotified = roomInfo.last_user_notified_at
          ? new Date(roomInfo.last_user_notified_at).getTime()
          : 0
        const inCooldown = lastNotified > oneHourAgo

        if (!inCooldown) {
          let recipientEmail: string | null = null
          let recipientName = '고객님'

          if (roomInfo.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, name')
              .eq('id', roomInfo.user_id)
              .single()
            if (profile?.email) {
              recipientEmail = profile.email
              recipientName = profile.name || recipientName
            }
          } else if (roomInfo.guest_email) {
            recipientEmail = roomInfo.guest_email
            recipientName = roomInfo.guest_name || recipientName
          }

          if (recipientEmail) {
            const userChatUrl = `${SITE_URL}/?chat=1`
            const shortId = String(room_id).slice(0, 8)
            const html = buildEmailHtml(
              '상담원 답변이 도착했습니다',
              `<h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">${recipientName.replace(/</g, '&lt;')}님, 상담원 답변이 도착했습니다</h2>
               <p style="margin:0 0 8px;color:#334155;">프리세일즈 상담 문의에 답변이 등록되었습니다.</p>
               <p style="margin:0 0 16px;color:#334155;"><strong>답변 내용:</strong></p>
               <div style="background:#f8fafc;border-left:3px solid #3b82f6;padding:12px 16px;border-radius:4px;color:#0f172a;white-space:pre-wrap;">${(content || preview).replace(/</g, '&lt;')}</div>
               <p style="margin:24px 0 0;"><a href="${userChatUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">채팅창에서 확인하기</a></p>
               <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">기록용 대화 ID: ${shortId}</p>
               <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">1시간 내에 추가 답변이 도착해도 별도 알림은 보내지 않습니다. 채팅창에서 전체 대화를 확인하세요.</p>`
            )
            await waitForBackgroundEmail(
              sendEmail(recipientEmail, '[프리세일즈] 상담원 답변 도착', html).catch(err => {
                console.error('[chat-reply-email] send failed:', err)
              })
            )
            await supabase
              .from('chat_rooms')
              .update({ last_user_notified_at: new Date().toISOString() })
              .eq('id', room_id)
          }
        }
      }
    } catch (err) {
      console.error('[chat-reply-email] build failed:', err)
    }
  }

  return NextResponse.json({ message: msg })
}
