import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/client-ip'
import { grantRewardPoints, loadRewardSettings } from '@/lib/reward-points'

type Body = {
  agreeTerms?: boolean
  agreePrivacy?: boolean
  agreeAge?: boolean
  agreeMarketing?: boolean
  name?: string
  company?: string
  phone?: string
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const ip = getClientIp(headersList)
    const rl = await checkRateLimitAsync(`complete-signup:${ip}`, 5, 60_000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const service = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          { auth: { persistSession: false, autoRefreshToken: false } }
        )
      : null

    const body = (await request.json().catch(() => ({}))) as Body

    if (!body.agreeTerms || !body.agreePrivacy || !body.agreeAge) {
      return NextResponse.json({ error: '필수 동의 항목이 누락되었습니다' }, { status: 400 })
    }

    // 이미 동의 처리된 계정이면 무시 (중복 쿠폰 방지)
    const profileClient = service ?? supabase
    const { data: existing, error: existingErr } = await profileClient
      .from('profiles')
      .select('terms_agreed_at, deleted_at, email')
      .eq('id', user.id)
      .maybeSingle()

    if (existingErr) {
      logger.error('complete-signup profile 조회 실패', 'auth/complete-signup', { error: existingErr.message, userId: user.id })
      return NextResponse.json({ error: '프로필 조회 실패' }, { status: 500 })
    }

    if (existing?.deleted_at) {
      return NextResponse.json({ error: '탈퇴된 계정입니다' }, { status: 403 })
    }

    const alreadyAgreed = Boolean(existing?.terms_agreed_at)
    const nowIso = new Date().toISOString()

    const name = (body.name || user.user_metadata?.name || user.user_metadata?.full_name || '').toString().slice(0, 60)
    const company = (body.company || '').toString().slice(0, 120)
    const phone = (body.phone || '').toString().slice(0, 20)

    const profileValues = {
      name: name || null,
      company: company || null,
      phone: phone || null,
      terms_agreed_at: nowIso,
      privacy_agreed_at: nowIso,
      overseas_agreed_at: nowIso,
      age_agreed_at: nowIso,
      marketing_opt_in: Boolean(body.agreeMarketing),
      marketing_opt_in_at: body.agreeMarketing ? nowIso : null,
    }

    const email = existing?.email || user.email
    if (!email) {
      return NextResponse.json({ error: '이메일 정보를 확인할 수 없습니다' }, { status: 400 })
    }

    if (!existing && !service) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY 누락으로 OAuth profile 생성 불가', 'auth/complete-signup', { userId: user.id })
      return NextResponse.json({ error: '프로필 저장 설정 오류' }, { status: 500 })
    }

    const saveResult = existing
      ? await profileClient
          .from('profiles')
          .update(profileValues)
          .eq('id', user.id)
          .select('id')
          .maybeSingle()
      : await service!
          .from('profiles')
          .insert({
            id: user.id,
            email,
            role: 'user',
            ...profileValues,
          })
          .select('id')
          .single()

    const updErr = saveResult.error
    const savedProfile = saveResult.data

    if (updErr) {
      logger.error('complete-signup profile update 실패', 'auth/complete-signup', { error: updErr.message, userId: user.id })
      return NextResponse.json({ error: '프로필 저장 실패' }, { status: 500 })
    }

    if (!savedProfile) {
      logger.error('complete-signup profile 저장 결과 없음', 'auth/complete-signup', { userId: user.id })
      return NextResponse.json({ error: '프로필 저장 실패' }, { status: 500 })
    }

    // 이미 동의한 계정이면 쿠폰/메일 건너뜀 (멱등)
    if (alreadyAgreed) {
      return NextResponse.json({ success: true, couponIssued: false, welcomeSent: false })
    }

    // WELCOME10K 쿠폰 발급 (이미 가진 경우 skip)
    let couponIssued = false
    const { data: welcome } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', 'WELCOME10K')
      .eq('is_active', true)
      .maybeSingle()

    if (welcome) {
      const { data: already } = await supabase
        .from('user_coupons')
        .select('id')
        .eq('user_id', user.id)
        .eq('coupon_id', welcome.id)
        .maybeSingle()

      if (!already) {
        const { error: couponErr } = await supabase.from('user_coupons').insert({
          user_id: user.id,
          coupon_id: welcome.id,
          source: 'signup',
        })
        if (couponErr) {
          logger.warn('complete-signup WELCOME10K 발급 실패', 'auth/complete-signup', { error: couponErr.message })
        } else {
          couponIssued = true
        }
      }
    }

    if (service) {
      const settings = await loadRewardSettings(service)
      if (settings.enabled && settings.signupBonus > 0) {
        const rewardResult = await grantRewardPoints(service, {
          userId: user.id,
          amount: settings.signupBonus,
          type: 'signup',
          sourceKey: `signup:${user.id}`,
          memo: '신규회원가입 적립금',
        })
        if (rewardResult.ok === false) {
          logger.warn('complete-signup 회원가입 적립금 지급 실패', 'auth/complete-signup', {
            userId: user.id,
            reason: rewardResult.reason,
          })
        }
      }
    }

    // 환영 이메일 (fire-and-forget)
    const emailAddr = user.email
    let welcomeSent = false
    if (emailAddr) {
      try {
        const origin = new URL(request.url).origin
        await fetch(`${origin}/api/email/welcome`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: request.headers.get('cookie') ?? '',
          },
          body: JSON.stringify({ email: emailAddr, name: name || '회원' }),
        })
        welcomeSent = true
      } catch (e) {
        logger.warn('complete-signup welcome 메일 발송 실패', 'auth/complete-signup', { error: (e as Error).message })
      }
    }

    return NextResponse.json({ success: true, couponIssued, welcomeSent })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('complete-signup 오류', 'auth/complete-signup', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
