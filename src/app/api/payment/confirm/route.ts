import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { logger } from '@/lib/logger'
import { checkRateLimitAsync } from '@/lib/rate-limit'

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!
const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm'

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') ?? 'unknown'
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

    // 3. 토스페이먼츠 결제 승인 요청 (서버 재검증 통과 후)
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

    // 4.5. 쿠폰 사용 기록 + 사용 횟수 증가 + 회원 보유 쿠폰 소진 (atomic RPC)
    if (order.coupon_id) {
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('increment_coupon_usage', {
        p_coupon_id: order.coupon_id,
        p_user_id: user.id,
        p_order_id: dbOrderId,
        p_applied_amount: order.coupon_discount || 0,
      })
      if (rpcErr) {
        // 결제 자체는 이미 성공. 쿠폰 소진만 실패해도 주문은 완료 처리.
        logger.error('쿠폰 사용 RPC 실패', 'payment/confirm', {
          couponId: order.coupon_id,
          orderId: dbOrderId,
          error: rpcErr.message,
        })
      } else if (rpcResult && (rpcResult as { ok?: boolean }).ok === false) {
        logger.error('쿠폰 사용 거부 (max_usage_exceeded 등)', 'payment/confirm', {
          couponId: order.coupon_id,
          orderId: dbOrderId,
          result: rpcResult,
        })
      }
    }

    // 5. 채팅 결제요청 상태 업데이트 (chat_payment_id가 있을 때)
    if (chat_payment_id) {
      try {
        const now = new Date().toISOString()
        const { data: pr } = await supabase
          .from('chat_payment_requests')
          .update({ status: 'paid', paid_at: now, order_id: dbOrderId })
          .eq('id', chat_payment_id)
          .eq('user_id', user.id)
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

// 주문 금액 서버 재계산.
//   - orders.total_amount 과 order_items.price 둘 다 클라가 넣은 값이라 신뢰 못 함.
//   - products.price (관리자만 쓰기 가능) + 쿠폰/번들할인 규칙 재실행 해서
//     기대 금액을 완전히 서버 권위로 재구성.
/* eslint-disable @typescript-eslint/no-explicit-any */
async function recomputeExpectedAmount(
  supabase: any,
  orderId: number,
  userId: string,
  couponId: string | null,
): Promise<number | null> {
  // 1) 주문 상품 + 현재 DB 가격
  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('product_id, discount_source_product_id, products!inner(id, price, is_free)')
    .eq('order_id', orderId)

  if (itemsErr || !items || items.length === 0) return null

  type ProductRow = { id: number; price: number; is_free: boolean }
  type NormalizedItem = {
    productId: number
    price: number
    isFree: boolean
    discountSourceProductId: number | null
  }
  const normalized: NormalizedItem[] = (items as any[]).map((row) => {
    const p: ProductRow | null = Array.isArray(row.products)
      ? (row.products[0] as ProductRow | undefined) ?? null
      : (row.products as ProductRow | null)
    return {
      productId: row.product_id as number,
      price: Number(p?.price ?? 0),
      isFree: Boolean(p?.is_free),
      discountSourceProductId: (row.discount_source_product_id as number | null) ?? null,
    }
  })

  // 2) 사용자가 실제로 결제 완료한 상품 목록 (번들 할인 자격 확인용)
  const { data: paidOrders } = await supabase
    .from('orders')
    .select('order_items!inner(product_id)')
    .eq('user_id', userId)
    .in('status', ['paid', 'completed'])

  const purchasedIds = new Set<number>()
  for (const o of paidOrders ?? []) {
    const list = (o.order_items ?? []) as Array<{ product_id: number }>
    for (const it of list) purchasedIds.add(it.product_id)
  }

  // 3) 번들 할인 매치 조회 (target 은 현재 주문 상품, source 는 사용자 기존 구매)
  const targetIds = Array.from(new Set(normalized.map((n) => n.productId)))
  const sourceIds = Array.from(purchasedIds)
  type MatchRow = { source_product_id: number; target_product_id: number; discount_type: string; discount_amount: number }
  let matches: MatchRow[] = []
  if (sourceIds.length > 0 && targetIds.length > 0) {
    const { data: matchRows } = await supabase
      .from('product_discount_matches')
      .select('source_product_id, target_product_id, discount_type, discount_amount')
      .in('target_product_id', targetIds)
      .in('source_product_id', sourceIds)
      .eq('is_active', true)
    matches = (matchRows ?? []) as MatchRow[]
  }

  // 'auto' 타입은 source 상품의 현재 가격을 할인으로 사용 → source 가격도 필요
  const autoSourceIds = Array.from(new Set(matches.filter((m) => m.discount_type === 'auto').map((m) => m.source_product_id)))
  const sourcePriceMap = new Map<number, number>()
  if (autoSourceIds.length > 0) {
    const { data: srcProducts } = await supabase
      .from('products')
      .select('id, price')
      .in('id', autoSourceIds)
    for (const p of (srcProducts ?? []) as Array<{ id: number; price: number }>) {
      sourcePriceMap.set(p.id, Number(p.price))
    }
  }

  // 4) 각 아이템별 최대 할인 적용 후 합산
  let rawTotal = 0
  for (const it of normalized) {
    if (it.isFree) continue
    const itemMatches = matches.filter((m) => m.target_product_id === it.productId)
    let bestDiscount = 0
    for (const m of itemMatches) {
      const d = m.discount_type === 'auto'
        ? (sourcePriceMap.get(m.source_product_id) ?? 0)
        : Number(m.discount_amount ?? 0)
      if (d > bestDiscount) bestDiscount = d
    }
    const effective = Math.max(0, it.price - bestDiscount)
    rawTotal += effective
  }

  // 5) 쿠폰 재검증 (만료/활성/최소금액/사용횟수 전부 체크)
  let couponDiscount = 0
  if (couponId) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('discount_type, discount_value, min_order_amount, valid_from, valid_until, usage_count, max_usage, is_active')
      .eq('id', couponId)
      .maybeSingle()
    if (coupon && coupon.is_active) {
      const now = new Date()
      const validFrom = coupon.valid_from ? new Date(coupon.valid_from as string) : null
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until as string) : null
      const usageOk = coupon.max_usage === null || Number(coupon.usage_count ?? 0) < Number(coupon.max_usage)
      const minOk = !coupon.min_order_amount || rawTotal >= Number(coupon.min_order_amount)
      const fromOk = !validFrom || validFrom <= now
      const untilOk = !validUntil || validUntil >= now
      if (usageOk && minOk && fromOk && untilOk) {
        const dv = Number(coupon.discount_value ?? 0)
        couponDiscount = coupon.discount_type === 'percentage'
          ? Math.floor((rawTotal * dv) / 100)
          : Math.min(dv, rawTotal)
      }
    }
  }

  return Math.max(0, rawTotal - couponDiscount)
}
