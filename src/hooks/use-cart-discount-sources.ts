'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export interface CartDiscountSource {
  sourceProductId: number
  sourceTitle: string
  discountAmount: number
  targetPrice: number | null
}

interface MatchRow {
  source_product_id: number
  target_product_id: number
  discount_type: string
  discount_amount: number
}

interface PaidOrderRow {
  coupon_discount: number | null
  order_items: Array<{ product_id: number; price: number }> | null
}

interface ProductTitleRow {
  id: number
  title: string
  price?: number | null
}

export function useCartDiscountSources(productIds: number[]) {
  const [sources, setSources] = useState<Record<number, CartDiscountSource>>({})
  const productKey = productIds.join(',')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const targetIds = Array.from(new Set(
        productKey
          .split(',')
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ))
      if (targetIds.length === 0) {
        setSources({})
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setSources({})
        return
      }

      const { data: matches } = await supabase
        .from('product_discount_matches')
        .select('source_product_id, target_product_id, discount_type, discount_amount')
        .in('target_product_id', targetIds)
        .eq('is_active', true)

      const matchRows = (matches ?? []) as MatchRow[]
      if (matchRows.length === 0) {
        if (!cancelled) setSources({})
        return
      }

      const sourceIds = Array.from(new Set(matchRows.map((m) => m.source_product_id)))
      const productIdsForLookup = Array.from(new Set([...sourceIds, ...targetIds]))
      const [{ data: paidOrders }, { data: sourceProducts }] = await Promise.all([
        supabase
          .from('orders')
          .select('coupon_discount, order_items(product_id, price)')
          .eq('user_id', user.id)
          .in('status', ['paid', 'completed']),
        supabase
          .from('products')
          .select('id, title, price')
          .in('id', productIdsForLookup),
      ])

      const sourceTitles = new Map(
        ((sourceProducts ?? []) as ProductTitleRow[]).map((product) => [product.id, product.title])
      )
      const productPrices = new Map(
        ((sourceProducts ?? []) as ProductTitleRow[]).map((product) => [product.id, Number(product.price ?? 0)])
      )
      const sourceEffectivePaid = new Map<number, number>()

      for (const order of (paidOrders ?? []) as PaidOrderRow[]) {
        const items = order.order_items ?? []
        if (items.length === 0) continue

        const sumPrice = items.reduce((acc, item) => acc + Number(item.price ?? 0), 0)
        const coupon = Math.max(0, Number(order.coupon_discount ?? 0))

        for (const item of items) {
          const price = Number(item.price ?? 0)
          if (price <= 0) continue

          const couponShare = sumPrice > 0 ? Math.floor((coupon * price) / sumPrice) : 0
          const effectivePaid = Math.max(0, price - couponShare)
          const previous = sourceEffectivePaid.get(item.product_id) ?? 0
          if (effectivePaid > previous) sourceEffectivePaid.set(item.product_id, effectivePaid)
        }
      }

      const nextSources: Record<number, CartDiscountSource> = {}
      for (const match of matchRows) {
        if (!sourceEffectivePaid.has(match.source_product_id)) continue

        const discountAmount = match.discount_type === 'auto'
          ? (sourceEffectivePaid.get(match.source_product_id) ?? 0)
          : Number(match.discount_amount ?? 0)
        if (discountAmount <= 0) continue

        const current = nextSources[match.target_product_id]
        if (current && current.discountAmount >= discountAmount) continue

        nextSources[match.target_product_id] = {
          sourceProductId: match.source_product_id,
          sourceTitle: sourceTitles.get(match.source_product_id) ?? `상품 #${match.source_product_id}`,
          discountAmount,
          targetPrice: productPrices.get(match.target_product_id) ?? null,
        }
      }

      if (!cancelled) setSources(nextSources)
    }

    load().catch(() => {
      if (!cancelled) setSources({})
    })

    return () => {
      cancelled = true
    }
  }, [productKey])

  return sources
}
