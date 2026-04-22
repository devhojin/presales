import { NextResponse, NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { logger } from '@/lib/logger'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/client-ip'

// 2026-04-22 R13-B: 탈퇴 = soft-delete + 개인정보 익명화
// - profiles.deleted_at = now() 표기, 개인정보 컬럼 익명화
// - auth.users 은 삭제하지 않음 (FK 유지, 주문 이력 보존 — 전자상거래법 5년)
// - auth.users email 은 deleted-{uuid}@presales.local 로 익명화, 영구 ban
// - 기존 세션은 admin.signOut(user.id, 'global') 로 전면 폐기
//
// 재인증:
// - email/password 가입자: password 필수
// - OAuth 전용 가입자: confirmPhrase === '탈퇴합니다' 로 대체
const DELETION_CONFIRM_PHRASE = '탈퇴합니다'

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const ip = getClientIp(headersList)
    const rl = await checkRateLimitAsync(`auth:${ip}`, 10, 60_000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, {
        status: 429,
        headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
      })
    }

    const body = await request.json().catch(() => ({}))
    const password: string | undefined = typeof body?.password === 'string' ? body.password : undefined
    const confirmPhrase: string | undefined = typeof body?.confirmPhrase === 'string' ? body.confirmPhrase : undefined
    const deletionReason: string = (typeof body?.reason === 'string' ? body.reason : '').toString().slice(0, 300)

    // 인증 확인
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {}
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const userEmail = user.email
    if (!userEmail) {
      return NextResponse.json({ error: '사용자 이메일을 찾을 수 없습니다' }, { status: 400 })
    }

    // identity provider 파악 (email 유무)
    const identities = (user.identities ?? []) as Array<{ provider?: string }>
    const hasEmailIdentity = identities.some((i) => i.provider === 'email')

    // 재인증
    if (hasEmailIdentity) {
      if (!password) {
        return NextResponse.json({ error: '비밀번호가 필요합니다' }, { status: 400 })
      }
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
    } else {
      if ((confirmPhrase ?? '').trim() !== DELETION_CONFIRM_PHRASE) {
        return NextResponse.json({
          error: `확인 문구가 일치하지 않습니다. "${DELETION_CONFIRM_PHRASE}" 를 입력해주세요.`,
        }, { status: 400 })
      }
    }

    // Service role 클라이언트
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    // 이미 탈퇴 상태인지 확인 (멱등)
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('deleted_at')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile?.deleted_at) {
      return NextResponse.json({ success: true, message: '이미 탈퇴 처리된 계정입니다.' })
    }

    const nowIso = new Date().toISOString()
    const anonymizedEmail = `deleted-${user.id}@presales.local`

    // 1) profiles 익명화 + soft-delete
    const { error: profErr } = await admin
      .from('profiles')
      .update({
        deleted_at: nowIso,
        deletion_reason: deletionReason || null,
        email: anonymizedEmail,
        name: '탈퇴회원',
        phone: null,
        company: null,
        admin_memo: null,
        marketing_opt_in: false,
        marketing_opt_in_at: null,
      })
      .eq('id', user.id)

    if (profErr) {
      logger.error('탈퇴: profiles 익명화 실패', 'auth/delete-account', { userId: user.id, error: profErr.message })
      return NextResponse.json({ error: '탈퇴 처리에 실패했습니다. 다시 시도해주세요.' }, { status: 500 })
    }

    // 2) auth.users 익명화 + 영구 ban (100년)
    //    email_confirm: true → 확인 메일 발송 없이 즉시 교체
    const { error: authUpdErr } = await admin.auth.admin.updateUserById(user.id, {
      email: anonymizedEmail,
      email_confirm: true,
      user_metadata: {},
      app_metadata: { deleted: true, deleted_at: nowIso },
      ban_duration: `${100 * 365 * 24}h`, // 876000h ≈ 100년
    } as never)
    if (authUpdErr) {
      logger.warn('탈퇴: auth.users 익명화/ban 실패', 'auth/delete-account', { error: authUpdErr.message })
    }

    // 3) 세션 전면 폐기
    const { error: signOutErr } = await admin.auth.admin.signOut(user.id, 'global')
    if (signOutErr) {
      logger.warn('탈퇴: 세션 폐기 실패', 'auth/delete-account', { error: signOutErr.message })
    }

    logger.info('회원 탈퇴 처리 완료 (soft-delete)', 'auth/delete-account', {
      userId: user.id,
      at: nowIso,
    })

    return NextResponse.json({ success: true, message: '탈퇴 처리가 완료되었습니다.' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('계정 탈퇴 오류', 'auth/delete-account', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
