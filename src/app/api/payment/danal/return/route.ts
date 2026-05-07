import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'
import { decryptDanalResponse, getDanalCardConfig, sendDanalCardTx } from '@/lib/danal-card'
import { recomputeExpectedAmount } from '@/lib/payment-recompute'
import {
  confirmRewardPoints,
  grantPurchaseRewardForOrder,
  reserveRewardPoints,
  rollbackRewardPoints,
} from '@/lib/reward-points'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PaymentOrder = {
  id: number
  user_id: string
  status: string | null
  total_amount: number
  payment_method: string | null
  payment_key: string | null
  coupon_id: string | null
  coupon_discount: number | null
  reward_discount: number | null
}

type ChatPaymentRequest = {
  amount: number
  user_id: string
  status: string | null
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function parseDbOrderId(orderId: string | null) {
  if (!orderId) return NaN
  const match = /^presales_(\d+)_\d+$/.exec(orderId)
  if (match) return Number(match[1])
  const numeric = Number(orderId)
  return Number.isInteger(numeric) ? numeric : NaN
}

function parseAmount(value: string | number | null | undefined) {
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

async function readReturnParams(request: NextRequest) {
  const payload: Record<string, string> = {}
  request.nextUrl.searchParams.forEach((value, key) => {
    payload[key] = value
  })

  if (request.method !== 'POST') return payload

  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = await request.json() as Record<string, unknown>
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') payload[key] = value.trim()
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

async function createAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
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
    logger.error('다날 카드 결제 확인 이메일 발송 실패(무시)', 'payment/danal/return', { error: message })
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
    logger.error('다날 카드 채팅 결제요청 상태 업데이트 실패', 'payment/danal/return', { error: message })
  }
}

async function resolveExpectedAmount(
  supabase: SupabaseClient,
  order: PaymentOrder,
  chatPaymentId: string | null,
) {
  if (chatPaymentId) {
    const { data } = await supabase
      .from('chat_payment_requests')
      .select('amount, user_id, status')
      .eq('id', chatPaymentId)
      .maybeSingle()
    const pr = data as ChatPaymentRequest | null
    if (!pr) return { amount: null, error: 'CHAT_PAYMENT_NOT_FOUND' }
    if (pr.user_id !== order.user_id) return { amount: null, error: 'CHAT_PAYMENT_OWNER_MISMATCH' }
    if (pr.status !== 'pending') return { amount: null, error: 'CHAT_PAYMENT_STATUS_INVALID' }
    if (Number(order.total_amount) !== Number(pr.amount)) return { amount: null, error: 'CHAT_PAYMENT_AMOUNT_MISMATCH' }

    const { count } = await supabase
      .from('order_items')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', order.id)
    if ((count ?? 0) > 0) return { amount: null, error: 'CHAT_PAYMENT_ITEMS_INVALID' }
    return { amount: Number(pr.amount), error: null }
  }

  const amount = await recomputeExpectedAmount(
    supabase,
    order.id,
    order.user_id,
    order.coupon_id,
    Number(order.reward_discount ?? 0),
  )
  return { amount, error: amount === null ? 'ORDER_RECOMPUTE_FAILED' : null }
}

async function handleDanalCardReturn(request: NextRequest) {
  const config = getDanalCardConfig()
  if (!config.enabled) return redirectFail(request, '다날 카드 결제가 설정되지 않았습니다.', 'DANAL_CARD_NOT_CONFIGURED')

  const payload = await readReturnParams(request)
  const encryptedReturnParams = payload.RETURNPARAMS
  if (!encryptedReturnParams) return redirectFail(request, '다날 결제 인증 정보가 없습니다.', 'RETURNPARAMS_MISSING')

  const authResult = decryptDanalResponse(config, encryptedReturnParams)
  if (authResult.RETURNCODE !== '0000') {
    return redirectFail(request, authResult.RETURNMSG || '다날 카드 인증에 실패했습니다.', authResult.RETURNCODE)
  }

  const transactionId = authResult.TID
  const dbOrderId = parseDbOrderId(authResult.ORDERID || payload.orderId || null)
  if (!transactionId || !Number.isInteger(dbOrderId) || dbOrderId <= 0) {
    return redirectFail(request, '다날 결제 인증 정보가 올바르지 않습니다.', 'DANAL_RETURN_INVALID')
  }

  const supabase = createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  )
  const { data: orderData } = await supabase
    .from('orders')
    .select('id, user_id, status, total_amount, payment_method, payment_key, coupon_id, coupon_discount, reward_discount')
    .eq('id', dbOrderId)
    .single()
  const order = orderData as PaymentOrder | null
  if (!order) return redirectFail(request, '주문을 찾을 수 없습니다.', 'ORDER_NOT_FOUND')

  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (user && user.id !== order.user_id) {
    return redirectFail(request, '주문 소유자가 일치하지 않습니다.', 'ORDER_OWNER_MISMATCH')
  }

  if (order.status === 'paid' || order.status === 'completed') {
    if (order.payment_key !== transactionId) {
      return redirectFail(request, '이미 처리된 주문의 결제 정보가 일치하지 않습니다.', 'ORDER_ALREADY_PAID_MISMATCH')
    }
    return redirectSuccess(request, dbOrderId, order.status)
  }
  if (order.status !== 'pending') {
    return redirectFail(request, '주문 상태가 결제 가능한 상태가 아닙니다.', 'ORDER_STATUS_INVALID')
  }
  if (order.payment_key && order.payment_key !== transactionId) {
    return redirectFail(request, '주문에 연결된 결제 인증 정보가 일치하지 않습니다.', 'TID_MISMATCH')
  }

  const chatPaymentId = payload.chat_payment_id || null
  const { amount: expectedAmount, error } = await resolveExpectedAmount(supabase, order, chatPaymentId)
  if (error || expectedAmount === null) {
    return redirectFail(request, '주문 금액 재검증에 실패했습니다.', error ?? 'ORDER_RECOMPUTE_FAILED')
  }
  if (expectedAmount !== Number(order.total_amount)) {
    logger.error('다날 카드 결제 금액 불일치', 'payment/danal/return', {
      orderId: dbOrderId,
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
      logger.error('다날 카드 쿠폰 예약 RPC 실패', 'payment/danal/return', {
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

  const billResponse = await sendDanalCardTx(config, {
    CPID: config.cpid,
    AMOUNT: expectedAmount,
    TID: transactionId,
    TXTYPE: 'BILL',
    SERVICETYPE: 'DANALCARD',
  })

  if (billResponse.RETURNCODE !== '0000') {
    if (couponReserved && order.coupon_id) {
      await supabase.rpc('rollback_coupon_usage', {
        p_coupon_id: order.coupon_id,
        p_user_id: order.user_id,
        p_order_id: dbOrderId,
      })
    }
    if (rewardReserved) await rollbackRewardPoints(supabase, dbOrderId)
    logger.error('다날 카드 BILL 승인 실패', 'payment/danal/return', {
      orderId: dbOrderId,
      code: billResponse.RETURNCODE,
      message: billResponse.RETURNMSG,
    })
    return redirectFail(request, billResponse.RETURNMSG || '다날 카드 결제 승인에 실패했습니다.', billResponse.RETURNCODE)
  }

  const paidAmount = parseAmount(billResponse.AMOUNT)
  if (Number.isFinite(paidAmount) && paidAmount !== expectedAmount) {
    if (couponReserved && order.coupon_id) {
      await supabase.rpc('rollback_coupon_usage', {
        p_coupon_id: order.coupon_id,
        p_user_id: order.user_id,
        p_order_id: dbOrderId,
      })
    }
    if (rewardReserved) await rollbackRewardPoints(supabase, dbOrderId)
    logger.error('다날 카드 BILL 승인 금액 불일치', 'payment/danal/return', {
      orderId: dbOrderId,
      expectedAmount,
      paidAmount,
      tid: transactionId,
    })
    return redirectFail(request, '다날 승인 금액이 주문 금액과 일치하지 않습니다.', 'BILL_AMOUNT_MISMATCH')
  }

  const paidAt = new Date().toISOString()
  const { data: updatedOrders, error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      payment_method: 'card',
      payment_key: billResponse.TID || transactionId,
      paid_at: paidAt,
    } as Record<string, unknown>)
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
    logger.error('다날 카드 주문 상태 업데이트 실패', 'payment/danal/return', {
      orderId: dbOrderId,
      error: updateError?.message,
      updatedCount: updatedOrders?.length ?? 0,
    })
    return redirectFail(request, '주문 상태 업데이트에 실패했습니다.', 'ORDER_UPDATE_FAILED')
  }

  if (!chatPaymentId && rewardReserved) {
    const rewardConfirm = await confirmRewardPoints(supabase, dbOrderId)
    if (!rewardConfirm.ok) {
      logger.error('다날 카드 적립금 사용 확정 실패', 'payment/danal/return', {
        orderId: dbOrderId,
        reason: rewardConfirm.reason,
      })
    }
  }
  if (!chatPaymentId) {
    const grant = await grantPurchaseRewardForOrder(supabase, dbOrderId)
    if (grant.ok === false) {
      logger.error('다날 카드 구매 적립금 지급 실패', 'payment/danal/return', {
        orderId: dbOrderId,
        reason: grant.reason,
      })
    }
    await sendOrderConfirmEmail(request, dbOrderId)
  } else {
    await markChatPaymentPaid(supabase, chatPaymentId, order.user_id, dbOrderId)
  }

  return redirectSuccess(request, dbOrderId, 'paid')
}

export async function GET(request: NextRequest) {
  try {
    return await handleDanalCardReturn(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('다날 카드 return 처리 오류', 'payment/danal/return', { error: message })
    return redirectFail(request, '다날 카드 결제 처리 중 오류가 발생했습니다.', 'DANAL_CARD_RETURN_ERROR')
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleDanalCardReturn(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('다날 카드 return 처리 오류', 'payment/danal/return', { error: message })
    return redirectFail(request, '다날 카드 결제 처리 중 오류가 발생했습니다.', 'DANAL_CARD_RETURN_ERROR')
  }
}
