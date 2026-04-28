import type { CartItem } from '@/stores/cart-store'
import type { CartDiscountSource } from '@/hooks/use-cart-discount-sources'

export interface CartItemDiscountBreakdown {
  effectivePrice: number
  catalogDiscount: number
  purchaseDiscount: number
  purchaseSource: CartDiscountSource | null
}

export function getStoredCartDiscountSource(item: CartItem): CartDiscountSource | null {
  const discountAmount = Number(item.discountAmount ?? 0)
  if (!item.discountSourceTitle || discountAmount <= 0) return null

  return {
    sourceProductId: item.discountSourceProductId ?? 0,
    sourceTitle: item.discountSourceTitle,
    discountAmount,
    targetPrice: null,
  }
}

export function getCartItemDiscountBreakdown(
  item: CartItem,
  source: CartDiscountSource | null | undefined,
): CartItemDiscountBreakdown {
  const purchaseSource = source ?? getStoredCartDiscountSource(item)
  const lineOriginalPrice = Math.max(Number(item.originalPrice ?? 0), Number(item.price ?? 0))

  if (!purchaseSource) {
    return {
      effectivePrice: Number(item.price ?? 0),
      catalogDiscount: Math.max(0, lineOriginalPrice - Number(item.price ?? 0)),
      purchaseDiscount: 0,
      purchaseSource: null,
    }
  }

  const targetPrice = purchaseSource.targetPrice !== null
    ? Number(purchaseSource.targetPrice)
    : Number(item.price ?? 0) + Number(purchaseSource.discountAmount ?? 0)
  const basePrice = Math.max(0, targetPrice)
  const matchedPrice = Math.max(0, basePrice - Math.max(0, purchaseSource.discountAmount))
  const effectivePrice = Math.min(Number(item.price ?? 0), matchedPrice)
  const purchaseDiscount = Math.max(0, basePrice - effectivePrice)

  return {
    effectivePrice,
    catalogDiscount: Math.max(0, lineOriginalPrice - basePrice),
    purchaseDiscount,
    purchaseSource: {
      ...purchaseSource,
      discountAmount: purchaseDiscount,
    },
  }
}

export function getCartDiscountSummary(
  items: CartItem[],
  sources: Record<number, CartDiscountSource>,
) {
  return items.reduce(
    (summary, item) => {
      const breakdown = getCartItemDiscountBreakdown(item, sources[item.productId])
      summary.originalTotal += Math.max(Number(item.originalPrice ?? 0), Number(item.price ?? 0))
      summary.catalogDiscount += breakdown.catalogDiscount
      summary.purchaseDiscount += breakdown.purchaseDiscount
      summary.total += breakdown.effectivePrice
      return summary
    },
    {
      originalTotal: 0,
      catalogDiscount: 0,
      purchaseDiscount: 0,
      total: 0,
    },
  )
}
