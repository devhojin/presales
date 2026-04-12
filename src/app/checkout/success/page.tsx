'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cart-store'
import { useToastStore } from '@/stores/toast-store'
import * as gtag from '@/lib/gtag'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { clearCart } = useCartStore()
  const { addToast } = useToastStore()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmedOrderId, setConfirmedOrderId] = useState<number | null>(null)

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')

    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      setErrorMessage('결제 정보가 올바르지 않습니다.')
      return
    }

    async function confirmPayment() {
      try {
        const res = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setStatus('error')
          setErrorMessage(data.error || '결제 승인에 실패했습니다.')
          return
        }

        // 성공
        setConfirmedOrderId(data.orderId)
        setStatus('success')
        clearCart()
        // 세션 정리
        sessionStorage.removeItem('presales-applied-coupon')
        sessionStorage.removeItem('presales-tax-info')

        // GA4 purchase event
        gtag.trackPurchase(String(data.orderId), Number(amount))

        addToast('결제가 완료되었습니다!', 'success')
      } catch {
        setStatus('error')
        setErrorMessage('결제 처리 중 오류가 발생했습니다.')
      }
    }

    confirmPayment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
        <h1 className="text-xl font-bold mb-2">결제 승인 중...</h1>
        <p className="text-muted-foreground">잠시만 기다려주세요.</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center">
        <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
        <h1 className="text-xl font-bold mb-2">결제 실패</h1>
        <p className="text-muted-foreground mb-6">{errorMessage}</p>
        <button
          onClick={() => router.push('/cart')}
          className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          장바구니로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-20 max-w-lg text-center">
      <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
      <h1 className="text-2xl font-bold mb-2">결제 완료!</h1>
      <p className="text-muted-foreground mb-8">
        주문이 성공적으로 처리되었습니다.<br />
        나의콘솔에서 문서를 다운로드하세요.
      </p>
      <div className="flex gap-3 justify-center">
        <Link
          href="/mypage"
          className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors inline-flex items-center"
        >
          나의콘솔로 이동
        </Link>
        <Link
          href="/store"
          className="h-11 px-6 rounded-lg border border-border font-medium hover:bg-muted transition-colors inline-flex items-center"
        >
          스토어 계속 둘러보기
        </Link>
      </div>
    </div>
  )
}
