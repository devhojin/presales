import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, getAuthUser, isAdmin } from '@/lib/chat'

/** POST: 관리자 → 회원 결제요청 생성 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const admin = await isAdmin(user.id)
  if (!admin) return NextResponse.json({ error: '관리자만 가능' }, { status: 403 })

  const { room_id, target_user_id, title, description, amount } = await request.json()

  if (!room_id || !target_user_id || !title || amount === undefined || amount === null) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }
  // amount 엄격 검증: 유한한 양의 정수만 허용 (NaN/Infinity/음수/문자열 차단)
  const amountNum = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(amountNum) || !Number.isInteger(amountNum) || amountNum <= 0 || amountNum > 1_000_000_000) {
    return NextResponse.json({ error: '금액은 1원 이상 10억원 이하의 정수여야 합니다' }, { status: 400 })
  }
  // title/description 길이 제한
  if (typeof title !== 'string' || title.length === 0 || title.length > 200) {
    return NextResponse.json({ error: '제목은 1~200자여야 합니다' }, { status: 400 })
  }
  if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 2000)) {
    return NextResponse.json({ error: '설명은 2000자 이하여야 합니다' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // R14: room 소유자와 target_user_id 일치 검증 (관리자 실수로 엉뚱한 사용자에게 청구 방지)
  // - 회원방: room.user_id === target_user_id
  // - 비회원방: target_user_id 결제요청 불가 (회원만 결제 가능)
  const { data: room, error: roomErr } = await supabase
    .from('chat_rooms')
    .select('user_id, room_type')
    .eq('id', room_id)
    .maybeSingle()

  if (roomErr || !room) {
    return NextResponse.json({ error: '채팅방을 찾을 수 없습니다' }, { status: 404 })
  }
  if (room.room_type !== 'member' || !room.user_id) {
    return NextResponse.json({ error: '비회원 채팅방에는 결제요청을 보낼 수 없습니다' }, { status: 400 })
  }
  if (room.user_id !== target_user_id) {
    return NextResponse.json({ error: 'target_user_id 가 채팅방 소유자와 일치하지 않습니다' }, { status: 400 })
  }

  // 결제요청 레코드 생성
  const { data: pr, error: prErr } = await supabase
    .from('chat_payment_requests')
    .insert({
      room_id,
      user_id: target_user_id,
      admin_id: user.id,
      title,
      description: description || null,
      amount: amountNum,
    })
    .select()
    .single()

  if (prErr) return NextResponse.json({ error: prErr.message }, { status: 500 })

  // 결제요청 메시지 삽입
  const { data: msg, error: msgErr } = await supabase
    .from('chat_messages')
    .insert({
      room_id,
      sender_id: user.id,
      sender_type: 'admin',
      message_type: 'payment_request',
      content: `결제 요청: ${title}`,
      metadata: {
        payment_request_id: pr.id,
        title,
        description: description || null,
        amount: amountNum,
        status: 'pending',
      },
    })
    .select()
    .single()

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  // 결제요청에 message_id 연결
  await supabase
    .from('chat_payment_requests')
    .update({ message_id: msg.id })
    .eq('id', pr.id)

  // 채팅방 업데이트
  const formatAmount = new Intl.NumberFormat('ko-KR').format(amountNum)
  await supabase
    .from('chat_rooms')
    .update({
      last_message: `[결제요청] ${title} - ${formatAmount}원`,
      last_message_at: new Date().toISOString(),
      user_unread_count: 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', room_id)

  return NextResponse.json({ paymentRequest: pr, message: msg })
}

/** PATCH: 결제요청 상태 변경 (결제완료/취소)
 *  - 'paid' 전환: 요청 당사자(user_id) 또는 관리자
 *  - 'cancelled' 전환: 관리자만
 *  - 기타 값 차단
 */
const ALLOWED_STATUSES = new Set(['paid', 'cancelled'])

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id, status: newStatus } = await request.json()
  if (!id || !newStatus) return NextResponse.json({ error: 'id, status 필요' }, { status: 400 })
  if (!ALLOWED_STATUSES.has(newStatus)) {
    return NextResponse.json({ error: '허용되지 않은 상태값입니다' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // 요청 조회 후 권한 확인
  const { data: existing, error: fetchErr } = await supabase
    .from('chat_payment_requests')
    .select('id, user_id, status')
    .eq('id', id)
    .single()
  if (fetchErr || !existing) {
    return NextResponse.json({ error: '결제요청을 찾을 수 없습니다' }, { status: 404 })
  }

  const admin = await isAdmin(user.id)
  const isOwner = existing.user_id === user.id

  if (newStatus === 'cancelled' && !admin) {
    return NextResponse.json({ error: '취소는 관리자만 가능합니다' }, { status: 403 })
  }
  if (newStatus === 'paid' && !admin && !isOwner) {
    return NextResponse.json({ error: '본인 결제요청만 처리할 수 있습니다' }, { status: 403 })
  }

  // 이미 처리된 요청은 재처리 불가 (멱등성)
  if (existing.status !== 'pending') {
    return NextResponse.json({ error: '이미 처리된 결제요청입니다' }, { status: 409 })
  }

  const updateData: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'paid') updateData.paid_at = new Date().toISOString()
  if (newStatus === 'cancelled') updateData.cancelled_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('chat_payment_requests')
    .update(updateData)
    .eq('id', id)
    .eq('status', 'pending')  // optimistic lock
    .select('*, chat_messages:message_id(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 메시지의 metadata도 업데이트
  if (data.message_id) {
    await supabase
      .from('chat_messages')
      .update({
        metadata: {
          ...(data.chat_messages as Record<string, unknown>)?.metadata as Record<string, unknown>,
          status: newStatus,
        },
      })
      .eq('id', data.message_id)
  }

  // 시스템 메시지 추가
  const statusLabel = newStatus === 'paid' ? '결제 완료' : '결제 취소'
  await supabase.from('chat_messages').insert({
    room_id: data.room_id,
    sender_id: 'system',
    sender_type: 'system',
    message_type: 'system',
    content: `${statusLabel}: ${data.title}`,
  })

  return NextResponse.json({ paymentRequest: data })
}

/** GET: 내 결제요청 목록 */
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const supabase = getServiceClient()
  const admin = await isAdmin(user.id)

  let query = supabase
    .from('chat_payment_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (!admin) {
    query = query.eq('user_id', user.id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ paymentRequests: data })
}
