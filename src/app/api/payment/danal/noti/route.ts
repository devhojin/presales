import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/client-ip'
import {
  confirmRewardPoints,
  grantPurchaseRewardForOrder,
} from '@/lib/reward-points'

type DanalNotiPayload = {
  code?: string
  message?: string
  transactionId?: string
  orderId?: string
  amount?: string
  depositDateTime?: string
  virtualAccountNumber?: string
  accountHolder?: string
  depositorName?: string
  userId?: string
  userEmail?: string
  orderName?: string
  expireDateTime?: string
  bankCode?: string
  bankName?: string
  useCashReceipt?: string
}

type PaymentOrder = {
  id: number
  user_id: string
  status: string | null
  total_amount: number
  payment_key: string | null
  coupon_id: string | null
  coupon_discount: number | null
  reward_discount: number | null
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function jsonResponse(code: 'SUCCESS' | 'FAIL') {
  return NextResponse.json({ code }, { status: 200 })
}

function parseDbOrderId(orderId: string) {
  const match = /^presales_(\d+)_\d+$/.exec(orderId)
  return match ? Number(match[1]) : NaN
}

function parseAmount(value: string | undefined) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : NaN
}

function parseDanalDateTime(value: string | undefined) {
  if (!value || !/^\d{14}$/.test(value)) return null
  const year = value.slice(0, 4)
  const month = value.slice(4, 6)
  const day = value.slice(6, 8)
  const hour = value.slice(8, 10)
  const minute = value.slice(10, 12)
  const second = value.slice(12, 14)
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

async function readDanalNotiPayload(request: NextRequest): Promise<DanalNotiPayload> {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const payload: Record<string, string> = {}
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') payload[key] = value.trim()
    }
    return payload
  }

  const buffer = await request.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const charsetMatch = /charset=([^;]+)/i.exec(contentType)
  const charsets = charsetMatch ? [charsetMatch[1], 'utf-8', 'euc-kr'] : ['utf-8', 'euc-kr']
  for (const charset of charsets) {
    try {
      const text = new TextDecoder(charset).decode(bytes).trim()
      if (!text) return {}
      return JSON.parse(text) as DanalNotiPayload
    } catch {
      // Try the next decoder/parser combination.
    }
  }
  return {}
}

async function sendOrderConfirmEmail(request: NextRequest, dbOrderId: number) {
  try {
    const internalSecret = process.env.CRON_SECRET
    if (!internalSecret) {
      logger.error('다날 Noti: CRON_SECRET 미설정으로 이메일 발송 스킵', 'payment/danal/noti', { dbOrderId })
      return
    }
    await fetch(`${request.nextUrl.origin}/api/email/order-confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': internalSecret,
      },
      body: JSON.stringify({ orderId: dbOrderId }),
    })
  } catch (emailErr) {
    const message = emailErr instanceof Error ? emailErr.message : '알 수 없는 오류'
    logger.error('다날 Noti: 주문 확인 이메일 발송 실패(무시)', 'payment/danal/noti', { error: message })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers)
    const rl = await checkRateLimitAsync(`danal-noti:${ip}`, 120, 60_000)
    if (!rl.allowed) {
      logger.error('다날 Noti: rate limit 초과', 'payment/danal/noti', { ip })
      return jsonResponse('FAIL')
    }

    const payload = await readDanalNotiPayload(request)
    if (payload.code !== 'SUCCESS') {
      logger.error('다날 Noti: SUCCESS가 아닌 통지 수신', 'payment/danal/noti', {
        code: payload.code,
        message: payload.message,
      })
      return jsonResponse('FAIL')
    }

    const transactionId = payload.transactionId
    const orderId = payload.orderId
    const amount = parseAmount(payload.amount)
    if (!transactionId || !orderId || !Number.isFinite(amount)) {
      logger.error('다날 Noti: 필수 파라미터 누락', 'payment/danal/noti', { payload })
      return jsonResponse('FAIL')
    }

    const dbOrderId = parseDbOrderId(orderId)
    if (!Number.isInteger(dbOrderId) || dbOrderId <= 0) {
      logger.error('다날 Noti: orderId 형식 오류', 'payment/danal/noti', { orderId })
      return jsonResponse('FAIL')
    }

    const supabase = createClient(
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    )

    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select('id, user_id, status, total_amount, payment_key, coupon_id, coupon_discount, reward_discount')
      .eq('id', dbOrderId)
      .single()
    const order = orderData as PaymentOrder | null
    if (orderErr || !order) {
      logger.error('다날 Noti: 주문 조회 실패', 'payment/danal/noti', { dbOrderId, error: orderErr?.message })
      return jsonResponse('FAIL')
    }

    if (Number(order.total_amount) !== amount) {
      logger.error('다날 Noti: 금액 불일치', 'payment/danal/noti', {
        dbOrderId,
        orderAmount: order.total_amount,
        danalAmount: amount,
      })
      return jsonResponse('FAIL')
    }

    if (order.status === 'paid' || order.status === 'completed') {
      return jsonResponse('SUCCESS')
    }
    if (order.status !== 'pending_transfer' && order.status !== 'pending') {
      logger.error('다날 Noti: 처리 불가 주문 상태', 'payment/danal/noti', {
        dbOrderId,
        status: order.status,
      })
      return jsonResponse('FAIL')
    }

    let couponReservedForPending = false
    if (order.status === 'pending' && order.coupon_id) {
      const { data: couponResult, error: couponErr } = await supabase.rpc('increment_coupon_usage', {
        p_coupon_id: order.coupon_id,
        p_user_id: order.user_id,
        p_order_id: dbOrderId,
        p_applied_amount: order.coupon_discount || 0,
      })
      if (couponErr || (couponResult && (couponResult as { ok?: boolean }).ok === false)) {
        logger.error('다날 Noti: pending 주문 쿠폰 예약 실패', 'payment/danal/noti', {
          dbOrderId,
          couponId: order.coupon_id,
          error: couponErr?.message,
          result: couponResult,
        })
        return jsonResponse('FAIL')
      }
      couponReservedForPending = true
    }

    const paidAt = parseDanalDateTime(payload.depositDateTime) ?? new Date().toISOString()
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method: 'virtual_account',
        payment_key: transactionId,
        virtual_account: payload.virtualAccountNumber ?? null,
        virtual_account_bank: payload.bankName || payload.bankCode || null,
        virtual_account_due: parseDanalDateTime(payload.expireDateTime),
        paid_at: paidAt,
      } as Record<string, unknown>)
      .eq('id', dbOrderId)
      .in('status', ['pending_transfer', 'pending'])

    if (updateError) {
      if (couponReservedForPending && order.coupon_id) {
        await supabase.rpc('rollback_coupon_usage', {
          p_coupon_id: order.coupon_id,
          p_user_id: order.user_id,
          p_order_id: dbOrderId,
        })
      }
      logger.error('다날 Noti: 주문 업데이트 실패', 'payment/danal/noti', {
        dbOrderId,
        error: updateError.message,
      })
      return jsonResponse('FAIL')
    }

    const rewardConfirm = await confirmRewardPoints(supabase, dbOrderId)
    if (!rewardConfirm.ok) {
      logger.error('다날 Noti: 적립금 사용 확정 실패', 'payment/danal/noti', {
        dbOrderId,
        reason: rewardConfirm.reason,
      })
    }
    const grant = await grantPurchaseRewardForOrder(supabase, dbOrderId)
    if (grant.ok === false) {
      logger.error('다날 Noti: 구매 적립금 지급 실패', 'payment/danal/noti', {
        dbOrderId,
        reason: grant.reason,
      })
    }

    await sendOrderConfirmEmail(request, dbOrderId)
    return jsonResponse('SUCCESS')
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('다날 Noti 처리 오류', 'payment/danal/noti', { error: message })
    return jsonResponse('FAIL')
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: 'danal' })
}
