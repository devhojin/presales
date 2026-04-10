import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, getAuthUser, isFileBlocked, getFileType, MAX_FILE_SIZE } from '@/lib/chat'

/** POST: 파일 업로드 (Supabase Storage) */
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const roomId = formData.get('room_id') as string | null

  if (!file || !roomId) {
    return NextResponse.json({ error: '파일과 room_id가 필요합니다' }, { status: 400 })
  }

  // 보안: 차단 파일 확인
  if (isFileBlocked(file.name)) {
    return NextResponse.json({
      error: `보안상 위험한 파일은 전송할 수 없습니다. (.exe, .bat 등 실행 파일 차단)`,
      blocked: true,
    }, { status: 400 })
  }

  // 크기 제한
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({
      error: `파일 크기는 10MB 이하만 가능합니다.`,
    }, { status: 400 })
  }

  const supabase = getServiceClient()
  const user = await getAuthUser()

  // 파일 업로드
  const ext = file.name.slice(file.name.lastIndexOf('.'))
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

  // 공개 URL 생성
  const { data: urlData } = supabase.storage
    .from('chat-files')
    .getPublicUrl(fileName)

  const fileType = getFileType(file.name)

  return NextResponse.json({
    url: urlData.publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
    fileType,
    senderId: user?.id || null,
  })
}
