import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'
import { recomputeExpectedAmount } from '@/lib/payment-recompute'
import {
  confirmRewardPoints,
  grantPurchaseRewardForOrder,
  reserveRewardPoints,
  rollbackRewardPoints,
} from '@/lib/reward-points'

const DANAL_CONFIRM_URL = 'https://one-api.danalpay.com/payments/confirm'

type PaymentOrder = {
  id: number
  user_id: string
  status: string | null
  total_amount: number
  coupon_id: string | null
  coupon_discount: number | null
  reward_discount: number | null
}

type ChatPaymentRequest = {
  amount: number
  user_id: string
  status: string | null
}

type DanalConfirmResponse = {
  code?: string
  message?: string
  transactionId?: string
  orderId?: string
  virtualAccountNumber?: string
  accountNumber?: string
  bankCode?: string
  bankName?: string
  expireDateTime?: string
  cashReceiptUrl?: string
  receiptUrl?: string
  [key: string]: unknown
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function toPayloadValue(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

async function readDanalPayload(request: NextRequest) {
  const payload: Record<string, string> = {}
  request.nextUrl.searchParams.forEach((value, key) => {
    payload[key] = value
  })

  if (request.method !== 'POST') return payload

  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = await request.json() as Record<string, unknown>
    for (const [key, value] of Object.entries(body)) {
      const text = toPayloadValue(value)
      if (text) payload[key] = text
    }
    return payload
  }

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') payload[key] = value.trim()
    }
  }

  return payload
}

function parseDbOrderId(orderId: string) {
  const match = /^presales_(\d+)_\d+$/.exec(orderId)
  return match ? Number(match[1]) : NaN
}

function parseAmount(value: string | undefined) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : NaN
}

function redirectFail(request: NextRequest, message: string, code?: string) {
  const url = new URL('/checkout/fail', request.nextUrl.origin)
  url.searchParams.set('provider', 'danal')
  url.searchParams.set('message', message)
  if (code) url.searchParams.set('code', code)
  return NextResponse.redirect(url)
}

function redirectSuccess(request: NextRequest, dbOrderId: number, status: string) {
  const url = new URL('/checkout/success', request.nextUrl.origin)
  url.searchParams.set('provider', 'danal')
  url.searchParams.set('orderId', String(dbOrderId))
  url.searchParams.set('status', status)
  return NextResponse.redirect(url)
}

function danalAuthHeader(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
}

function normalizeDanalPaymentMethod(method: string) {
  const upper = method.toUpperCase()
  if (upper === 'CARD') return 'card'
  if (upper === 'VACCOUNT' || upper === 'VIRTUAL_ACCOUNT') return 'virtual_account'
  if (upper === 'TRANSFER') return 'transfer'
  if (upper === 'MOBILE') return 'phone'
  if (upper === 'NAVER' || upper === 'NAVERPAY' || upper === 'KAKAO' || upper === 'KAKAOPAY' || upper === 'PAYCO') {
    return 'easy_pay'
  }
  return `danal_${upper.toLowerCase()}`
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

function firstText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

async function sendOrderConfirmEmail(request: NextRequest, dbOrderId: number) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const internalSecret = process.env.CRON_SECRET
    if (internalSecret) {
      headers['X-Internal-Secret'] = internalSecret
    } else {
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) headers.Cookie = cookieHeader
    }

    await fetch(`${request.nextUrl.origin}/api/email/order-confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ orderId: dbOrderId }),
    })
  } catch (emailErr) {
    const message = emailErr instanceof Error ? emailErr.message : '알 수 없는 오류'
    logger.error('다날 결제 확인 이메일 발송 실패(무시)', 'payment/danal/return', { error: message })
  }
}

async function markChatPaymentPaid(
  supabase: SupabaseClient,
  chatPaymentId: string,
  userId: string,
  dbOrderId: number,
) {
  try {
    const now = new Date().toISOString()
    const { data: pr } = await supabase
      .from('chat_payment_requests')
      .update({ status: 'paid', paid_at: now, order_id: dbOrderId })
      .eq('id', chatPaymentId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .select('room_id, title, message_id')
      .single()

    if (!pr) return
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
              ...((msgRow.metadata as Record<string, unknown>) ?? {}),
              status: 'paid',
            },
          })
          .eq('id', pr.message_id)
      }
    }
    await supabase.from('chat_messages').insert({
      room_id: pr.room_id,
      sender_id: 'system',
      sender_type: 'system',
      message_type: 'system',
      content: `결제 완료: ${pr.title}`,
    })
  } catch (chatErr) {
    const message = chatErr instanceof Error ? chatErr.message : '알 수 없는 오류'
    logger.error('다날 채팅 결제요청 상태 업데이트 실패', 'payment/danal/return', { error: message })
  }
}

async function handleDanalReturn(request: NextRequest) {
  const payload = await readDanalPayload(request)
  const code = payload.code
  const message = payload.message || '다날 결제 인증에 실패했습니다.'
  const transactionId = payload.transactionId
  const orderId = payload.orderId
  const method = payload.method
  const amount = parseAmount(payload.amount)
  const chatPaymentId = payload.chat_payment_id

  if (code !== 'SUCCESS') {
    return redirectFail(request, message, code)
  }
  if (!transactionId || !orderId || !method || !Number.isFinite(amount)) {
    return redirectFail(request, '다날 결제 인증 정보가 올바르지 않습니다.', 'DANAL_PAYLOAD_INVALID')
  }

  const dbOrderId = parseDbOrderId(orderId)
  if (!Number.isInteger(dbOrderId) || dbOrderId <= 0) {
    return redirectFail(request, '주문번호 형식이 올바르지 않습니다.', 'ORDER_ID_INVALID')
  }

  const supabase = createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  )

  const { data: orderData } = await supabase
    .from('orders')
    .select('id, user_id, status, total_amount, coupon_id, coupon_discount, reward_discount')
    .eq('id', dbOrderId)
    .single()
  const order = orderData as PaymentOrder | null

  if (!order) return redirectFail(request, '주문을 찾을 수 없습니다.', 'ORDER_NOT_FOUND')

  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Route handler response may already be committed.
          }
        },
      },
    },
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (user && user.id !== order.user_id) {
    return redirectFail(request, '주문 소유자가 일치하지 않습니다.', 'ORDER_OWNER_MISMATCH')
  }

  if (order.status === 'paid' || order.status === 'completed') {
    return redirectSuccess(request, dbOrderId, order.status)
  }
  if (order.status === 'pending_transfer' && normalizeDanalPaymentMethod(method) === 'virtual_account') {
    return redirectSuccess(request, dbOrderId, order.status)
  }
  if (order.status !== 'pending') {
    return redirectFail(request, '주문 상태가 결제 가능한 상태가 아닙니다.', 'ORDER_STATUS_INVALID')
  }

  let expectedAmount: number | null
  if (chatPaymentId) {
    const { data: prData } = await supabase
      .from('chat_payment_requests')
      .select('amount, user_id, status')
      .eq('id', chatPaymentId)
      .maybeSingle()
    const pr = prData as ChatPaymentRequest | null
    if (!pr) return redirectFail(request, '결제 요청을 찾을 수 없습니다.', 'CHAT_PAYMENT_NOT_FOUND')
    if (pr.user_id !== order.user_id) return redirectFail(request, '결제 요청 소유자가 일치하지 않습니다.', 'CHAT_PAYMENT_OWNER_MISMATCH')
    if (pr.status !== 'pending') return redirectFail(request, '이미 처리된 결제 요청입니다.', 'CHAT_PAYMENT_STATUS_INVALID')
    if (Number(order.total_amount) !== Number(pr.amount)) {
      logger.error('다날 chat_payment 주문 total_amount 불일치', 'payment/danal/return', {
        orderId: dbOrderId,
        orderTotal: order.total_amount,
        prAmount: pr.amount,
      })
      return redirectFail(request, '결제 요청과 주문이 일치하지 않습니다.', 'CHAT_PAYMENT_BINDING_INVALID')
    }
    const { count: itemCount } = await supabase
      .from('order_items')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', dbOrderId)
    if ((itemCount ?? 0) > 0) return redirectFail(request, '결제 요청과 주문이 일치하지 않습니다.', 'CHAT_PAYMENT_ITEMS_INVALID')
    expectedAmount = Number(pr.amount)
  } else {
    expectedAmount = await recomputeExpectedAmount(
      supabase,
      dbOrderId,
      order.user_id,
      order.coupon_id,
      Number(order.reward_discount ?? 0),
    )
  }

  if (expectedAmount === null) {
    return redirectFail(request, '주문 금액 재검증에 실패했습니다.', 'ORDER_RECOMPUTE_FAILED')
  }
  if (expectedAmount !== amount || Number(order.total_amount) !== amount) {
    logger.error('다날 결제 금액 불일치', 'payment/danal/return', {
      orderId: dbOrderId,
      danalAmount: amount,
      expectedAmount,
      storedTotal: order.total_amount,
    })
    return redirectFail(request, '결제 금액이 주문 금액과 일치하지 않습니다.', 'AMOUNT_MISMATCH')
  }

  let couponReserved = false
  let rewardReserved = false
  if (order.coupon_id) {
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('increment_coupon_usage', {
      p_coupon_id: order.coupon_id,
      p_user_id: order.user_id,
      p_order_id: dbOrderId,
      p_applied_amount: order.coupon_discount || 0,
    })
    if (rpcErr) {
      logger.error('다날 쿠폰 예약 RPC 실패', 'payment/danal/return', {
        couponId: order.coupon_id,
        orderId: dbOrderId,
        error: rpcErr.message,
      })
      return redirectFail(request, '쿠폰 사용 예약에 실패했습니다.', 'COUPON_RESERVE_FAILED')
    }
    if (rpcResult && (rpcResult as { ok?: boolean }).ok === false) {
      return redirectFail(request, '쿠폰을 사용할 수 없습니다.', 'COUPON_REJECTED')
    }
    couponReserved = true
  }

  const rewardDiscount = Math.max(0, Number(order.reward_discount ?? 0))
  if (!chatPaymentId && rewardDiscount > 0) {
    const reserve = await reserveRewardPoints(supabase, order.user_id, dbOrderId, rewardDiscount)
    if (!reserve.ok) {
      if (couponReserved && order.coupon_id) {
        await supabase.rpc('rollback_coupon_usage', {
          p_coupon_id: order.coupon_id,
          p_user_id: order.user_id,
          p_order_id: dbOrderId,
        })
      }
      return redirectFail(request, '적립금을 사용할 수 없습니다.', 'REWARD_RESERVE_FAILED')
    }
    rewardReserved = true
  }

  const confirmRes = await fetch(DANAL_CONFIRM_URL, {
    method: 'POST',
    headers: {
      Authorization: danalAuthHeader(getRequiredEnv('DANAL_SECRET_KEY')),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      method,
      transactionId,
      merchantId: getRequiredEnv('DANAL_MERCHANT_ID'),
      amount: String(amount),
      orderId,
    }),
  })
  const confirmData = await confirmRes.json() as DanalConfirmResponse

  if (!confirmRes.ok || confirmData.code !== 'SUCCESS') {
    if (couponReserved && order.coupon_id) {
      await supabase.rpc('rollback_coupon_usage', {
        p_coupon_id: order.coupon_id,
        p_user_id: order.user_id,
        p_order_id: dbOrderId,
      })
    }
    if (rewardReserved) await rollbackRewardPoints(supabase, dbOrderId)
    logger.error('다날 결제 승인 실패', 'payment/danal/return', {
      status: confirmRes.status,
      code: confirmData.code,
      message: confirmData.message,
    })
    return redirectFail(request, confirmData.message || '다날 결제 승인에 실패했습니다.', confirmData.code || 'DANAL_CONFIRM_FAILED')
  }

  const normalizedMethod = normalizeDanalPaymentMethod(method)
  const isVirtualAccount = normalizedMethod === 'virtual_account'
  const nextStatus = isVirtualAccount ? 'pending_transfer' : 'paid'
  const patch: Record<string, unknown> = {
    status: nextStatus,
    payment_method: normalizedMethod,
    payment_key: confirmData.transactionId || transactionId,
    paid_at: isVirtualAccount ? null : new Date().toISOString(),
    virtual_account: firstText(confirmData.virtualAccountNumber, confirmData.accountNumber, payload.virtualAccountNumber),
    virtual_account_bank: firstText(confirmData.bankCode, confirmData.bankName, payload.bankCode, payload.bankName),
    virtual_account_due: parseDanalDateTime(firstText(confirmData.expireDateTime, payload.expireDateTime) ?? undefined),
    cash_receipt_url: firstText(confirmData.cashReceiptUrl, confirmData.receiptUrl),
  }

  const { data: updatedOrders, error: updateError } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', dbOrderId)
    .eq('status', 'pending')
    .select('id')

  if (updateError || !updatedOrders || updatedOrders.length === 0) {
    if (couponReserved && order.coupon_id) {
      await supabase.rpc('rollback_coupon_usage', {
        p_coupon_id: order.coupon_id,
        p_user_id: order.user_id,
        p_order_id: dbOrderId,
      })
    }
    if (rewardReserved) await rollbackRewardPoints(supabase, dbOrderId)
    logger.error('다날 주문 상태 업데이트 실패', 'payment/danal/return', {
      orderId: dbOrderId,
      error: updateError?.message,
      updatedCount: updatedOrders?.length ?? 0,
    })
    return redirectFail(request, '주문 상태 업데이트에 실패했습니다.', 'ORDER_UPDATE_FAILED')
  }

  if (!chatPaymentId && rewardReserved && nextStatus === 'paid') {
    const rewardConfirm = await confirmRewardPoints(supabase, dbOrderId)
    if (!rewardConfirm.ok) {
      logger.error('다날 적립금 사용 확정 실패', 'payment/danal/return', {
        orderId: dbOrderId,
        reason: rewardConfirm.reason,
      })
    }
  }
  if (!chatPaymentId && nextStatus === 'paid') {
    const grant = await grantPurchaseRewardForOrder(supabase, dbOrderId)
    if (grant.ok === false) {
      logger.error('다날 구매 적립금 지급 실패', 'payment/danal/return', {
        orderId: dbOrderId,
        reason: grant.reason,
      })
    }
  }
  if (chatPaymentId && nextStatus === 'paid') {
    await markChatPaymentPaid(supabase, chatPaymentId, order.user_id, dbOrderId)
  }
  if (!chatPaymentId && nextStatus === 'paid') {
    await sendOrderConfirmEmail(request, dbOrderId)
  }

  return redirectSuccess(request, dbOrderId, nextStatus)
}

export async function GET(request: NextRequest) {
  try {
    return await handleDanalReturn(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('다날 결제 return 처리 오류', 'payment/danal/return', { error: message })
    return redirectFail(request, '다날 결제 처리 중 오류가 발생했습니다.', 'DANAL_RETURN_ERROR')
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleDanalReturn(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('다날 결제 return 처리 오류', 'payment/danal/return', { error: message })
    return redirectFail(request, '다날 결제 처리 중 오류가 발생했습니다.', 'DANAL_RETURN_ERROR')
  }
}
