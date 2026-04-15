'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cart-store'
import { createClient } from '@/lib/supabase'
import { useToastStore } from '@/stores/toast-store'
import { loadTossPayments, TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk'
import { ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react'
import Link from 'next/link'

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!

export default function CheckoutPage() {
  const { items, getTotal, getDiscountTotal, clearCart } = useCartStore()
  const { addToast } = useToastStore()
  const router = useRouter()

  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [dbOrderId, setDbOrderId] = useState<number | null>(null)
  const [paying, setPaying] = useState(false)
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null)

  const paidItems = items.filter((item) => item.price > 0)
  const cartTotal = getTotal()
  const [finalAmount, setFinalAmount] = useState<number>(cartTotal)
  const [couponDiscount, setCouponDiscount] = useState<number>(0)
  const [couponCode, setCouponCode] = useState<string | null>(null)

  useEffect(() => {
    if (paidItems.length === 0) {
      router.replace('/cart')
      return
    }

    let cancelled = false

    async function init() {
      try {
        // 1. 로그인 확인
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login?redirect=/checkout')
          return
        }

        // 1.5. 장바구니 상품 유효성 검증
        const productIds = paidItems.map(item => item.productId)
        const { data: validProducts } = await supabase
          .from('products')
          .select('id, price, is_published')
          .in('id', productIds)
          .eq('is_published', true)

        if (!validProducts || validProducts.length !== paidItems.length) {
          addToast('일부 상품이 판매 중지되었습니다. 장바구니를 확인해주세요.', 'error')
          router.replace('/cart')
          return
        }

        // 할인 매칭 서버사이드 재검증
        const { data: userPaidOrders } = await supabase
          .from('orders')
          .select('id, order_items!inner(product_id)')
          .eq('user_id', user.id)
          .eq('status', 'paid')

        const userPurchasedIds = userPaidOrders?.flatMap(o =>
          o.order_items.map((oi: { product_id: number }) => oi.product_id)
        ) || []

        // 상품별 할인 메타 정보 맵 (order_items 저장용)
        const itemDiscountMap = new Map<number, {
          originalPrice: number
          discountAmount: number
          discountReason: string | null
          discountSourceProductId: number | null
        }>()

        let expectedTotalAmount = 0
        if (userPurchasedIds.length > 0) {
          const { data: activeMatches } = await supabase
            .from('product_discount_matches')
            .select('source_product_id, target_product_id, discount_type, discount_amount')
            .in('target_product_id', productIds)
            .in('source_product_id', userPurchasedIds)
            .eq('is_active', true)

          if (activeMatches && activeMatches.length > 0) {
            // 소스 상품 가격 + 제목 조회 (auto 타입 + 표기용)
            const sourceProductIds = Array.from(new Set(activeMatches.map(m => m.source_product_id)))
            let sourceProducts: { id: number; price: number; title: string }[] = []
            if (sourceProductIds.length > 0) {
              const { data } = await supabase
                .from('products')
                .select('id, price, title')
                .in('id', sourceProductIds)
              sourceProducts = data || []
            }

            // 각 상품별 할인 계산
            for (const item of paidItems) {
              const itemMatches = activeMatches.filter(m => m.target_product_id === item.productId)
              let applicableDiscount = 0
              let appliedSourceId: number | null = null

              for (const match of itemMatches) {
                if (userPurchasedIds.includes(match.source_product_id)) {
                  const discount = match.discount_type === 'auto'
                    ? (sourceProducts.find(p => p.id === match.source_product_id)?.price || 0)
                    : match.discount_amount
                  if (discount > applicableDiscount) {
                    applicableDiscount = discount
                    appliedSourceId = match.source_product_id
                  }
                }
              }

              const dbProduct = validProducts.find(p => p.id === item.productId)
              const originalPrice = dbProduct?.price || 0
              const discountedPrice = Math.max(0, originalPrice - applicableDiscount)
              expectedTotalAmount += discountedPrice

              if (applicableDiscount > 0 && appliedSourceId !== null) {
                const sourceTitle = sourceProducts.find(p => p.id === appliedSourceId)?.title || ''
                itemDiscountMap.set(item.productId, {
                  originalPrice,
                  discountAmount: applicableDiscount,
                  discountReason: `${sourceTitle} 구매 할인`,
                  discountSourceProductId: appliedSourceId,
                })
              }
            }
          } else {
            expectedTotalAmount = validProducts.reduce((sum, p) => sum + p.price, 0)
          }
        } else {
          expectedTotalAmount = validProducts.reduce((sum, p) => sum + p.price, 0)
        }

        // 2.5. 쿠폰 적용 (sessionStorage에서 읽기 + 서버사이드 재검증)
        let appliedCouponInfo: {
          id: string
          code: string
          discount_type: 'percentage' | 'fixed'
          discount_value: number
          coupon_discount: number
        } | null = null
        const rawCoupon = typeof window !== 'undefined' ? sessionStorage.getItem('presales-applied-coupon') : null
        if (rawCoupon) {
          try {
            const cartCoupon = JSON.parse(rawCoupon) as { id: string }
            const { data: couponRow } = await supabase
              .from('coupons')
              .select('id, code, discount_type, discount_value, min_order_amount, valid_from, valid_until, usage_count, max_usage, is_active')
              .eq('id', cartCoupon.id)
              .eq('is_active', true)
              .maybeSingle()
            const now = new Date()
            const validNow = couponRow
              && (!couponRow.valid_from || new Date(couponRow.valid_from) <= now)
              && (!couponRow.valid_until || new Date(couponRow.valid_until) >= now)
              && (couponRow.max_usage === null || couponRow.usage_count < couponRow.max_usage)
              && (!couponRow.min_order_amount || expectedTotalAmount >= Number(couponRow.min_order_amount))
            if (validNow && couponRow) {
              const dv = Number(couponRow.discount_value)
              const couponDiscount = couponRow.discount_type === 'percentage'
                ? Math.floor((expectedTotalAmount * dv) / 100)
                : Math.min(dv, expectedTotalAmount)
              expectedTotalAmount = Math.max(0, expectedTotalAmount - couponDiscount)
              appliedCouponInfo = {
                id: couponRow.id,
                code: couponRow.code,
                discount_type: couponRow.discount_type as 'percentage' | 'fixed',
                discount_value: dv,
                coupon_discount: couponDiscount,
              }
            }
          } catch {
            // invalid stored coupon, ignore
          }
        }

        // 서버 재계산이 최종 결제 금액. 클라이언트가 조작했더라도 무관.
        setFinalAmount(expectedTotalAmount)
        setCouponDiscount(appliedCouponInfo?.coupon_discount || 0)
        setCouponCode(appliedCouponInfo?.code || null)

        // 2. 주문 생성 또는 재사용 (pending 상태)
        // 기존 pending 주문 확인
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .single()

        let order
        let orderError

        // 세금계산서/추가정보 (cart 에서 sessionStorage 에 저장됨)
        let taxInfo: {
          tax_contact_info?: string
          business_cert_url?: string | null
          business_cert_name?: string | null
          business_cert_path?: string | null
          deposit_memo?: string
          card_memo?: string
        } = {}
        try {
          const raw = sessionStorage.getItem('presales-tax-info')
          if (raw) taxInfo = JSON.parse(raw)
        } catch { /* noop */ }

        const orderUpdateFields = {
          total_amount: expectedTotalAmount,
          coupon_id: appliedCouponInfo?.id ?? null,
          coupon_code: appliedCouponInfo?.code ?? null,
          coupon_discount: appliedCouponInfo?.coupon_discount ?? 0,
          tax_contact_info: taxInfo.tax_contact_info || null,
          business_cert_url: taxInfo.business_cert_path || null,
          business_cert_name: taxInfo.business_cert_name || null,
          deposit_memo: taxInfo.deposit_memo || null,
          card_memo: taxInfo.card_memo || null,
        }

        if (existingOrder) {
          // 기존 pending 주문 재사용: total_amount 업데이트 및 order_items 재생성
          const { error: updateError } = await supabase
            .from('orders')
            .update(orderUpdateFields)
            .eq('id', existingOrder.id)

          if (updateError) {
            addToast('주문 금액 업데이트에 실패했습니다.', 'error')
            router.replace('/cart')
            return
          }

          // 기존 order_items 삭제 후 재생성
          await supabase.from('order_items').delete().eq('order_id', existingOrder.id)
          order = existingOrder
          orderError = null
        } else {
          // 새 pending 주문 생성
          const insertResult = await supabase
            .from('orders')
            .insert({
              user_id: user.id,
              ...orderUpdateFields,
              status: 'pending',
              payment_method: 'card',
            })
            .select('id')
            .single()

          order = insertResult.data
          orderError = insertResult.error
        }

        if (orderError || !order) {
          addToast('주문 생성에 실패했습니다.', 'error')
          router.replace('/cart')
          return
        }

        // 주문 상품 등록 (할인 메타 포함)
        const orderItems = paidItems.map((item) => {
          const discount = itemDiscountMap.get(item.productId)
          return {
            order_id: order.id,
            product_id: item.productId,
            price: item.price,
            original_price: discount?.originalPrice ?? item.price,
            discount_amount: discount?.discountAmount ?? 0,
            discount_reason: discount?.discountReason ?? null,
            discount_source_product_id: discount?.discountSourceProductId ?? null,
          }
        })
        await supabase.from('order_items').insert(orderItems)

        const tossOrderId = `presales_${order.id}_${Date.now()}`

        if (cancelled) return

        setDbOrderId(order.id)
        setOrderId(tossOrderId)

        // 3. 토스 위젯 초기화
        const tossPayments = await loadTossPayments(CLIENT_KEY)
        const widgets = tossPayments.widgets({ customerKey: user.id })
        widgetsRef.current = widgets

        await widgets.setAmount({
          currency: 'KRW',
          value: expectedTotalAmount,
        })

        await Promise.all([
          widgets.renderPaymentMethods({
            selector: '#payment-method',
            variantKey: 'DEFAULT',
          }),
          widgets.renderAgreement({
            selector: '#agreement',
            variantKey: 'AGREEMENT',
          }),
        ])

        if (!cancelled) {
          setReady(true)
          setLoading(false)
        }
      } catch (err) {
        console.error('[checkout init error]', err)
        if (!cancelled) {
          addToast('결제 초기화에 실패했습니다.', 'error')
          setLoading(false)
        }
      }
    }

    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handlePayment() {
    if (!widgetsRef.current || !orderId) return

    setPaying(true)
    try {
      await widgetsRef.current.requestPayment({
        orderId,
        orderName: paidItems.length === 1
          ? paidItems[0].title
          : `${paidItems[0].title} 외 ${paidItems.length - 1}건`,
        successUrl: `${window.location.origin}/checkout/success`,
        failUrl: `${window.location.origin}/checkout/fail`,
      })
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string }
      if (error.code === 'USER_CANCEL') {
        setPaying(false)
        return
      }
      console.error('[결제 요청 실패]', error)
      addToast(error.message || '결제 요청에 실패했습니다.', 'error')

      // pending 주문 취소
      if (dbOrderId) {
        const supabase = createClient()
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', dbOrderId)
      }
      setPaying(false)
    }
  }

  const formatPrice = (price: number) => {
    if (price === 0) return '무료'
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <Link href="/cart" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> 장바구니로 돌아가기
      </Link>

      <h1 className="text-2xl font-bold mb-8">결제하기</h1>

      {/* 주문 요약 */}
      <div className="bg-muted/30 rounded-xl p-5 mb-6 space-y-3">
        <h2 className="font-semibold text-sm">주문 상품 ({paidItems.length}개)</h2>
        {paidItems.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span className="text-muted-foreground line-clamp-1 flex-1 mr-4">{item.title}</span>
            <span className="font-medium shrink-0">{formatPrice(item.price)}</span>
          </div>
        ))}
        {getDiscountTotal() > 0 && (
          <div className="flex justify-between text-sm text-red-500">
            <span>상품 할인</span>
            <span>-{formatPrice(getDiscountTotal())}</span>
          </div>
        )}
        {couponDiscount > 0 && (
          <div className="flex justify-between text-sm text-blue-700">
            <span>쿠폰 할인{couponCode && ` (${couponCode})`}</span>
            <span>-{formatPrice(couponDiscount)}</span>
          </div>
        )}
        <div className="border-t pt-3 flex justify-between font-bold text-lg">
          <span>결제 금액</span>
          <span className="text-primary">{formatPrice(finalAmount)}</span>
        </div>
      </div>

      {/* 토스 결제 위젯 */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          결제 수단을 불러오는 중...
        </div>
      )}

      <div id="payment-method" className="mb-4" />
      <div id="agreement" className="mb-6" />

      {ready && (
        <button
          onClick={handlePayment}
          disabled={paying}
          className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              결제 처리 중...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              {formatPrice(finalAmount)} 결제하기
            </>
          )}
        </button>
      )}

      <p className="text-[11px] text-muted-foreground text-center mt-4">
        결제는 토스페이먼츠를 통해 안전하게 처리됩니다
      </p>
    </div>
  )
}
