import { NextResponse, NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { logger } from '@/lib/logger'
import { checkRateLimitAsync } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') ?? 'unknown'
    const rl = await checkRateLimitAsync(`auth:${ip}`, 10, 60000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, {
        status: 429,
        headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
      })
    }

    // Request body에서 password 받기
    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: '비밀번호가 필요합니다' }, { status: 400 })
    }

    // 인증 확인 (서버사이드 쿠키)
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Component에서는 무시
            }
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 비밀번호 검증
    const userEmail = user.email
    if (!userEmail) {
      return NextResponse.json({ error: '사용자 이메일을 찾을 수 없습니다' }, { status: 400 })
    }

    // 현재 서버 세션 쿠키와 분리된 별도 anon 클라이언트로 비밀번호 확인 —
    // signInWithPassword 가 쿠키 세션에 영향을 주지 않도록.
    const verifyClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: userEmail,
      password,
    })

    if (signInError) {
      return NextResponse.json({ error: '비밀번호가 올바르지 않습니다' }, { status: 403 })
    }

    // Service Role 클라이언트로 auth.users 삭제
    // profiles 는 ON DELETE CASCADE 로 auth.users 삭제 시 자동 삭제되므로
    // 먼저 profile 을 지우면 실패 시 orphan 상태가 된다 → auth.users 삭제 한 번만.
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
    if (deleteError) {
      const raw = deleteError.message || ''
      const isFkViolation = /foreign key|violates|23503/i.test(raw)
      const clientMsg = isFkViolation
        ? '주문·리뷰·컨설팅 기록이 있어 계정을 삭제할 수 없습니다. 고객센터(hojin@amarans.co.kr) 로 문의해주세요.'
        : '계정 삭제에 실패했습니다.'
      logger.error('계정 삭제 실패', 'auth/delete-account', { userId: user.id, error: raw })
      return NextResponse.json({ error: clientMsg }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '계정이 삭제되었습니다.' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('계정 삭제 오류', 'auth/delete-account', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
