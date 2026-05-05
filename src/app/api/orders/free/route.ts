import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { logger } from '@/lib/logger'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/client-ip'
import { checkGlobalFreeUserLimit } from '@/lib/free-user-limit'

/**
 * 무료 상품 주문 처리 (service_role 사용).
 *
 * 왜 서버 API 인가:
 *   - cart/page.tsx 가 클라이언트에서 직접 orders(status='paid') + order_items INSERT 해왔음.
 *   - Round 9 이후 order_items INSERT RLS 가 "orders.status='pending'" 을 강제하므로
 *     status='paid' 로 바로 만드는 무료 주문은 클라 RLS 에서 차단돼 전면 깨짐.
 *   - 여기서 service_role 로 RLS 우회하면서도 서버가 products.is_free/price 를 권위 있게 재검증.
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const ip = getClientIp(headersList)
    const rl = await checkRateLimitAsync(`orders-free:${ip}`, 10, 60_000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, {
        status: 429,
        headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
      })
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
                cookieStore.set(name, value, options),
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

    const body = (await request.json()) as { productIds?: unknown }
    const raw = Array.isArray(body.productIds) ? body.productIds : null
    if (!raw || raw.length === 0) {
      return NextResponse.json({ error: 'productIds가 필요합니다' }, { status: 400 })
    }
    const productIds = Array.from(
      new Set(
        raw
          .map((v) => Number(v))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    )
    if (productIds.length === 0) {
      return NextResponse.json({ error: 'productIds가 올바르지 않습니다' }, { status: 400 })
    }
    if (productIds.length > 50) {
      return NextResponse.json({ error: '한 번에 최대 50개까지 처리 가능합니다' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // products.is_free=true AND is_published=true 인 것만 허용.
    //   - 유료 상품 id 를 섞어 보내도 여기서 걸러짐 → 가격 조작 차단
    const { data: products, error: productsErr } = await supabase
      .from('products')
      .select('id, is_free, is_published, price')
      .in('id', productIds)

    if (productsErr) {
      logger.error('무료 주문 상품 조회 실패', 'orders/free', { error: productsErr.message })
      return NextResponse.json({ error: '상품 조회에 실패했습니다' }, { status: 500 })
    }

    const eligible = (products ?? []).filter(
      (p) => p.is_free === true && p.is_published === true && Number(p.price) === 0,
    )
    if (eligible.length === 0) {
      return NextResponse.json(
        { error: '무료로 받을 수 있는 상품이 없습니다' },
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

    // orders insert (status='paid', payment_method='free')
    //   order_number 는 BEFORE INSERT 트리거 set_order_number 가 자동 채움.
    const paidAt = new Date().toISOString()
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_amount: 0,
        status: 'paid',
        payment_method: 'free',
        paid_at: paidAt,
      })
      .select('id')
      .single()

    if (orderErr || !order) {
      logger.error('무료 주문 생성 실패', 'orders/free', { error: orderErr?.message })
      return NextResponse.json({ error: '주문 생성에 실패했습니다' }, { status: 500 })
    }

    // order_items insert
    const orderItems = eligible.map((p) => ({
      order_id: order.id,
      product_id: p.id,
      price: 0,
      original_price: 0,
    }))
    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
    if (itemsErr) {
      logger.error('무료 주문 상품 등록 실패 (rollback 시도)', 'orders/free', {
        orderId: order.id,
        error: itemsErr.message,
      })
      // service_role 이므로 rollback DELETE 가능.
      const { error: rbErr } = await supabase.from('orders').delete().eq('id', order.id)
      if (rbErr) {
        logger.error('무료 주문 rollback 실패 (고아 주문 가능)', 'orders/free', {
          orderId: order.id,
          error: rbErr.message,
        })
      }
      return NextResponse.json({ error: '주문 상품 등록에 실패했습니다' }, { status: 500 })
    }

    try {
      const internalSecret = process.env.CRON_SECRET
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (internalSecret) {
        headers['X-Internal-Secret'] = internalSecret
      } else {
        headers.Cookie = request.headers.get('cookie') || ''
      }
      await fetch(`${request.nextUrl.origin}/api/email/order-confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId: order.id }),
      })
    } catch (emailErr) {
      const message = emailErr instanceof Error ? emailErr.message : '알 수 없는 오류'
      logger.error('무료 주문 확인 이메일 발송 실패(무시)', 'orders/free', { orderId: order.id, error: message })
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      processedCount: eligible.length,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('무료 주문 API 오류', 'orders/free', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
