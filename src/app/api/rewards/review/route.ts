import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'
import { grantRewardPoints, loadRewardSettings } from '@/lib/reward-points'

export async function POST(request: NextRequest) {
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

    const body = (await request.json().catch(() => ({}))) as { productId?: number }
    const productId = Number(body.productId)
    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json({ error: 'productId는 필수입니다' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, is_verified_purchase')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (reviewError || !review) {
      return NextResponse.json({ error: '후기를 찾을 수 없습니다' }, { status: 404 })
    }
    if (!review.is_verified_purchase) {
      return NextResponse.json({ success: true, skipped: true, reason: 'not_verified_purchase' })
    }

    const settings = await loadRewardSettings(supabase)
    if (!settings.enabled || settings.reviewBonus <= 0) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const reviewId = Number(review.id)
    const result = await grantRewardPoints(supabase, {
      userId: user.id,
      amount: settings.reviewBonus,
      type: 'review',
      sourceKey: `review:${reviewId}`,
      reviewId,
      memo: '구매 인증 후기 작성 적립금',
    })

    if (!result.ok) {
      logger.error('후기 적립금 지급 실패', 'rewards/review', {
        userId: user.id,
        productId,
        reason: result.reason,
      })
      return NextResponse.json({ error: '적립금 지급 실패' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      amount: settings.reviewBonus,
      skipped: Boolean(result.skipped),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('후기 적립금 API 오류', 'rewards/review', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
