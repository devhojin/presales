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

    const settings = await loadRewardSettings(supabase)
    if (!settings.enabled || settings.signupBonus <= 0) {
      return NextResponse.json({ success: true, skipped: true })
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
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('회원가입 적립금 API 오류', 'rewards/signup', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
