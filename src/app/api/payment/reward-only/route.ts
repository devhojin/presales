import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { logger } from '@/lib/logger'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/client-ip'
import { recomputeExpectedAmount } from '@/lib/payment-recompute'
import { checkGlobalFreeUserLimit } from '@/lib/free-user-limit'
import {
  confirmRewardPoints,
  grantPurchaseRewardForOrder,
  reserveRewardPoints,
  rollbackRewardPoints,
} from '@/lib/reward-points'

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const ip = getClientIp(headersList)
    const rl = await checkRateLimitAsync(`payment-reward-only:${ip}`, 10, 60_000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

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
      },
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const body = (await request.json()) as { orderId?: number }
    const orderId = Number(body.orderId)
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: 'orderId는 필수입니다' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: order } = await supabase
      .from('orders')
      .select('id, user_id, total_amount, status, coupon_id, coupon_discount, reward_discount')
      .eq('id', orderId)
      .maybeSingle()

    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 })
    }
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }
    if (order.status !== 'pending') {
      return NextResponse.json({ error: '주문 상태가 결제 가능한 상태가 아닙니다' }, { status: 409 })
    }

    const rewardDiscount = Math.max(0, Number(order.reward_discount ?? 0))

    const expectedAmount = await recomputeExpectedAmount(
      supabase,
      orderId,
      user.id,
      order.coupon_id as string | null,
      rewardDiscount,
    )
    if (expectedAmount === null) {
      logger.error('0원 주문 재계산 실패', 'payment/reward-only', { orderId })
      return NextResponse.json({ error: '주문 금액 재검증에 실패했습니다' }, { status: 500 })
    }
    if (expectedAmount !== 0 || Number(order.total_amount) !== 0) {
      logger.error('0원 주문 금액 불일치', 'payment/reward-only', {
        orderId,
        expectedAmount,
        storedTotal: order.total_amount,
      })
      return NextResponse.json(
        { error: '0원 주문 처리 가능한 주문이 아닙니다. 장바구니에서 다시 진행해주세요.' },
        { status: 400 },
      )
    }

    const freeLimit = await checkGlobalFreeUserLimit(supabase, user.id)
    if (!freeLimit.allowed) {
      return NextResponse.json(
        { error: freeLimit.error, limit: freeLimit.limit, used: freeLimit.used },
        { status: 403 },
      )
    }

    let couponReserved = false
    if (order.coupon_id) {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('increment_coupon_usage', {
        p_coupon_id: order.coupon_id,
        p_user_id: user.id,
        p_order_id: orderId,
        p_applied_amount: order.coupon_discount || 0,
      })
      if (rpcErr) {
        logger.error('0원 주문 쿠폰 예약 RPC 실패', 'payment/reward-only', {
          couponId: order.coupon_id,
          orderId,
          error: rpcErr.message,
        })
        return NextResponse.json({ error: '쿠폰 사용 예약에 실패했습니다' }, { status: 500 })
      }
      if (rpcResult && (rpcResult as { ok?: boolean }).ok === false) {
        logger.error('0원 주문 쿠폰 사용 거부', 'payment/reward-only', {
          couponId: order.coupon_id,
          orderId,
          result: rpcResult,
        })
        return NextResponse.json({ error: '쿠폰을 사용할 수 없습니다' }, { status: 409 })
      }
      couponReserved = true
    }

    let rewardReserved = false
    if (rewardDiscount > 0) {
      const reserve = await reserveRewardPoints(supabase, user.id, orderId, rewardDiscount)
      if (!reserve.ok) {
        if (couponReserved && order.coupon_id) {
          await supabase.rpc('rollback_coupon_usage', {
            p_coupon_id: order.coupon_id,
            p_user_id: user.id,
            p_order_id: orderId,
          })
        }
        return NextResponse.json({ error: '적립금 사용 예약에 실패했습니다' }, { status: 409 })
      }
      rewardReserved = true
    }

    const paidAt = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method: rewardDiscount > 0 ? 'reward' : 'discount',
        paid_at: paidAt,
        updated_at: paidAt,
      })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select('id')

    if (updateError || !updated || updated.length === 0) {
      if (rewardReserved) await rollbackRewardPoints(supabase, orderId)
      if (couponReserved && order.coupon_id) {
        await supabase.rpc('rollback_coupon_usage', {
          p_coupon_id: order.coupon_id,
          p_user_id: user.id,
          p_order_id: orderId,
        })
      }
      logger.error('0원 주문 상태 변경 실패', 'payment/reward-only', {
        orderId,
        error: updateError?.message,
      })
      return NextResponse.json({ error: '주문 상태 업데이트에 실패했습니다' }, { status: 500 })
    }

    if (rewardReserved) await confirmRewardPoints(supabase, orderId)
    const grant = await grantPurchaseRewardForOrder(supabase, orderId)
    if (grant.ok === false) {
      logger.error('0원 주문 구매 적립 실패', 'payment/reward-only', {
        orderId,
        reason: grant.reason,
      })
    }

    try {
      const baseUrl = request.nextUrl.origin
      await fetch(`${baseUrl}/api/email/order-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ orderId }),
      })
    } catch (emailErr) {
      const message = emailErr instanceof Error ? emailErr.message : '알 수 없는 오류'
      logger.error('0원 주문 이메일 발송 실패(무시)', 'payment/reward-only', { error: message })
    }

    return NextResponse.json({ success: true, orderId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('0원 주문 API 오류', 'payment/reward-only', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
