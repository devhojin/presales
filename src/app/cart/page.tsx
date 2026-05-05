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
import { useDraggableModal } from '@/hooks/useDraggableModal'
import { useCartDiscountSources } from '@/hooks/use-cart-discount-sources'
import { getCartDiscountSummary, getCartItemDiscountBreakdown } from '@/lib/cart-discounts'
import {
  DEFAULT_REWARD_SETTINGS,
  RewardSettings,
  clampRewardUseAmount,
  loadRewardBalance,
  loadRewardSettings,
} from '@/lib/reward-points'
import { GLOBAL_FREE_USER_LIMIT } from '@/lib/free-access-policy'

interface OwnedCoupon {
  id: string
  code: string
  name: string | null
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount: number
  valid_until: string | null
}

export default function CartPage() {
  const { items, removeItem, clearCart } = useCartStore()
  const { addToast } = useToastStore()
  const discountSources = useCartDiscountSources(items.map((item) => item.productId))
  const discountSummary = getCartDiscountSummary(items, discountSources)
  const effectiveCartTotal = discountSummary.total
  const [processing, setProcessing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string
    code: string
    name?: string | null
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    min_order_amount: number
    valid_until: string | null
  } | null>(null)
  const [ownedCoupons, setOwnedCoupons] = useState<OwnedCoupon[]>([])
  const [couponMode, setCouponMode] = useState<'select' | 'code'>('select')
  const [rewardSettings, setRewardSettings] = useState<RewardSettings>(DEFAULT_REWARD_SETTINGS)
  const [rewardBalance, setRewardBalance] = useState(0)
  const [rewardInput, setRewardInput] = useState('')
  const [rewardApplied, setRewardApplied] = useState(0)


  const router = useRouter()
  const { handleMouseDown: clearConfirmMouseDown, modalStyle: clearConfirmStyle } = useDraggableModal()


  // 내 보유 쿠폰 로드
  useEffect(() => {
    const loadOwned = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setCouponMode('code')
        return
      }
      const { data: userCoupons } = await supabase
        .from('user_coupons')
        .select('coupon_id, used_at, coupons:coupon_id(id, code, name, description, discount_type, discount_value, min_order_amount, valid_from, valid_until, is_active)')
        .eq('user_id', user.id)
        .is('used_at', null)
      const now = new Date()
      const owned = (userCoupons || [])
        .map(uc => {
          const c = uc.coupons as unknown as OwnedCoupon & { is_active: boolean; valid_from: string | null }
          return c
        })
        .filter(c => {
          if (!c || !c.is_active) return false
          if (c.valid_from && new Date(c.valid_from) > now) return false
          if (c.valid_until && new Date(c.valid_until) < now) return false
          return true
        })
      setOwnedCoupons(owned)
      if (owned.length === 0) setCouponMode('code')
    }
    loadOwned()
  }, [])

  // 적립금 설정/잔액 로드
  useEffect(() => {
    const loadRewards = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const settings = await loadRewardSettings(supabase)
      setRewardSettings(settings)
      if (!user) {
        setRewardBalance(0)
        setRewardApplied(0)
        sessionStorage.removeItem('presales-reward-use')
        return
      }
      const balance = await loadRewardBalance(supabase, user.id)
      setRewardBalance(balance)

      const stored = sessionStorage.getItem('presales-reward-use')
      if (stored) {
        const requested = Math.max(0, Math.floor(Number(stored) || 0))
        setRewardInput(String(requested))
        setRewardApplied(requested)
      }
    }
    loadRewards().catch(() => {
      setRewardBalance(0)
    })
  }, [])

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

  // 무료 주문 서버 API 호출 공통 헬퍼.
  //   Round 10 이전: 클라이언트가 직접 orders(status='paid') + order_items INSERT
  //   → Round 9 order_items RLS (orders.status='pending' 강제) 에 막혀 전면 깨짐.
  //   → 서버 /api/orders/free 가 service_role 로 처리 + products.is_free 재검증.
  async function submitFreeOrder(productIds: number[]): Promise<{ ok: boolean; orderId?: string | number }> {
    const res = await fetch('/api/orders/free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds }),
    })
    if (res.status === 401) {
      router.push('/auth/login?redirect=/cart')
      return { ok: false }
    }
    const payload = (await res.json().catch(() => null)) as
      | { success?: boolean; orderId?: string | number; error?: string }
      | null
    if (!res.ok || !payload?.success || !payload.orderId) {
      addToast(payload?.error ?? '주문 처리에 실패했습니다. 다시 시도해주세요.', 'error')
      return { ok: false }
    }
    return { ok: true, orderId: payload.orderId }
  }

  async function handleFreeItemsOnly() {
    setProcessing(true)
    try {
      const result = await submitFreeOrder(freeItems.map((item) => item.productId))
      if (!result.ok || !result.orderId) return
      gtag.trackPurchase(String(result.orderId), 0)
      freeItems.forEach((item) => removeItem(item.productId))
      addToast('무료 상품이 처리되었습니다! 나의콘솔에서 다운로드하세요.', 'success')
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
  const formatRewardAmount = (amount: number) => `${Math.max(0, amount).toLocaleString('ko-KR')}원`

  function getCouponDiscount() {
    if (!appliedCoupon) return 0
    const cartTotal = effectiveCartTotal
    if (appliedCoupon.discount_type === 'percentage') {
      return Math.floor((cartTotal * appliedCoupon.discount_value) / 100)
    }
    return Math.min(appliedCoupon.discount_value, cartTotal)
  }

  const couponDiscount = getCouponDiscount()
  const rewardBaseAmount = Math.max(0, effectiveCartTotal - couponDiscount)
  const rewardMaxUsable = clampRewardUseAmount(
    rewardBaseAmount,
    rewardBalance,
    rewardBaseAmount,
    rewardSettings,
  )
  const rewardDiscount = clampRewardUseAmount(
    rewardApplied,
    rewardBalance,
    rewardBaseAmount,
    rewardSettings,
  )
  const finalPayAmount = Math.max(0, rewardBaseAmount - rewardDiscount)

  useEffect(() => {
    if (rewardApplied <= 0) return
    const clamped = clampRewardUseAmount(
      rewardApplied,
      rewardBalance,
      rewardBaseAmount,
      rewardSettings,
    )
    if (clamped !== rewardApplied) {
      setRewardApplied(clamped)
      setRewardInput(clamped > 0 ? String(clamped) : '')
      if (clamped > 0) sessionStorage.setItem('presales-reward-use', String(clamped))
      else sessionStorage.removeItem('presales-reward-use')
    }
  }, [rewardApplied, rewardBalance, rewardBaseAmount, rewardSettings])

  function applyRewardPoints(requested?: number) {
    const amount = clampRewardUseAmount(
      requested ?? Number(rewardInput),
      rewardBalance,
      rewardBaseAmount,
      rewardSettings,
    )
    if (amount <= 0) {
      setRewardApplied(0)
      setRewardInput('')
      sessionStorage.removeItem('presales-reward-use')
      addToast('사용 가능한 적립금이 없습니다.', 'error')
      return
    }
    setRewardApplied(amount)
    setRewardInput(String(amount))
    sessionStorage.setItem('presales-reward-use', String(amount))
    addToast(`${amount.toLocaleString('ko-KR')}원 적립금이 적용되었습니다.`, 'success')
  }

  function clearRewardPoints() {
    setRewardApplied(0)
    setRewardInput('')
    sessionStorage.removeItem('presales-reward-use')
  }


  function applyOwnedCoupon(coupon: OwnedCoupon) {
    const cartTotal = effectiveCartTotal
    const now = new Date()
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      addToast('만료된 쿠폰입니다.', 'error')
      return
    }
    if (coupon.min_order_amount && cartTotal < Number(coupon.min_order_amount)) {
      addToast(`최소 주문금액 ${Number(coupon.min_order_amount).toLocaleString()}원 이상이어야 합니다.`, 'error')
      return
    }
    setAppliedCoupon({
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      min_order_amount: Number(coupon.min_order_amount || 0),
      valid_until: coupon.valid_until,
    })
    sessionStorage.setItem('presales-applied-coupon', JSON.stringify({
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
    }))
    addToast(`${coupon.name || coupon.code} 쿠폰이 적용되었습니다!`, 'success')
  }

  async function applyCoupon() {
    setCouponLoading(true)
    try {
      const supabase = createClient()
      const code = couponCode.toUpperCase().trim()
      const { data, error } = await supabase
        .from('coupons')
        .select('id, code, name, discount_type, discount_value, min_order_amount, is_active, valid_from, valid_until, usage_count, max_usage')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle()

      if (error || !data) {
        addToast('유효하지 않은 쿠폰 코드입니다.', 'error')
        return
      }
      const now = new Date()
      if (data.valid_from && new Date(data.valid_from) > now) {
        addToast('아직 사용할 수 없는 쿠폰입니다.', 'error')
        return
      }
      if (data.valid_until && new Date(data.valid_until) < now) {
        addToast('만료된 쿠폰입니다.', 'error')
        return
      }
      if (data.max_usage !== null && data.usage_count >= data.max_usage) {
        addToast('사용 횟수가 소진된 쿠폰입니다.', 'error')
        return
      }
      const cartTotal = effectiveCartTotal
      if (data.min_order_amount && cartTotal < data.min_order_amount) {
        addToast(`최소 주문금액 ${Number(data.min_order_amount).toLocaleString()}원 이상이어야 합니다.`, 'error')
        return
      }
      setAppliedCoupon({
        id: data.id,
        code: data.code,
        name: data.name,
        discount_type: data.discount_type,
        discount_value: Number(data.discount_value),
        min_order_amount: Number(data.min_order_amount || 0),
        valid_until: data.valid_until,
      })
      sessionStorage.setItem('presales-applied-coupon', JSON.stringify({
        id: data.id,
        code: data.code,
        name: data.name,
        discount_type: data.discount_type,
        discount_value: Number(data.discount_value),
      }))
      addToast(`${data.name || data.code} 쿠폰이 적용되었습니다!`, 'success')
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
          <p className="text-sm mt-2 mb-8">아직 템플릿을 담지 않았네요. 인기 제안서부터 확인해보세요.</p>
          <Link
            href="/store"
            className="inline-flex items-center h-11 px-6 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-all duration-300 active:scale-[0.98]"
          >
            인기 템플릿 보기
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Paid items banner removed - 결제 기능 활성화됨 */}

          {/* Cart Items */}
          <div className="space-y-4">
            {items.map((item) => {
              const breakdown = getCartItemDiscountBreakdown(item, discountSources[item.productId])
              const purchaseSource = breakdown.purchaseSource

              return (
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
                      <span className="text-base font-bold text-primary">{formatPrice(breakdown.effectivePrice)}</span>
                      {item.originalPrice > breakdown.effectivePrice && (
                        <>
                          <span className="text-xs text-muted-foreground line-through">{formatPrice(item.originalPrice)}</span>
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium ${
                            purchaseSource ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            <Sparkles className="w-3 h-3" />
                            {purchaseSource ? '구매 이력 할인' : '할인 적용'}
                          </div>
                        </>
                      )}
                    </div>
                    {purchaseSource && breakdown.purchaseDiscount > 0 && (
                      <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs leading-relaxed">
                        <p className="font-semibold text-blue-800">구매한 상품</p>
                        {purchaseSource.sourceProductId > 0 ? (
                          <Link
                            href={`/store/${purchaseSource.sourceProductId}`}
                            className="mt-0.5 block text-blue-950 hover:underline line-clamp-2"
                          >
                            {purchaseSource.sourceTitle}
                          </Link>
                        ) : (
                          <p className="mt-0.5 text-blue-950 line-clamp-2">{purchaseSource.sourceTitle}</p>
                        )}
                        <p className="mt-1 text-blue-700">
                          이 구매 이력으로 {formatPrice(breakdown.purchaseDiscount)} 차감되어 결제금액에 반영됩니다.
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="self-start p-2 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* 쿠폰 선택/입력 */}
          <div className="border border-border/50 rounded-2xl p-5 bg-card">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-semibold">사용할 수 있는 쿠폰</h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  쿠폰은 결제하시기 전에 이 화면에서 적용할 수 있습니다.
                </p>
              </div>
              {ownedCoupons.length > 0 && (
                <div className="flex gap-1 bg-muted/50 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setCouponMode('select')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      couponMode === 'select' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    내 쿠폰 ({ownedCoupons.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCouponMode('code')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      couponMode === 'code' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    코드 입력
                  </button>
                </div>
              )}
            </div>

            {/* 적용된 쿠폰 표시 */}
            {appliedCoupon ? (
              <div className="flex items-center justify-between text-sm p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="min-w-0">
                  <p className="text-blue-800 font-semibold truncate">✓ {appliedCoupon.name || appliedCoupon.code}</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {appliedCoupon.discount_type === 'percentage'
                      ? `${appliedCoupon.discount_value}% 할인`
                      : `${appliedCoupon.discount_value.toLocaleString()}원 할인`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAppliedCoupon(null)
                    setCouponCode('')
                    sessionStorage.removeItem('presales-applied-coupon')
                  }}
                  className="ml-3 shrink-0 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  변경
                </button>
              </div>
            ) : couponMode === 'select' && ownedCoupons.length > 0 ? (
              <div className="space-y-2">
                {ownedCoupons.map((c) => {
                  const cartTotal = effectiveCartTotal
                  const canUse = cartTotal >= Number(c.min_order_amount || 0)
                  const discountPreview = c.discount_type === 'percentage'
                    ? `${c.discount_value}%`
                    : `${Number(c.discount_value).toLocaleString()}원`
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => applyOwnedCoupon(c)}
                      disabled={!canUse}
                      className="w-full flex items-center gap-3 p-3 border border-border rounded-xl bg-background hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left cursor-pointer"
                    >
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                        <Gift className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{c.name || c.code}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {discountPreview} 할인
                          {c.min_order_amount > 0 && ` · 최소 ${Number(c.min_order_amount).toLocaleString()}원`}
                        </p>
                        {!canUse && (
                          <p className="text-[10px] text-red-500 mt-0.5">최소 주문금액 미달</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="쿠폰 코드를 입력하세요"
                    className="flex-1 h-11 rounded-xl border border-border px-4 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    maxLength={32}
                  />
                  <button
                    onClick={applyCoupon}
                    disabled={!couponCode || couponLoading}
                    className="h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {couponLoading ? '확인중...' : '적용'}
                  </button>
                </div>
                {ownedCoupons.length === 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    보유 중인 쿠폰이 없습니다. 코드를 직접 입력해주세요.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-2xl border border-border/50 bg-card p-6 md:p-8 space-y-5">
            <h2 className="font-semibold text-lg tracking-tight">주문 요약</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">상품 금액</span>
                <span>{formatPrice(discountSummary.originalTotal)}</span>
              </div>
              {discountSummary.catalogDiscount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>상품 할인</span>
                  <span>-{formatPrice(discountSummary.catalogDiscount)}</span>
                </div>
              )}
              {discountSummary.purchaseDiscount > 0 && (
                <div className="flex justify-between text-blue-700 font-medium">
                  <span>구매 이력 할인</span>
                  <span>-{formatPrice(discountSummary.purchaseDiscount)}</span>
                </div>
              )}
              {getCouponDiscount() > 0 && (
                <div className="flex justify-between text-blue-700 font-medium">
                  <span>쿠폰 할인</span>
                  <span>-{formatPrice(couponDiscount)}</span>
                </div>
              )}
              {rewardDiscount > 0 && (
                <div className="flex justify-between text-blue-700 font-medium">
                  <span>적립금 사용</span>
                  <span>-{formatPrice(rewardDiscount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>결제 금액</span>
                <span className="text-primary">{formatPrice(finalPayAmount)}</span>
              </div>
            </div>

            {hasPaidItems && rewardSettings.enabled && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-950">적립금</p>
                    <p className="mt-0.5 text-xs text-blue-700">
                      보유 {formatRewardAmount(rewardBalance)} · 1회 최대 {formatRewardAmount(rewardSettings.useLimitPerOrder)}
                    </p>
                  </div>
                  {rewardDiscount > 0 && (
                    <button
                      type="button"
                      onClick={clearRewardPoints}
                      className="text-xs text-blue-700 hover:text-blue-950 cursor-pointer"
                    >
                      해제
                    </button>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={rewardInput}
                    onChange={(e) => setRewardInput(e.target.value)}
                    placeholder="사용할 적립금"
                    className="flex-1 h-10 rounded-xl border border-blue-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => applyRewardPoints()}
                    disabled={rewardMaxUsable <= 0}
                    className="h-10 px-4 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                  >
                    적용
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRewardPoints(rewardMaxUsable)}
                    disabled={rewardMaxUsable <= 0}
                    className="h-10 px-3 rounded-xl border border-blue-200 bg-white text-blue-800 text-sm font-medium hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
                  >
                    전액
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-blue-700">
                  적립금은 쿠폰까지 적용된 최종 금액에서 차감됩니다.
                </p>
              </div>
            )}

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
                        const result = await submitFreeOrder(items.map((item) => item.productId))
                        if (!result.ok || !result.orderId) return
                        gtag.trackPurchase(String(result.orderId), 0)
                        clearCart()
                        addToast('주문이 완료되었습니다! 나의콘솔에서 다운로드하세요.', 'success')
                        router.push('/mypage')
                        router.refresh()
                      } catch {
                        addToast('주문 처리 중 오류가 발생했습니다.', 'error')
                      } finally {
                        setProcessing(false)
                      }
                    } else {
                      if (rewardDiscount > 0) {
                        sessionStorage.setItem('presales-reward-use', String(rewardDiscount))
                      } else {
                        sessionStorage.removeItem('presales-reward-use')
                      }
                      router.push('/checkout')
                    }
                  }}
                  disabled={processing}
                  className="flex-1 h-12 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-all duration-300 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {processing ? '처리 중...' : allFree ? '무료 다운로드' : `결제하기 (${formatPrice(finalPayAmount)})`}
                </button>
              </div>

              {/* 무료 상품만 먼저 받기 */}
              {!allFree && hasFreeItems && (
                <button
                  onClick={handleFreeItemsOnly}
                  disabled={processing}
                  className="w-full h-11 rounded-lg border-2 border-blue-500 text-blue-800 text-sm font-medium hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Gift className="w-4 h-4" />
                  {processing ? '처리 중...' : `무료 상품만 먼저 받기 (${freeItems.length}개)`}
                </button>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              디지털 콘텐츠 특성상 다운로드 후 환불이 제한될 수 있습니다
            </p>
            {hasFreeItems && (
              <p className="text-center text-[11px] font-medium text-blue-700">
                무료 이용은 전체 선착순 {GLOBAL_FREE_USER_LIMIT}명까지 제공됩니다
              </p>
            )}
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
            style={clearConfirmStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2 cursor-move" onMouseDown={clearConfirmMouseDown}>장바구니 비우기</h3>
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
