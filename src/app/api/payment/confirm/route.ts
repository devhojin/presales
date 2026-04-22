import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { logger } from '@/lib/logger'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/client-ip'
import { recomputeExpectedAmount } from '@/lib/payment-recompute'

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!
const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm'

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const ip = getClientIp(headersList)
    const rl = await checkRateLimitAsync(`payment:${ip}`, 5, 60000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, {
        status: 429,
        headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
      })
    }

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
    const { paymentKey, orderId, amount, chat_payment_id } = body as {
      paymentKey: string
      orderId: string
      amount: number
      chat_payment_id?: string
    }

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ error: 'paymentKey, orderId, amount는 필수입니다' }, { status: 400 })
    }

    // service_role 클라이언트 (RLS 우회해서 서버에서 권위 있는 가격 재계산)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // orderId 형식: "presales_{dbOrderId}_{timestamp}"
    const dbOrderId = parseInt(orderId.split('_')[1], 10)
    if (isNaN(dbOrderId)) {
      return NextResponse.json({ error: '잘못된 주문 ID 형식입니다' }, { status: 400 })
    }

    // 2-pre. 주문 소유권 + 서버 사이드 금액 재검증 (토스 confirm 호출 전에 수행)
    //   - orders INSERT RLS 는 user_id=auth.uid() 만 검증하므로
    //     공격자가 PostgREST 직접 호출로 total_amount 를 임의 숫자로 설정 가능.
    //   - 여기서 DB products.price 기준으로 재계산해서 일치 안 하면 거부.
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
    if (order.status !== 'pending') {
      return NextResponse.json({ error: '주문 상태가 결제 가능한 상태가 아닙니다' }, { status: 409 })
    }

    // 채팅 결제 플로우: chat_payment_requests.amount 가 관리자 생성 값이라 권위 있음.
    // 일반 장바구니 결제 플로우: order_items + products.price 로 재계산.
    let expectedAmount: number | null
    if (chat_payment_id) {
      const { data: pr } = await supabase
        .from('chat_payment_requests')
        .select('amount, user_id, status')
        .eq('id', chat_payment_id)
        .maybeSingle()
      if (!pr) {
        return NextResponse.json({ error: '결제 요청을 찾을 수 없습니다' }, { status: 404 })
      }
      if (pr.user_id !== user.id) {
        return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
      }
      if (pr.status !== 'pending') {
        return NextResponse.json({ error: '이미 처리된 결제 요청입니다' }, { status: 409 })
      }
      expectedAmount = Number(pr.amount)
    } else {
      expectedAmount = await recomputeExpectedAmount(supabase, dbOrderId, user.id, order.coupon_id)
    }
    if (expectedAmount === null) {
      logger.error('주문 재계산 실패', 'payment/confirm', { orderId: dbOrderId })
      return NextResponse.json({ error: '주문 금액 재검증에 실패했습니다' }, { status: 500 })
    }
    if (expectedAmount !== amount) {
      logger.error('서버 재계산 금액 불일치 (가격 조작 의심)', 'payment/confirm', {
        orderId: dbOrderId,
        userId: user.id,
        clientAmount: amount,
        serverExpected: expectedAmount,
        storedTotal: order.total_amount,
      })
      return NextResponse.json(
        { error: '결제 금액이 서버 검증 금액과 일치하지 않습니다. 장바구니에서 다시 진행해주세요.' },
        { status: 400 }
      )
    }

    // 2-post. 쿠폰 예약 (토스 confirm 호출 전에 atomic 으로 usage_count++).
    //   Race window: (재계산→토스→RPC) 흐름에서 max_usage=1 쿠폰에 두 요청이
    //   동시 진입 시 둘 다 재계산을 통과, 토스에서 둘 다 승인, RPC 는 한 쪽만 성공.
    //   진 쪽은 결제 완료 후 로그만 남고 할인은 그대로 먹음.
    //   → "예약 먼저 → 토스 confirm → 실패 시 rollback" 으로 순서 변경.
    let couponReserved = false
    if (order.coupon_id) {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('increment_coupon_usage', {
        p_coupon_id: order.coupon_id,
        p_user_id: user.id,
        p_order_id: dbOrderId,
        p_applied_amount: order.coupon_discount || 0,
      })
      if (rpcErr) {
        logger.error('쿠폰 예약 RPC 실패 (토스 호출 차단)', 'payment/confirm', {
          couponId: order.coupon_id,
          orderId: dbOrderId,
          error: rpcErr.message,
        })
        return NextResponse.json({ error: '쿠폰 사용 예약에 실패했습니다' }, { status: 500 })
      }
      if (rpcResult && (rpcResult as { ok?: boolean }).ok === false) {
        logger.error('쿠폰 사용 거부', 'payment/confirm', {
          couponId: order.coupon_id,
          orderId: dbOrderId,
          result: rpcResult,
        })
        return NextResponse.json(
          { error: '쿠폰을 사용할 수 없습니다 (사용 횟수 소진 등)' },
          { status: 409 }
        )
      }
      couponReserved = true
    }

    // 3. 토스페이먼츠 결제 승인 요청 (서버 재검증 + 쿠폰 예약 완료 후)
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
      // 쿠폰 예약을 롤백 (예약했는데 결제 실패한 경우).
      if (couponReserved && order.coupon_id) {
        const { error: rbErr } = await supabase.rpc('rollback_coupon_usage', {
          p_coupon_id: order.coupon_id,
          p_user_id: user.id,
          p_order_id: dbOrderId,
        })
        if (rbErr) {
          logger.error('쿠폰 rollback 실패 (수동 정정 필요)', 'payment/confirm', {
            couponId: order.coupon_id,
            orderId: dbOrderId,
            error: rbErr.message,
          })
        }
      }
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

    // C-2: 주문 상태 업데이트 (race condition 방지)
    // 가상계좌 결제는 입금 완료 전까지 WAITING_FOR_DEPOSIT → 우리 쪽 status 를 'pending_transfer' 로 유지
    // 토스 webhook 이 입금 완료를 알릴 때 비로소 status='paid' 로 전환
    const isVirtualAccountWaiting = tossData.status === 'WAITING_FOR_DEPOSIT'
    const nextStatus = isVirtualAccountWaiting ? 'pending_transfer' : 'paid'

    const { data: updatedOrders, error: updateError } = await supabase
      .from('orders')
      .update({
        status: nextStatus,
        payment_method: tossData.method || 'card',
        payment_key: paymentKey,
        // 가상계좌 정보 (있을 때만)
        virtual_account: tossData.virtualAccount?.accountNumber || null,
        virtual_account_bank: tossData.virtualAccount?.bankCode || tossData.virtualAccount?.bank || null,
        virtual_account_due: tossData.virtualAccount?.dueDate || null,
        cash_receipt_url: tossData.cashReceipt?.receiptUrl || null,
        paid_at: isVirtualAccountWaiting ? null : new Date().toISOString(),
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

    // 4.5. 쿠폰 예약은 이미 토스 confirm 이전에 완료됨 (위 2-post 블록).

    // 5. 채팅 결제요청 상태 업데이트 (chat_payment_id가 있을 때).
    //   .eq('status', 'pending') 는 이중 업데이트 방지 (동일 결제요청에 대한 경쟁 요청).
    if (chat_payment_id) {
      try {
        const now = new Date().toISOString()
        const { data: pr } = await supabase
          .from('chat_payment_requests')
          .update({ status: 'paid', paid_at: now, order_id: dbOrderId })
          .eq('id', chat_payment_id)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .select('room_id, title, message_id')
          .single()

        if (pr) {
          // 메시지 metadata의 status도 paid로 업데이트
          if (pr.message_id) {
            const { data: msgRow } = await supabase
              .from('chat_messages')
              .select('metadata')
              .eq('id', pr.message_id)
              .single()
            if (msgRow) {
              await supabase
                .from('chat_messages')
                .update({
                  metadata: {
                    ...(msgRow.metadata as Record<string, unknown>),
                    status: 'paid',
                  },
                })
                .eq('id', pr.message_id)
            }
          }
          // 시스템 메시지 추가
          await supabase.from('chat_messages').insert({
            room_id: pr.room_id,
            sender_id: 'system',
            sender_type: 'system',
            message_type: 'system',
            content: `결제 완료: ${pr.title}`,
          })
        }
      } catch (chatErr) {
        const message = chatErr instanceof Error ? chatErr.message : '알 수 없는 오류'
        logger.error('채팅 결제요청 상태 업데이트 실패', 'payment/confirm', { error: message })
        // 결제 자체는 성공했으므로 에러를 클라이언트에 전파하지 않음
      }
    }

    // 6. 주문 확인 이메일 발송 (비동기, 실패해도 결제 성공)
    if (!chat_payment_id) {
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
    }

    return NextResponse.json({
      success: true,
      orderId: dbOrderId,
      status: nextStatus,
      isVirtualAccount: isVirtualAccountWaiting,
      virtualAccount: isVirtualAccountWaiting && tossData.virtualAccount
        ? {
            accountNumber: tossData.virtualAccount.accountNumber ?? null,
            bank: tossData.virtualAccount.bankCode ?? tossData.virtualAccount.bank ?? null,
            dueDate: tossData.virtualAccount.dueDate ?? null,
            customerName: tossData.virtualAccount.customerName ?? null,
          }
        : null,
      cashReceiptUrl: tossData.cashReceipt?.receiptUrl ?? null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('결제 확인 API 오류', 'payment/confirm', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

