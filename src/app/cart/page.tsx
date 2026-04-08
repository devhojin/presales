'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cart-store'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, Trash2, X, ArrowLeft, AlertTriangle, Gift } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useToastStore } from '@/stores/toast-store'
import * as gtag from '@/lib/gtag'

export default function CartPage() {
  const { items, removeItem, clearCart, getTotal, getDiscountTotal } = useCartStore()
  const { addToast } = useToastStore()
  const [processing, setProcessing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const router = useRouter()

  const allFree = items.length > 0 && items.every((item) => item.price === 0)
  const hasPaidItems = items.some((item) => item.price > 0)
  const freeItems = items.filter((item) => item.price === 0)
  const hasFreeItems = freeItems.length > 0

  // ESC key to close modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setShowClearConfirm(false)
  }, [])
  useEffect(() => {
    if (showClearConfirm) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showClearConfirm, handleKeyDown])

  async function handleFreeItemsOnly() {
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
        addToast('주문 생성에 실패했습니다. 다시 시도해주세요.', 'error')
        return
      }
      const orderItems = freeItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        price: 0,
      }))
      await supabase.from('order_items').insert(orderItems)
      // GA4: purchase event
      gtag.trackPurchase(String(order.id), 0)
      // Remove only free items from cart
      freeItems.forEach((item) => removeItem(item.productId))
      addToast('무료 상품이 처리되었습니다! 마이페이지에서 다운로드하세요.', 'success')
      router.push('/mypage')
      router.refresh()
    } catch {
      addToast('주문 처리 중 오류가 발생했습니다.', 'error')
    } finally {
      setProcessing(false)
    }
  }

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
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">장바구니가 비어있습니다</p>
          <p className="text-sm mt-2 mb-6">마음에 드는 템플릿을 담아보세요</p>
          <Link
            href="/store"
            className="inline-flex items-center h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            문서 스토어 둘러보기
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Paid items banner */}
          {hasPaidItems && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                현재 유료 상품 결제 기능을 준비 중입니다. 무료 상품은 바로 다운로드 가능합니다.
              </p>
            </div>
          )}

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

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="h-11 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2 cursor-pointer"
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
                          addToast('주문 생성에 실패했습니다. 다시 시도해주세요.', 'error')
                          return
                        }
                        const orderItems = items.map((item) => ({
                          order_id: order.id,
                          product_id: item.productId,
                          price: 0,
                        }))
                        await supabase.from('order_items').insert(orderItems)
                        // GA4: purchase event
                        gtag.trackPurchase(String(order.id), 0)
                        clearCart()
                        addToast('주문이 완료되었습니다! 마이페이지에서 다운로드하세요.', 'success')
                        router.push('/mypage')
                        router.refresh()
                      } catch {
                        addToast('주문 처리 중 오류가 발생했습니다.', 'error')
                      } finally {
                        setProcessing(false)
                      }
                    } else {
                      addToast('결제 기능을 준비 중입니다. 빠른 시일 내에 제공하겠습니다.', 'info')
                    }
                  }}
                  disabled={processing}
                  className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {processing ? '처리 중...' : allFree ? '무료 다운로드' : `결제하기 (${formatPrice(getTotal())})`}
                </button>
              </div>

              {/* 무료 상품만 먼저 받기 */}
              {!allFree && hasFreeItems && (
                <button
                  onClick={handleFreeItemsOnly}
                  disabled={processing}
                  className="w-full h-11 rounded-lg border-2 border-emerald-500 text-emerald-700 text-sm font-medium hover:bg-emerald-50 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Gift className="w-4 h-4" />
                  {processing ? '처리 중...' : `무료 상품만 먼저 받기 (${freeItems.length}개)`}
                </button>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              디지털 콘텐츠 특성상 다운로드 후 환불이 제한될 수 있습니다
            </p>
          </div>
        </div>
      )}

      {/* Clear Cart Confirm Modal */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="bg-background rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">장바구니 비우기</h3>
            <p className="text-sm text-muted-foreground mb-6">장바구니를 비우시겠습니까?</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCart()
                  setShowClearConfirm(false)
                }}
                className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
              >
                비우기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
