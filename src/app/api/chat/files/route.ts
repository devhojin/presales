import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getServiceClient, getAuthUser, isFileBlocked, getFileType, MAX_FILE_SIZE } from '@/lib/chat'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/client-ip'

/** POST: 파일 업로드 (Supabase Storage) */
export async function POST(request: NextRequest) {
  const headersList = await headers()
  const ip = getClientIp(headersList)
  const rl = await checkRateLimitAsync(`chat-file:${ip}`, 10, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
    })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const roomId = formData.get('room_id') as string | null
  const guestId = formData.get('guest_id') as string | null

  if (!file || !roomId) {
    return NextResponse.json({ error: '파일과 room_id가 필요합니다' }, { status: 400 })
  }

  // 인증: 로그인 유저 또는 해당 room 의 guest_id 소유자만 업로드 가능
  const user = await getAuthUser()
  if (!user) {
    if (!guestId) {
      return NextResponse.json({ error: '인증 정보 필요' }, { status: 401 })
    }
    const supabaseAuth = getServiceClient()
    const { data: room } = await supabaseAuth
      .from('chat_rooms')
      .select('guest_id')
      .eq('id', roomId)
      .single()
    if (!room || room.guest_id !== guestId) {
      return NextResponse.json({ error: '방 접근 권한이 없습니다' }, { status: 403 })
    }
  }

  // 보안: 차단 파일 확인
  if (isFileBlocked(file.name)) {
    return NextResponse.json({
      error: `보안상 위험한 파일은 전송할 수 없습니다. (.exe, .bat 등 실행 파일 차단)`,
      blocked: true,
    }, { status: 400 })
  }

  // 크기 제한 (1GB 나지만 Vercel body 한계로 이 라우트는 사실상 ~4MB 까지. 그 이상은 TUS 직접 업로드 사용)
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({
      error: `파일 크기는 1GB 이하만 가능합니다.`,
    }, { status: 400 })
  }

  const supabase = getServiceClient()

  // 파일 업로드 (확장자는 실제 확장자 있을 때만 붙임)
  const lastDot = file.name.lastIndexOf('.')
  const ext = lastDot > 0 ? file.name.slice(lastDot) : ''
  const fileName = `${roomId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('chat-files')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const fileType = getFileType(file.name)

  // DB 에는 storage path 만 저장. 표시 시점에 /api/storage/signed-url 로 재발급.
  return NextResponse.json({
    url: fileName,
    name: file.name,
    size: file.size,
    type: file.type,
    fileType,
    senderId: user?.id || null,
  })
}
