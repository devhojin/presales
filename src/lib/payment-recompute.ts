import type { SupabaseClient } from '@supabase/supabase-js'
import {
  clampRewardUseAmount,
  loadRewardBalance,
  loadRewardSettings,
} from '@/lib/reward-points'

export interface OrderPricingBreakdown {
  listTotal: number
  productAndMatchTotal: number
  couponDiscount: number
  rewardDiscount: number
  total: number
}

/**
 * 주문 금액 서버 재계산.
 *   - orders.total_amount 과 order_items.price 는 클라가 넣은 값이라 신뢰 못 함
 *     (orders INSERT RLS 는 user_id=auth.uid() 만 검증).
 *   - products.price (관리자만 쓰기 가능) + 번들/쿠폰 규칙을 서버에서 재실행해서
 *     권위 있는 기대 금액을 만든 뒤, 결제/입금 처리 전 대조.
 *   - 토스 confirm 경로, 무통장 입금 경로 등 "orders 기반 결제" 전부 이 함수를 통과해야 한다.
 *
 * 업그레이드(사본→원본) 차감 정책:
 *   - auto 타입은 "사용자가 source 상품에 실제 낸 금액" 을 차감한다.
 *     (과거 order_items.price 에서 해당 주문의 쿠폰 할인을 가격 비율로 안분한 값)
 *   - source 의 현재 카탈로그 가격이나 product_discount_matches.discount_amount 는
 *     가격 인상/인하 시 사용자·회사 중 한쪽이 손해를 보게 만들어 폐기.
 *   - 여러 번 구매 이력이 있으면 가장 크게 지불한 건을 채택 (사용자에게 유리).
 */
export async function recomputeExpectedAmount(
  supabase: SupabaseClient,
  orderId: number,
  userId: string,
  couponId: string | null,
  rewardUseAmount = 0,
): Promise<number | null> {
  const breakdown = await recomputeOrderPricing(
    supabase,
    orderId,
    userId,
    couponId,
    rewardUseAmount,
  )
  return breakdown?.total ?? null
}

export async function recomputeOrderPricing(
  supabase: SupabaseClient,
  orderId: number,
  userId: string,
  couponId: string | null,
  rewardUseAmount = 0,
): Promise<OrderPricingBreakdown | null> {
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

  // 2) 사용자 결제 이력 + source 상품별 "실제 낸 금액" 계산
  //    - order_items.price (번들할인 후·쿠폰 전 단가) 에서 주문 내 쿠폰 할인을
  //      가격 비율로 안분한 뒤 차감 → "실결제액"
  //    - 동일 source 를 여러 번 샀으면 가장 큰 실결제액을 채택 (사용자에게 유리)
  type OrderRow = {
    coupon_discount: number | null
    order_items: Array<{ product_id: number; price: number }> | null
  }
  const { data: paidOrders } = await supabase
    .from('orders')
    .select('id, coupon_discount, order_items(product_id, price)')
    .eq('user_id', userId)
    .in('status', ['paid', 'completed'])

  const sourceEffectivePaid = new Map<number, number>()
  for (const o of (paidOrders ?? []) as OrderRow[]) {
    const orderItems = o.order_items ?? []
    if (orderItems.length === 0) continue
    const sumPrice = orderItems.reduce((acc, it) => acc + Number(it.price ?? 0), 0)
    const coupon = Math.max(0, Number(o.coupon_discount ?? 0))
    for (const it of orderItems) {
      const p = Number(it.price ?? 0)
      if (p <= 0) continue
      const share = sumPrice > 0 ? Math.floor((coupon * p) / sumPrice) : 0
      const effective = Math.max(0, p - share)
      const prev = sourceEffectivePaid.get(it.product_id) ?? 0
      if (effective > prev) sourceEffectivePaid.set(it.product_id, effective)
    }
  }
  const purchasedIds = Array.from(sourceEffectivePaid.keys())

  // 3) 번들 할인 매치 조회
  const targetIds = Array.from(new Set(normalized.map((n) => n.productId)))
  type MatchRow = {
    source_product_id: number
    target_product_id: number
    discount_type: string
    discount_amount: number
  }
  let matches: MatchRow[] = []
  if (purchasedIds.length > 0 && targetIds.length > 0) {
    const { data: matchRows } = await supabase
      .from('product_discount_matches')
      .select('source_product_id, target_product_id, discount_type, discount_amount')
      .in('target_product_id', targetIds)
      .in('source_product_id', purchasedIds)
      .eq('is_active', true)
    matches = (matchRows ?? []) as MatchRow[]
  }

  // 4) 각 아이템별 최대 할인 적용 후 합산
  let rawTotal = 0
  let listTotal = 0
  for (const it of normalized) {
    if (it.isFree) continue
    listTotal += it.price
    const itemMatches = matches.filter((m) => m.target_product_id === it.productId)
    let bestDiscount = 0
    for (const m of itemMatches) {
      const d = m.discount_type === 'auto'
        ? sourceEffectivePaid.get(m.source_product_id) ?? 0
        : Number(m.discount_amount ?? 0)
      if (d > bestDiscount) bestDiscount = d
    }
    const effective = Math.max(0, it.price - bestDiscount)
    rawTotal += effective
  }

  // 5) 쿠폰 재검증
  let couponDiscount = 0
  if (couponId) {
    let canApplyCoupon = true
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
        canApplyCoupon = false
      }
    }

    if (canApplyCoupon) {
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
  }

  const afterCouponTotal = Math.max(0, rawTotal - couponDiscount)
  const [settings, rewardBalance] = await Promise.all([
    loadRewardSettings(supabase),
    loadRewardBalance(supabase, userId),
  ])
  const rewardDiscount = clampRewardUseAmount(
    rewardUseAmount,
    rewardBalance,
    afterCouponTotal,
    settings,
  )

  return {
    listTotal,
    productAndMatchTotal: rawTotal,
    couponDiscount,
    rewardDiscount,
    total: Math.max(0, afterCouponTotal - rewardDiscount),
  }
}
