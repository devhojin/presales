import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!
const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm'

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
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

    // 2. 요청 바디 파싱
    const body = await request.json()
    const { paymentKey, orderId, amount } = body as {
      paymentKey: string
      orderId: string
      amount: number
    }

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: 'paymentKey, orderId, amount는 필수입니다' }, { status: 400 })
    }

    // 3. 토스페이먼츠 결제 승인 요청
    const authHeader = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')
    const tossRes = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })

    const tossData = await tossRes.json()

    if (!tossRes.ok) {
      logger.error('토스 결제 승인 실패', 'payment/confirm', tossData)
      return NextResponse.json(
        { error: tossData.message || '결제 승인에 실패했습니다' },
        { status: 400 }
      )
    }

    // C-5: 토스페이먼츠 응답 금액 검증
    if (tossData.totalAmount !== amount) {
      logger.error('금액 불일치', 'payment/confirm', { requestAmount: amount, tossAmount: tossData.totalAmount })
      return NextResponse.json(
        { error: '결제 금액이 불일치합니다. 다시 시도해주세요.' },
        { status: 400 }
      )
    }

    // 4. DB에 주문 상태 업데이트
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // orderId 형식: "presales_{dbOrderId}_{timestamp}"
    const dbOrderId = parseInt(orderId.split('_')[1], 10)
    if (isNaN(dbOrderId)) {
      return NextResponse.json({ error: '잘못된 주문 ID 형식입니다' }, { status: 400 })
    }

    // 주문 소유권 확인
    const { data: order } = await supabase
      .from('orders')
      .select('id, user_id, total_amount, status, coupon_id, coupon_discount')
      .eq('id', dbOrderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 })
    }
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }
    if (order.total_amount !== amount) {
      return NextResponse.json({ error: '결제 금액이 일치하지 않습니다' }, { status: 400 })
    }

    // C-2: 주문 상태 업데이트 (race condition 방지)
    const { data: updatedOrders, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method: tossData.method || 'card',
        payment_key: paymentKey,
        paid_at: new Date().toISOString(),
      })
      .eq('id', dbOrderId)
      .eq('status', 'pending')
      .select('id')

    if (updateError) {
      logger.error('주문 업데이트 실패', 'payment/confirm', { error: updateError.message })
      return NextResponse.json({ error: '주문 상태 업데이트에 실패했습니다' }, { status: 500 })
    }

    // 업데이트된 행이 없으면 주문이 이미 처리됨 또는 상태가 변경됨
    if (!updatedOrders || updatedOrders.length === 0) {
      logger.error('주문 상태 변경 불가', 'payment/confirm', { orderId: dbOrderId, currentStatus: order.status })
      return NextResponse.json({ error: '주문이 이미 처리되었거나 상태가 변경되었습니다' }, { status: 409 })
    }

    // 4.5. 쿠폰 사용 기록 + 사용 횟수 증가
    if (order.coupon_id) {
      await supabase.from('coupon_uses').insert({
        coupon_id: order.coupon_id,
        user_id: user.id,
        order_id: dbOrderId,
        applied_amount: order.coupon_discount || 0,
      })
      // 사용 횟수 +1 (동시성: rpc 없이 단순 증가 — 중복 결제 차단은 위 race check로 처리)
      const { data: couponRow } = await supabase
        .from('coupons')
        .select('usage_count')
        .eq('id', order.coupon_id)
        .single()
      await supabase
        .from('coupons')
        .update({ usage_count: (couponRow?.usage_count || 0) + 1 })
        .eq('id', order.coupon_id)
    }

    // 5. 주문 확인 이메일 발송 (비동기, 실패해도 결제 성공)
    try {
      const baseUrl = request.nextUrl.origin
      await fetch(`${baseUrl}/api/email/order-confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ orderId: dbOrderId }),
      })
    } catch (emailErr) {
      const message = emailErr instanceof Error ? emailErr.message : '알 수 없는 오류'
      logger.error('주문 확인 이메일 발송 실패', 'payment/confirm', { error: message })
    }

    return NextResponse.json({ success: true, orderId: dbOrderId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('결제 확인 API 오류', 'payment/confirm', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
