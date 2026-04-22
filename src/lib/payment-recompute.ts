import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 주문 금액 서버 재계산.
 *   - orders.total_amount 과 order_items.price 는 클라가 넣은 값이라 신뢰 못 함
 *     (orders INSERT RLS 는 user_id=auth.uid() 만 검증).
 *   - products.price (관리자만 쓰기 가능) + 번들/쿠폰 규칙을 서버에서 재실행해서
 *     권위 있는 기대 금액을 만든 뒤, 결제/입금 처리 전 대조.
 *   - 토스 confirm 경로, 무통장 입금 경로 등 "orders 기반 결제" 전부 이 함수를 통과해야 한다.
 */
export async function recomputeExpectedAmount(
  supabase: SupabaseClient,
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
  const normalized: NormalizedItem[] = (items as unknown as Array<{
    product_id: number
    discount_source_product_id: number | null
    products: ProductRow | ProductRow[] | null
  }>).map((row) => {
    const p: ProductRow | null = Array.isArray(row.products)
      ? row.products[0] ?? null
      : row.products
    return {
      productId: row.product_id,
      price: Number(p?.price ?? 0),
      isFree: Boolean(p?.is_free),
      discountSourceProductId: row.discount_source_product_id ?? null,
    }
  })

  // 2) 사용자가 실제로 결제 완료한 상품 목록 (번들 할인 자격 확인용)
  const { data: paidOrders } = await supabase
    .from('orders')
    .select('order_items!inner(product_id)')
    .eq('user_id', userId)
    .in('status', ['paid', 'completed'])

  const purchasedIds = new Set<number>()
  for (const o of (paidOrders ?? []) as Array<{ order_items?: Array<{ product_id: number }> }>) {
    const list = o.order_items ?? []
    for (const it of list) purchasedIds.add(it.product_id)
  }

  // 3) 번들 할인 매치 조회
  const targetIds = Array.from(new Set(normalized.map((n) => n.productId)))
  const sourceIds = Array.from(purchasedIds)
  type MatchRow = {
    source_product_id: number
    target_product_id: number
    discount_type: string
    discount_amount: number
  }
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

  const autoSourceIds = Array.from(
    new Set(matches.filter((m) => m.discount_type === 'auto').map((m) => m.source_product_id)),
  )
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
        ? sourcePriceMap.get(m.source_product_id) ?? 0
        : Number(m.discount_amount ?? 0)
      if (d > bestDiscount) bestDiscount = d
    }
    const effective = Math.max(0, it.price - bestDiscount)
    rawTotal += effective
  }

  // 5) 쿠폰 재검증
  let couponDiscount = 0
  if (couponId) {
    const { data: ownedRows } = await supabase
      .from('user_coupons')
      .select('id, used_at')
      .eq('user_id', userId)
      .eq('coupon_id', couponId)
      .limit(50)

    if (ownedRows && ownedRows.length > 0) {
      const hasUnused = (ownedRows as Array<{ used_at: string | null }>).some(
        (r) => r.used_at === null,
      )
      if (!hasUnused) {
        // 보유 이력은 있지만 전부 소진 → 재사용 시도로 간주하고 쿠폰 미적용.
        return rawTotal
      }
    }

    const { data: coupon } = await supabase
      .from('coupons')
      .select(
        'discount_type, discount_value, min_order_amount, valid_from, valid_until, usage_count, max_usage, is_active',
      )
      .eq('id', couponId)
      .maybeSingle()
    if (coupon && coupon.is_active) {
      const now = new Date()
      const validFrom = coupon.valid_from ? new Date(coupon.valid_from as string) : null
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until as string) : null
      const usageOk =
        coupon.max_usage === null ||
        Number(coupon.usage_count ?? 0) < Number(coupon.max_usage)
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
