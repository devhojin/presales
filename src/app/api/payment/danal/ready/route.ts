import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'
import { getDanalCardConfig, limitEucKrText, sendDanalCardTx } from '@/lib/danal-card'
import { recomputeExpectedAmount } from '@/lib/payment-recompute'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PaymentOrder = {
  id: number
  user_id: string
  status: string | null
  total_amount: number
  coupon_id: string | null
  reward_discount: number | null
}

type ChatPaymentRequest = {
  amount: number
  user_id: string
  status: string | null
  title?: string | null
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function parseOrderId(value: unknown) {
  const orderId = Number(value)
  return Number.isInteger(orderId) && orderId > 0 ? orderId : null
}

function compactUserId(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || 'presales-user'
}

function detectDanalUserAgent(userAgent: string | null) {
  return /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent ?? '') ? 'WM' : 'WP'
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
            // Response may already be committed.
          }
        },
      },
    },
  )
}

async function loadOrderName(
  supabase: SupabaseClient,
  orderId: number,
  chatPaymentId: string | null,
) {
  if (chatPaymentId) {
    const { data } = await supabase
      .from('chat_payment_requests')
      .select('title')
      .eq('id', chatPaymentId)
      .maybeSingle()
    const title = (data as { title?: string | null } | null)?.title
    return limitEucKrText(title || '채팅 결제', 255)
  }

  const { data } = await supabase
    .from('order_items')
    .select('products(title)')
    .eq('order_id', orderId)

  const rows = (data ?? []) as Array<{
    products: { title?: string | null } | Array<{ title?: string | null }> | null
  }>
  const titles = rows
    .map((row) => Array.isArray(row.products) ? row.products[0]?.title : row.products?.title)
    .filter((title): title is string => Boolean(title))

  if (titles.length === 0) return 'presales'
  if (titles.length === 1) return limitEucKrText(titles[0], 255)
  return limitEucKrText(`${titles[0]} 외 ${titles.length - 1}건`, 255)
}

async function resolveExpectedAmount(
  supabase: SupabaseClient,
  order: PaymentOrder,
  chatPaymentId: string | null,
) {
  if (chatPaymentId) {
    const { data } = await supabase
      .from('chat_payment_requests')
      .select('amount, user_id, status, title')
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

async function removeDuplicatePendingOrderItems(supabase: SupabaseClient, orderId: number) {
  const { data: items, error } = await supabase
    .from('order_items')
    .select('id, product_id, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (error || !items) {
    return { ok: false, error: error?.message ?? 'ORDER_ITEMS_LOAD_FAILED' }
  }

  const seen = new Set<number>()
  const duplicateIds: number[] = []
  for (const item of items as Array<{ id: number; product_id: number }>) {
    if (seen.has(item.product_id)) duplicateIds.push(item.id)
    else seen.add(item.product_id)
  }

  if (duplicateIds.length === 0) return { ok: true, error: null }

  const { error: deleteError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId)
    .in('id', duplicateIds)

  if (deleteError) return { ok: false, error: deleteError.message }
  return { ok: true, error: null }
}

export async function POST(request: NextRequest) {
  try {
    const config = getDanalCardConfig()
    if (!config.enabled) {
      return NextResponse.json({ error: 'DANAL_CARD_NOT_CONFIGURED' }, { status: 503 })
    }

    const body = await request.json().catch(() => ({})) as {
      orderId?: unknown
      chatPaymentId?: string | null
    }
    const orderId = parseOrderId(body.orderId)
    if (!orderId) return NextResponse.json({ error: 'ORDER_ID_INVALID' }, { status: 400 })

    const authClient = await createAuthClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })

    const supabase = createClient(
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    )
    const { data: orderData } = await supabase
      .from('orders')
      .select('id, user_id, status, total_amount, coupon_id, reward_discount')
      .eq('id', orderId)
      .single()
    const order = orderData as PaymentOrder | null
    if (!order) return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 })
    if (order.user_id !== user.id) return NextResponse.json({ error: 'ORDER_OWNER_MISMATCH' }, { status: 403 })
    if (order.status !== 'pending') return NextResponse.json({ error: 'ORDER_STATUS_INVALID' }, { status: 409 })

    const dedupe = await removeDuplicatePendingOrderItems(supabase, order.id)
    if (!dedupe.ok) {
      logger.error('다날 카드 Ready 주문 상품 중복 정리 실패', 'payment/danal/ready', {
        orderId: order.id,
        error: dedupe.error,
      })
      return NextResponse.json({ error: 'ORDER_ITEMS_NORMALIZE_FAILED' }, { status: 500 })
    }

    const chatPaymentId = body.chatPaymentId || null
    const { amount, error } = await resolveExpectedAmount(supabase, order, chatPaymentId)
    if (error || amount === null) return NextResponse.json({ error }, { status: 400 })
    if (amount < 100) return NextResponse.json({ error: 'AMOUNT_BELOW_DANAL_MINIMUM' }, { status: 400 })
    if (Number(order.total_amount) !== amount) return NextResponse.json({ error: 'AMOUNT_MISMATCH' }, { status: 400 })

    const orderRef = `presales_${order.id}_${Date.now()}`
    const orderName = await loadOrderName(supabase, order.id, chatPaymentId)
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email, phone')
      .eq('id', user.id)
      .maybeSingle()
    const customer = profile as { name?: string | null; email?: string | null; phone?: string | null } | null

    const returnUrl = new URL('/api/payment/danal/return', request.nextUrl.origin)
    returnUrl.searchParams.set('orderId', String(order.id))
    if (chatPaymentId) returnUrl.searchParams.set('chat_payment_id', chatPaymentId)

    const cancelUrl = new URL('/checkout/fail', request.nextUrl.origin)
    cancelUrl.searchParams.set('provider', 'danal')
    cancelUrl.searchParams.set('orderId', String(order.id))
    cancelUrl.searchParams.set('code', 'USER_CANCEL')
    cancelUrl.searchParams.set('message', '결제가 취소되었습니다.')

    const readyResponse = await sendDanalCardTx(config, {
      CPID: config.cpid,
      SUBCPID: '',
      ORDERID: orderRef,
      ITEMNAME: orderName,
      AMOUNT: amount,
      CURRENCY: '410',
      OFFERPERIOD: '',
      USERNAME: limitEucKrText(customer?.name || user.email || 'presales', 20),
      USERID: compactUserId(user.id),
      USEREMAIL: customer?.email || user.email || '',
      USERPHONE: customer?.phone || '',
      USERAGENT: detectDanalUserAgent(request.headers.get('user-agent')),
      TXTYPE: 'AUTH',
      SERVICETYPE: 'DANALCARD',
      CANCELURL: cancelUrl.toString(),
      RETURNURL: returnUrl.toString(),
      ISNOTI: 'N',
      NOTIURL: '',
    })

    if (readyResponse.RETURNCODE !== '0000' || !readyResponse.STARTURL || !readyResponse.STARTPARAMS) {
      const errorCode = readyResponse.RETURNCODE || 'DANAL_READY_FAILED'
      const isCryptoMismatch = errorCode === '1114'
      logger.error('다날 카드 Ready 실패', 'payment/danal/ready', {
        code: errorCode,
        message: readyResponse.RETURNMSG,
        orderId: order.id,
      })
      return NextResponse.json({
        error: isCryptoMismatch
          ? '다날 카드 CPID와 암호화키가 일치하지 않습니다.'
          : readyResponse.RETURNMSG || '다날 결제창 생성에 실패했습니다.',
        code: errorCode,
      }, { status: 502 })
    }

    if (readyResponse.TID) {
      await supabase
        .from('orders')
        .update({ payment_method: 'card', payment_key: readyResponse.TID })
        .eq('id', order.id)
        .eq('status', 'pending')
    }

    return NextResponse.json({
      startUrl: readyResponse.STARTURL,
      startParams: readyResponse.STARTPARAMS,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('다날 카드 Ready 처리 오류', 'payment/danal/ready', { error: message })
    return NextResponse.json({ error: 'DANAL_READY_ERROR' }, { status: 500 })
  }
}
