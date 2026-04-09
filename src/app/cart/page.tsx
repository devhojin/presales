'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cart-store'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, Trash2, X, ArrowLeft, Gift, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useToastStore } from '@/stores/toast-store'
import * as gtag from '@/lib/gtag'

export default function CartPage() {
  const { items, removeItem, clearCart, getTotal, getDiscountTotal } = useCartStore()
  const { addToast } = useToastStore()
  const [processing, setProcessing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: number; name: string; discount_type: string; discount_value: number } | null>(null)
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

  function getCouponDiscount() {
    if (!appliedCoupon) return 0
    const cartTotal = getTotal() + getDiscountTotal()
    if (appliedCoupon.discount_type === 'percent') {
      return Math.floor((cartTotal * appliedCoupon.discount_value) / 100)
    } else {
      return appliedCoupon.discount_value
    }
  }

  async function applyCoupon() {
    setCouponLoading(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('coupons')
        .select('id, name, code, discount_type, discount_value, min_amount, is_active, expires_at')
        .eq('code', couponCode)
        .eq('is_active', true)
        .single()

      if (!data) {
        addToast('유효하지 않은 쿠폰 코드입니다.', 'error')
        return
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        addToast('만료된 쿠폰입니다.', 'error')
        return
      }
      const cartTotal = getTotal() + getDiscountTotal()
      if (data.min_amount && cartTotal < data.min_amount) {
        addToast(`최소 주문금액 ${data.min_amount.toLocaleString()}원 이상이어야 합니다.`, 'error')
        return
      }
      setAppliedCoupon(data)
      addToast('쿠폰이 적용되었습니다!', 'success')
    } catch {
      addToast('쿠폰 확인 중 오류가 발생했습니다.', 'error')
    } finally {
      setCouponLoading(false)
    }
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 py-12 md:py-16">
      <Link href="/store" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> 스토어로 돌아가기
      </Link>

      <div className="flex items-center gap-3 mb-10">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">장바구니</h1>
        <Badge variant="outline" className="text-xs font-semibold">{items.length}</Badge>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <ShoppingCart className="w-14 h-14 mx-auto mb-5 opacity-20" />
          <p className="text-lg font-semibold text-foreground tracking-tight">장바구니가 비어있습니다</p>
          <p className="text-sm mt-2 mb-8">마음에 드는 템플릿을 담아보세요</p>
          <Link
            href="/store"
            className="inline-flex items-center h-11 px-6 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-all duration-300 active:scale-[0.98]"
          >
            문서 스토어 둘러보기
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Paid items banner removed - 결제 기능 활성화됨 */}

          {/* Cart Items */}
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-4 p-5 rounded-2xl border border-border/50 bg-card">
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
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-base font-bold text-primary">{formatPrice(item.price)}</span>
                    {item.originalPrice > item.price && (
                      <>
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(item.originalPrice)}</span>
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                          <Sparkles className="w-3 h-3" />
                          구매 이력 할인
                        </div>
                      </>
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

          {/* 쿠폰 코드 입력 */}
          <div className="border border-border/50 rounded-2xl p-5 bg-card">
            <h3 className="text-sm font-semibold mb-3">쿠폰 코드</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="쿠폰 코드를 입력하세요"
                className="flex-1 h-11 rounded-xl border border-border px-4 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                maxLength={20}
                disabled={appliedCoupon !== null}
              />
              <button
                onClick={applyCoupon}
                disabled={!couponCode || couponLoading || appliedCoupon !== null}
                className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {couponLoading ? '확인중...' : '적용'}
              </button>
            </div>
            {appliedCoupon && (
              <div className="flex items-center justify-between text-sm p-2 bg-emerald-50 rounded-lg">
                <span className="text-emerald-600 font-medium">
                  ✓ {appliedCoupon.name} (-{appliedCoupon.discount_type === 'percent' ? `${appliedCoupon.discount_value}%` : `${appliedCoupon.discount_value.toLocaleString()}원`})
                </span>
                <button
                  onClick={() => {
                    setAppliedCoupon(null)
                    setCouponCode('')
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground hover:font-medium cursor-pointer"
                >
                  취소
                </button>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 space-y-5">
            <h2 className="font-semibold text-lg tracking-tight">주문 요약</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">상품 금액</span>
                <span>{formatPrice(getTotal() + getDiscountTotal())}</span>
              </div>
              {getDiscountTotal() > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>상품 할인</span>
                  <span>-{formatPrice(getDiscountTotal())}</span>
                </div>
              )}
              {getCouponDiscount() > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>쿠폰 할인</span>
                  <span>-{formatPrice(getCouponDiscount())}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>결제 금액</span>
                <span className="text-primary">{formatPrice(Math.max(0, getTotal() - getCouponDiscount()))}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="h-12 px-5 rounded-full border border-border text-sm font-medium hover:bg-muted transition-all duration-300 flex items-center gap-2 cursor-pointer active:scale-[0.98]"
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
                      router.push('/checkout')
                    }
                  }}
                  disabled={processing}
                  className="flex-1 h-12 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-all duration-300 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {processing ? '처리 중...' : allFree ? '무료 다운로드' : `결제하기 (${formatPrice(Math.max(0, getTotal() - getCouponDiscount()))})`}
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
