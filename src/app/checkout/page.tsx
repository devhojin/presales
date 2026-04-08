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
  const totalAmount = getTotal()

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

        if (existingOrder) {
          // 기존 pending 주문 재사용: total_amount 업데이트 및 order_items 재생성
          const { error: updateError } = await supabase
            .from('orders')
            .update({ total_amount: totalAmount })
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
              total_amount: totalAmount,
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

        // 주문 상품 등록
        const orderItems = paidItems.map((item) => ({
          order_id: order.id,
          product_id: item.productId,
          price: item.price,
        }))
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
          value: totalAmount,
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
            <span>할인</span>
            <span>-{formatPrice(getDiscountTotal())}</span>
          </div>
        )}
        <div className="border-t pt-3 flex justify-between font-bold text-lg">
          <span>결제 금액</span>
          <span className="text-primary">{formatPrice(totalAmount)}</span>
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
              {formatPrice(totalAmount)} 결제하기
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
