import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, getAuthUser, isAdmin } from '@/lib/chat'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { headers } from 'next/headers'

const SIGNED_URL_EXPIRES_SEC = 60 * 10 // 10분

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') ?? 'unknown'
    const rl = await checkRateLimitAsync(`signed-url:${ip}`, 60, 60000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { bucket, path, guest_id } = body as {
      bucket?: string
      path?: string
      guest_id?: string | null
    }

    if (!bucket || !path) {
      return NextResponse.json({ error: 'bucket, path 가 필요합니다' }, { status: 400 })
    }

    const user = await getAuthUser()
    const supabase = getServiceClient()

    if (bucket === 'chat-files') {
      // path 첫 segment = room_id
      const roomId = path.split('/')[0]
      if (!roomId) {
        return NextResponse.json({ error: '경로가 올바르지 않습니다' }, { status: 400 })
      }
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('user_id, guest_id')
        .eq('id', roomId)
        .maybeSingle()
      if (!room) {
        return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 })
      }
      const isOwner = (user && room.user_id === user.id)
        || (guest_id && room.guest_id === guest_id)
      const admin = user ? await isAdmin(user.id) : false
      if (!isOwner && !admin) {
        return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
      }
    } else if (bucket === 'consulting-files') {
      if (!user || !(await isAdmin(user.id))) {
        return NextResponse.json({ error: '관리자만 접근 가능합니다' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: '지원하지 않는 버킷입니다' }, { status: 400 })
    }

    const { data: signed, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_EXPIRES_SEC)

    if (error || !signed) {
      return NextResponse.json({ error: error?.message || '서명 URL 생성 실패' }, { status: 500 })
    }

    return NextResponse.json({ url: signed.signedUrl, expiresIn: SIGNED_URL_EXPIRES_SEC })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
