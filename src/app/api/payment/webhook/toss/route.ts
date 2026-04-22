import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { checkRateLimitAsync } from '@/lib/rate-limit'

// 토스페이먼츠 webhook: 가상계좌 입금 완료 등 결제 상태 변경 이벤트
// 대시보드(https://dashboard.tosspayments.com/my/webhook) 에서
// 이 URL 을 등록: https://presales-zeta.vercel.app/api/payment/webhook/toss
//
// 이벤트 종류:
//   - DEPOSIT_CALLBACK: 가상계좌 입금 완료 → status=DONE 으로 전환
//   - PAYMENT_STATUS_CHANGED: 결제 상태 변화 (취소/환불 포함)
//
// 보안: 토스는 webhook 서명을 제공하지 않으므로,
//       body 의 paymentKey/orderId 를 토스 API 에 역조회하여 실제 결제 상태를 검증한다.

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY!

type TossWebhookBody = {
  eventType?: string
  createdAt?: string
  data?: {
    paymentKey?: string
    orderId?: string
    status?: string
    secret?: string
  }
  // 구버전 포맷 호환
  paymentKey?: string
  orderId?: string
  status?: string
  secret?: string
}

async function fetchTossPayment(paymentKey: string) {
  const auth = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')
  const res = await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`, {
    headers: { Authorization: `Basic ${auth}` },
  })
  if (!res.ok) return null
  return res.json() as Promise<Record<string, unknown>>
}

export async function POST(request: NextRequest) {
  try {
    // Webhook 은 서명 검증이 없어 어떤 발신자든 호출 가능.
    // 오남용 시 토스 API 역조회 쿼터가 소진되므로 IP 기반 sliding window 로 완충.
    // 정상 webhook 은 건당 1회 이하이므로 분당 30회는 충분히 여유롭다.
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const rl = await checkRateLimitAsync(`toss-webhook:${ip}`, 30, 60_000)
    if (!rl.allowed) {
      logger.error('토스 webhook: rate limit 초과', 'payment/webhook/toss', { ip })
      return NextResponse.json({ ok: false }, { status: 429 })
    }

    const body = (await request.json()) as TossWebhookBody
    const paymentKey = body.data?.paymentKey ?? body.paymentKey
    const orderId = body.data?.orderId ?? body.orderId
    if (!paymentKey || !orderId) {
      logger.error('토스 webhook: paymentKey/orderId 누락', 'payment/webhook/toss', { body })
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    // 토스에 실제 결제 상태 역조회
    const payment = await fetchTossPayment(paymentKey)
    if (!payment) {
      logger.error('토스 webhook: 결제 역조회 실패', 'payment/webhook/toss', { paymentKey })
      return NextResponse.json({ ok: false }, { status: 502 })
    }

    const tossStatus = String(payment.status ?? '')
    const totalAmount = Number(payment.totalAmount ?? 0)
    const method = String(payment.method ?? '')
    const cashReceipt = (payment.cashReceipt ?? null) as { receiptUrl?: string } | null

    // orderId 형식: "presales_{dbOrderId}_{timestamp}"
    const dbOrderId = parseInt(String(orderId).split('_')[1], 10)
    if (isNaN(dbOrderId)) {
      logger.error('토스 webhook: orderId 형식 오류', 'payment/webhook/toss', { orderId })
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, status, total_amount, payment_key')
      .eq('id', dbOrderId)
      .single()

    if (orderErr || !order) {
      logger.error('토스 webhook: 주문 조회 실패', 'payment/webhook/toss', { dbOrderId, error: orderErr?.message })
      return NextResponse.json({ ok: false }, { status: 404 })
    }

    // 금액 검증 (위·변조 방지)
    if (order.total_amount !== totalAmount) {
      logger.error('토스 webhook: 금액 불일치', 'payment/webhook/toss', {
        dbOrderId,
        orderAmount: order.total_amount,
        tossAmount: totalAmount,
      })
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    // 상태 전환 매핑
    //   토스 DONE        → paid (pending/pending_transfer 에서만 전환. paid → paid 중복 webhook 은 무시)
    //   WAITING_FOR_DEPOSIT → pending_transfer (이미 confirm 에서 처리)
    //   CANCELED/EXPIRED  → cancelled (paid/completed 에서도 전환 허용 — 입금 취소 + 환불)
    //   PARTIAL_CANCELED  → 부분 환불: 주문 status 는 유지 (cancelled 로 바꾸면 다운로드 차단 오동작)
    let nextStatus: string | null = null
    const patch: Record<string, unknown> = {}

    if (tossStatus === 'DONE') {
      // 멱등성: 이미 paid/completed 인 주문에 DONE webhook 재도달 시 이메일 재발송 방지
      if (order.status === 'paid' || order.status === 'completed') {
        return NextResponse.json({ ok: true, ignored: 'already_paid' })
      }
      nextStatus = 'paid'
      patch.paid_at = new Date().toISOString()
      if (method) patch.payment_method = method
      if (cashReceipt?.receiptUrl) patch.cash_receipt_url = cashReceipt.receiptUrl
    } else if (tossStatus === 'CANCELED' || tossStatus === 'EXPIRED') {
      if (order.status === 'cancelled') {
        return NextResponse.json({ ok: true, ignored: 'already_cancelled' })
      }
      nextStatus = 'cancelled'
      patch.cancelled_at = new Date().toISOString()
    } else if (tossStatus === 'PARTIAL_CANCELED') {
      // 부분 환불: 주문 상태는 그대로 두고 메타만 기록 (다운로드 차단 오동작 방지)
      logger.error('토스 webhook: 부분 환불 수신 (상태 유지)', 'payment/webhook/toss', { dbOrderId })
      return NextResponse.json({ ok: true, ignored: 'partial_canceled_logged' })
    } else if (tossStatus === 'WAITING_FOR_DEPOSIT') {
      // 별도 액션 없음 (confirm 에서 이미 pending_transfer 세팅)
      return NextResponse.json({ ok: true, ignored: 'waiting_for_deposit' })
    } else {
      return NextResponse.json({ ok: true, ignored: tossStatus })
    }

    patch.status = nextStatus
    const { error: upErr } = await supabase.from('orders').update(patch).eq('id', dbOrderId)
    if (upErr) {
      logger.error('토스 webhook: 주문 업데이트 실패', 'payment/webhook/toss', { dbOrderId, error: upErr.message })
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    // DONE 으로 전환된 경우 주문 확인 이메일 트리거
    if (nextStatus === 'paid') {
      try {
        const baseUrl = request.nextUrl.origin
        const internalSecret = process.env.CRON_SECRET
        if (!internalSecret) {
          logger.error('토스 webhook: CRON_SECRET 미설정 → 이메일 발송 스킵', 'payment/webhook/toss', { dbOrderId })
        } else {
          await fetch(`${baseUrl}/api/email/order-confirm`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Secret': internalSecret,
            },
            body: JSON.stringify({ orderId: dbOrderId }),
          })
        }
      } catch (emailErr) {
        const message = emailErr instanceof Error ? emailErr.message : '알 수 없는 오류'
        logger.error('토스 webhook: 이메일 발송 실패(무시)', 'payment/webhook/toss', { error: message })
      }
    }

    return NextResponse.json({ ok: true, status: nextStatus })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('토스 webhook 처리 오류', 'payment/webhook/toss', { error: message })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

// 토스 대시보드 webhook 테스트 버튼을 위한 GET (단순 200 OK)
export async function GET() {
  return NextResponse.json({ ok: true })
}
