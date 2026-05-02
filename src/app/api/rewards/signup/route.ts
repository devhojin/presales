import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'
import { grantRewardPoints, loadRewardSettings } from '@/lib/reward-points'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      },
    )

    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    let couponIssued = false
    let couponSkipped = false

    const { data: welcome, error: welcomeErr } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', 'WELCOME10K')
      .eq('is_active', true)
      .maybeSingle()

    if (welcomeErr) {
      logger.warn('회원가입 쿠폰 조회 실패', 'rewards/signup', {
        userId: user.id,
        error: welcomeErr.message,
      })
    } else if (welcome) {
      const { data: already, error: alreadyErr } = await supabase
        .from('user_coupons')
        .select('id')
        .eq('user_id', user.id)
        .eq('coupon_id', welcome.id)
        .maybeSingle()

      if (alreadyErr) {
        logger.warn('회원가입 쿠폰 보유 여부 조회 실패', 'rewards/signup', {
          userId: user.id,
          error: alreadyErr.message,
        })
      } else if (already) {
        couponSkipped = true
      } else {
        const { error: couponErr } = await supabase.from('user_coupons').insert({
          user_id: user.id,
          coupon_id: welcome.id,
          source: 'signup',
        })

        if (couponErr) {
          logger.warn('회원가입 쿠폰 발급 실패', 'rewards/signup', {
            userId: user.id,
            error: couponErr.message,
          })
        } else {
          couponIssued = true
        }
      }
    }

    const settings = await loadRewardSettings(supabase)
    if (!settings.enabled || settings.signupBonus <= 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        rewardSkipped: true,
        couponIssued,
        couponSkipped,
      })
    }

    const result = await grantRewardPoints(supabase, {
      userId: user.id,
      amount: settings.signupBonus,
      type: 'signup',
      sourceKey: `signup:${user.id}`,
      memo: '신규회원가입 적립금',
    })

    if (!result.ok) {
      logger.error('회원가입 적립금 지급 실패', 'rewards/signup', {
        userId: user.id,
        reason: result.reason,
      })
      return NextResponse.json({ error: '적립금 지급 실패' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      amount: settings.signupBonus,
      skipped: Boolean(result.skipped),
      rewardSkipped: Boolean(result.skipped),
      couponIssued,
      couponSkipped,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('회원가입 적립금 API 오류', 'rewards/signup', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
