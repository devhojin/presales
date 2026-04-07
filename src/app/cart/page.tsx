'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cart-store'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, Trash2, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function CartPage() {
  const { items, removeItem, clearCart, getTotal, getDiscountTotal } = useCartStore()
  const [processing, setProcessing] = useState(false)
  const router = useRouter()

  const allFree = items.length > 0 && items.every((item) => item.price === 0)

  const formatPrice = (price: number) => {
    if (price === 0) return '무료'
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Link href="/store" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> 스토어로 돌아가기
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <ShoppingCart className="w-6 h-6" />
        <h1 className="text-2xl font-bold">장바구니</h1>
        <Badge variant="outline" className="text-sm">{items.length}개</Badge>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">장바구니가 비어있습니다</p>
          <p className="text-sm mt-2 mb-6">마음에 드는 템플릿을 담아보세요</p>
          <Link
            href="/store"
            className="inline-flex items-center h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            템플릿 스토어 둘러보기
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Cart Items */}
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-4 p-4 rounded-xl border border-border">
                <Link href={`/store/${item.productId}`}>
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-24 h-18 rounded-lg object-cover bg-muted shrink-0"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/store/${item.productId}`} className="hover:text-primary transition-colors">
                    <h3 className="text-sm font-semibold line-clamp-2 leading-snug">{item.title}</h3>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">{item.format}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-base font-bold text-primary">{formatPrice(item.price)}</span>
                    {item.originalPrice > item.price && (
                      <span className="text-xs text-muted-foreground line-through">{formatPrice(item.originalPrice)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="self-start p-2 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-muted/30 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold">주문 요약</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">상품 금액</span>
                <span>{formatPrice(getTotal() + getDiscountTotal())}</span>
              </div>
              {getDiscountTotal() > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>할인</span>
                  <span>-{formatPrice(getDiscountTotal())}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>결제 금액</span>
                <span className="text-primary">{formatPrice(getTotal())}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={clearCart}
                className="h-11 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                비우기
              </button>
              <button
                onClick={async () => {
                  if (allFree) {
                    setProcessing(true)
                    try {
                      const supabase = createClient()
                      const { data: { user } } = await supabase.auth.getUser()
                      if (!user) {
                        router.push('/auth/login?redirect=/cart')
                        return
                      }
                      const { data: order, error: orderError } = await supabase
                        .from('orders')
                        .insert({
                          user_id: user.id,
                          total_amount: 0,
                          status: 'paid',
                          payment_method: 'free',
                          paid_at: new Date().toISOString(),
                        })
                        .select('id')
                        .single()
                      if (orderError || !order) {
                        alert('주문 생성에 실패했습니다. 다시 시도해주세요.')
                        return
                      }
                      const orderItems = items.map((item) => ({
                        order_id: order.id,
                        product_id: item.productId,
                        price: 0,
                      }))
                      await supabase.from('order_items').insert(orderItems)
                      clearCart()
                      router.push('/mypage')
                      router.refresh()
                    } catch {
                      alert('주문 처리 중 오류가 발생했습니다.')
                    } finally {
                      setProcessing(false)
                    }
                  } else {
                    alert('결제 기능을 준비 중입니다. 빠른 시일 내에 제공하겠습니다.')
                  }
                }}
                disabled={processing}
                className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {processing ? '처리 중...' : allFree ? '무료 다운로드' : `결제하기 (${formatPrice(getTotal())})`}
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              디지털 콘텐츠 특성상 다운로드 후 환불이 제한될 수 있습니다
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
