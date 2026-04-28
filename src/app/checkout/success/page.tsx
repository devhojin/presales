'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cart-store'
import { useToastStore } from '@/stores/toast-store'
import * as gtag from '@/lib/gtag'
import { CheckCircle, Loader2, XCircle, Building2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { OrderReceiptDocument, type ReceiptOrder, type ReceiptProfile } from '@/components/orders/OrderReceiptDocument'

type VirtualAccountInfo = {
  accountNumber: string | null
  bank: string | null
  dueDate: string | null
  customerName: string | null
}

const BANK_CODE_MAP: Record<string, string> = {
  '04': 'KB국민은행', '03': 'IBK기업은행', '11': 'NH농협', '20': '우리은행',
  '81': '하나은행', '88': '신한은행', '27': '씨티은행', '71': '우체국',
  '32': '부산은행', '34': '광주은행', '31': '대구은행', '39': '경남은행',
  '37': '전북은행', '35': '제주은행', '92': '토스뱅크', '89': '케이뱅크',
  '90': '카카오뱅크',
}
function bankLabel(code: string | null): string {
  if (!code) return '은행'
  return BANK_CODE_MAP[code] ?? code
}
function formatDueDate(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return iso
  }
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { clearCart } = useCartStore()
  const { addToast } = useToastStore()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmedOrderId, setConfirmedOrderId] = useState<number | null>(null)
  const [isChatPayment, setIsChatPayment] = useState(false)
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccountInfo | null>(null)
  const [cashReceiptUrl, setCashReceiptUrl] = useState<string | null>(null)
  const [checkoutOrder, setCheckoutOrder] = useState<ReceiptOrder | null>(null)
  const [profile, setProfile] = useState<ReceiptProfile | null>(null)

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')
    const chatPaymentId = searchParams.get('chat_payment_id')

    const rewardOnlyOrderId = !paymentKey && orderId && !amount ? Number(orderId) : null
    if (rewardOnlyOrderId && Number.isInteger(rewardOnlyOrderId) && rewardOnlyOrderId > 0) {
      setConfirmedOrderId(rewardOnlyOrderId)
      setStatus('success')
      loadOrderDocument(rewardOnlyOrderId)
      clearCart()
      sessionStorage.removeItem('presales-applied-coupon')
      sessionStorage.removeItem('presales-reward-use')
      sessionStorage.removeItem('presales-tax-info')
      gtag.trackPurchase(String(rewardOnlyOrderId), 0)
      addToast('적립금 주문이 완료되었습니다!', 'success')
      return
    }

    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      setErrorMessage('결제 정보가 올바르지 않습니다.')
      return
    }

    if (chatPaymentId) setIsChatPayment(true)

    async function loadOrderDocument(orderPk: number | null | undefined) {
      if (!orderPk || chatPaymentId) return
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [{ data: profileData }, { data: orderData }] = await Promise.all([
          supabase.from('profiles').select('name, email, phone, company').eq('id', user.id).single(),
          supabase
            .from('orders')
            .select('id, order_number, total_amount, status, created_at, paid_at, payment_method, cash_receipt_url, coupon_discount, reward_discount, order_items(id, price, original_price, discount_amount, discount_reason, discount_source_product_id, products(id, title, price))')
            .eq('id', orderPk)
            .eq('user_id', user.id)
            .single(),
        ])

        setProfile(profileData
          ? { ...profileData, email: profileData.email || user.email || null }
          : { name: null, email: user.email || null, phone: null, company: null })
        if (orderData) {
          const checkoutOrder = orderData as unknown as ReceiptOrder
          const discountSourceIds = Array.from(new Set(
            (checkoutOrder.order_items || [])
              .map(item => item.discount_source_product_id)
              .filter((id): id is number => typeof id === 'number' && id > 0)
          ))
          if (discountSourceIds.length > 0) {
            const { data: discountSourceProducts } = await supabase
              .from('products')
              .select('id, title, price')
              .in('id', discountSourceIds)
            const sourceMap = new Map((discountSourceProducts || []).map(product => [product.id, product]))
            checkoutOrder.order_items = (checkoutOrder.order_items || []).map(item => ({
              ...item,
              discount_source_product: item.discount_source_product_id ? sourceMap.get(item.discount_source_product_id) ?? null : null,
            }))
          }
          setCheckoutOrder(checkoutOrder)
        }
      } catch {
        // 주문서 조회 실패는 결제 승인 결과를 막지 않습니다.
      }
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
            chat_payment_id: chatPaymentId ?? undefined,
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
        setVirtualAccount(data.virtualAccount ?? null)
        setCashReceiptUrl(data.cashReceiptUrl ?? null)
        setStatus('success')
        await loadOrderDocument(data.orderId)

        if (!chatPaymentId) {
          // 일반 결제: 장바구니 & 세션 정리
          clearCart()
          sessionStorage.removeItem('presales-applied-coupon')
          sessionStorage.removeItem('presales-reward-use')
          sessionStorage.removeItem('presales-tax-info')
        }

        // GA4 purchase event (가상계좌는 입금 완료 시 webhook 에서 별도 추적 권장)
        if (!data.isVirtualAccount) {
          gtag.trackPurchase(String(data.orderId), Number(amount))
        }

        addToast(
          data.isVirtualAccount ? '가상계좌가 발급되었습니다.' : '결제가 완료되었습니다!',
          'success',
        )
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
          onClick={() => router.push(isChatPayment ? '/' : '/cart')}
          className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          {isChatPayment ? '홈으로 돌아가기' : '장바구니로 돌아가기'}
        </button>
      </div>
    )
  }

  // 가상계좌 대기 화면
  if (virtualAccount) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="mx-auto max-w-lg">
          <div className="text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-blue-500" />
            <h1 className="text-2xl font-bold mb-2">가상계좌 발급 완료</h1>
            <p className="text-muted-foreground mb-6">
              아래 계좌로 입금하시면 자동으로 결제가 완료됩니다.<br />
              현금영수증도 자동 발급됩니다.
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-6 space-y-3 text-left border border-border">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">입금 은행</span>
              <span className="font-semibold">{bankLabel(virtualAccount.bank)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">계좌번호</span>
              <span className="font-mono font-bold text-primary select-all">{virtualAccount.accountNumber}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">예금주</span>
              <span className="font-medium">{virtualAccount.customerName ?? '(주)프리세일즈'}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">입금 기한</span>
              <span className="font-medium text-red-600">{formatDueDate(virtualAccount.dueDate)}</span>
            </div>
          </div>
          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-900 space-y-1">
            <p>• 입금 확인은 토스페이먼츠 webhook 을 통해 자동 처리됩니다 (1~3분 소요)</p>
            <p>• 입금 후 마이페이지에서 다운로드 가능하며 안내 이메일이 발송됩니다</p>
            <p>• 기한 내 미입금 시 주문이 자동 취소됩니다</p>
          </div>
          <div className="mt-8 flex gap-3 justify-center">
            <Link
              href="/mypage/orders"
              className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors inline-flex items-center"
            >
              주문 내역 확인
            </Link>
            <Link
              href="/"
              className="h-11 px-6 rounded-lg border border-border font-medium hover:bg-muted transition-colors inline-flex items-center"
            >
              홈으로
            </Link>
          </div>
        </div>
        {checkoutOrder && (
          <div className="mt-12 rounded-xl bg-neutral-100 p-3 sm:p-6">
            <OrderReceiptDocument order={checkoutOrder} profile={profile} className="rounded-sm" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-blue-500" />
        <h1 className="text-2xl font-bold mb-2">결제 완료!</h1>
        {isChatPayment ? (
          <p className="text-muted-foreground mb-8">
            결제가 성공적으로 처리되었습니다.<br />
            담당자가 확인 후 안내드리겠습니다.
          </p>
        ) : (
          <p className="text-muted-foreground mb-8">
            주문이 완료되었습니다.<br />
            마이페이지에서 문서를 다운로드하세요.
            {confirmedOrderId && <span className="block mt-2 text-xs font-mono text-muted-foreground">Order ID #{confirmedOrderId}</span>}
            {cashReceiptUrl && (
              <>
                <br />
                <a href={cashReceiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm mt-2 inline-block">
                  현금영수증 확인하기
                </a>
              </>
            )}
          </p>
        )}
      </div>
      <div className="flex gap-3 justify-center">
        {isChatPayment ? (
          <Link
            href="/"
            className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors inline-flex items-center"
          >
            홈으로 이동
          </Link>
        ) : (
          <>
            <Link
              href="/mypage"
              className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors inline-flex items-center"
            >
              내 문서 다운로드하러 가기
            </Link>
            <Link
              href="/store"
              className="h-11 px-6 rounded-lg border border-border font-medium hover:bg-muted transition-colors inline-flex items-center"
            >
              스토어 계속 둘러보기
            </Link>
          </>
        )}
      </div>

      {/* 활용 가이드 */}
      {!isChatPayment && (
        <div className="mt-8 max-w-md mx-auto text-left bg-muted/50 rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-3">이렇게 활용하세요</h3>
          <ol className="space-y-2 text-xs text-muted-foreground">
            <li className="flex gap-2"><span className="font-bold text-primary">1.</span> 마이페이지에서 원본 파일을 다운로드하세요</li>
            <li className="flex gap-2"><span className="font-bold text-primary">2.</span> PPT/HWP를 열어 자사 내용으로 교체하세요</li>
            <li className="flex gap-2"><span className="font-bold text-primary">3.</span> 평가표 항목을 체크하며 최종 검토하세요</li>
          </ol>
        </div>
      )}

      {!isChatPayment && checkoutOrder && (
        <div className="mt-12 rounded-xl bg-neutral-100 p-3 sm:p-6">
          <OrderReceiptDocument order={checkoutOrder} profile={profile} className="rounded-sm" />
        </div>
      )}
    </div>
  )
}
