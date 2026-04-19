'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCartStore } from '@/stores/cart-store'
import { createClient } from '@/lib/supabase'
import { useToastStore } from '@/stores/toast-store'
import { loadTossPayments, TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk'
import { ArrowLeft, ShieldCheck, Loader2, CreditCard, Building2, MessageCircle, ChevronDown, Upload, Check } from 'lucide-react'
import Link from 'next/link'

const CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!

type PaymentMethod = 'card' | 'bank_transfer'

export default function CheckoutPage() {
  const { items, getTotal, getDiscountTotal, clearCart } = useCartStore()
  const { addToast } = useToastStore()
  const router = useRouter()
  const searchParams = useSearchParams()

  // 채팅 결제 모드 감지
  const chatPaymentId = searchParams.get('chat_payment_id')
  const chatAmount = chatPaymentId ? Number(searchParams.get('amount') ?? '0') : null
  const chatDescription = chatPaymentId ? (searchParams.get('description') ?? '채팅 결제') : null
  const isChatPayment = chatPaymentId !== null && chatAmount !== null && chatAmount > 0

  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [dbOrderId, setDbOrderId] = useState<number | null>(null)
  const [paying, setPaying] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card')
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null)
  // 토스 가상계좌/현금영수증 SMS/이메일 발송에 필요
  const customerRef = useRef<{ name?: string; email?: string; phone?: string }>({})

  // 세금계산서/추가정보
  const [showExtraInfo, setShowExtraInfo] = useState(false)
  const [taxContactInfo, setTaxContactInfo] = useState('')
  const [businessCertUrl, setBusinessCertUrl] = useState<string | null>(null)
  const [businessCertName, setBusinessCertName] = useState<string | null>(null)
  const [businessCertPath, setBusinessCertPath] = useState<string | null>(null)
  const [depositMemo, setDepositMemo] = useState('')
  const [cardMemo, setCardMemo] = useState('')
  const [uploadingCert, setUploadingCert] = useState(false)
  const certInputRef = useRef<HTMLInputElement>(null)

  // 세션 복원 (세금계산서 정보)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('presales-tax-info')
      if (raw) {
        const data = JSON.parse(raw)
        setTaxContactInfo(data.tax_contact_info || '')
        setBusinessCertUrl(data.business_cert_url || null)
        setBusinessCertName(data.business_cert_name || null)
        setBusinessCertPath(data.business_cert_path || null)
        setDepositMemo(data.deposit_memo || '')
        setCardMemo(data.card_memo || '')
      }
    } catch { /* noop */ }
  }, [])

  // 세션 저장 (입력 변경 시)
  const saveTaxInfo = useCallback(() => {
    const data = {
      tax_contact_info: taxContactInfo,
      business_cert_url: businessCertUrl,
      business_cert_name: businessCertName,
      business_cert_path: businessCertPath,
      deposit_memo: depositMemo,
      card_memo: cardMemo,
    }
    sessionStorage.setItem('presales-tax-info', JSON.stringify(data))
  }, [taxContactInfo, businessCertUrl, businessCertName, businessCertPath, depositMemo, cardMemo])

  useEffect(() => {
    saveTaxInfo()
  }, [saveTaxInfo])

  async function handleCertUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      addToast('파일 크기는 10MB 이하여야 합니다.', 'error')
      return
    }
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    if (!allowedExts.includes(ext)) {
      addToast('PDF, JPG, PNG, WEBP 파일만 업로드 가능합니다.', 'error')
      return
    }
    setUploadingCert(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { addToast('로그인이 필요합니다.', 'error'); return }
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadError } = await supabase.storage
        .from('business-certs')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadError) { addToast(`업로드 실패: ${uploadError.message}`, 'error'); return }
      const { data: signed } = await supabase.storage
        .from('business-certs')
        .createSignedUrl(path, 60)
      setBusinessCertUrl(signed?.signedUrl || null)
      setBusinessCertName(file.name)
      setBusinessCertPath(path)
      addToast('사업자등록증이 업로드되었습니다.', 'success')
    } catch (err) {
      addToast('업로드 중 오류가 발생했습니다.', 'error')
      console.error('Cert upload error', err)
    } finally {
      setUploadingCert(false)
      if (certInputRef.current) certInputRef.current.value = ''
    }
  }

  function removeCert() {
    setBusinessCertUrl(null)
    setBusinessCertName(null)
    setBusinessCertPath(null)
  }

  const paidItems = items.filter((item) => item.price > 0)
  const cartTotal = getTotal()
  const [finalAmount, setFinalAmount] = useState<number>(isChatPayment ? (chatAmount ?? 0) : cartTotal)
  const [couponDiscount, setCouponDiscount] = useState<number>(0)
  const [couponCode, setCouponCode] = useState<string | null>(null)

  useEffect(() => {
    // 채팅 결제: 장바구니 비어있어도 통과
    if (!isChatPayment && paidItems.length === 0) {
      router.replace('/cart')
      return
    }
    if (isChatPayment && (!chatAmount || chatAmount <= 0)) {
      addToast('결제 금액이 올바르지 않습니다.', 'error')
      router.replace('/')
      return
    }

    let cancelled = false

    async function initChatPayment() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          const redirectUrl = `/checkout?chat_payment_id=${chatPaymentId}&amount=${chatAmount}&description=${encodeURIComponent(chatDescription ?? '')}`
          router.push(`/auth/login?redirect=${encodeURIComponent(redirectUrl)}`)
          return
        }

        // 채팅 결제: pending 주문 생성 (order_items 없음)
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            total_amount: chatAmount,
            status: 'pending',
            payment_method: 'card',
            coupon_discount: 0,
          })
          .select('id')
          .single()

        if (orderError || !order) {
          addToast('주문 생성에 실패했습니다.', 'error')
          router.replace('/')
          return
        }

        const tossOrderId = `presales_${order.id}_${Date.now()}`
        if (cancelled) return

        setDbOrderId(order.id)
        setOrderId(tossOrderId)
        setFinalAmount(chatAmount ?? 0)

        // 가상계좌 SMS/이메일 발송용 고객 정보 캐시
        const { data: prof } = await supabase
          .from('profiles')
          .select('name, email, phone')
          .eq('id', user.id)
          .maybeSingle()
        customerRef.current = {
          name: prof?.name ?? undefined,
          email: prof?.email ?? user.email ?? undefined,
          phone: prof?.phone ?? undefined,
        }

        const tossPayments = await loadTossPayments(CLIENT_KEY)
        const widgets = tossPayments.widgets({ customerKey: user.id })
        widgetsRef.current = widgets

        await widgets.setAmount({ currency: 'KRW', value: chatAmount ?? 0 })
        await Promise.all([
          widgets.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
          widgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
        ])

        if (!cancelled) {
          setReady(true)
          setLoading(false)
        }
      } catch (err) {
        console.error('[chat checkout init error]', err)
        if (!cancelled) {
          addToast('결제 초기화에 실패했습니다.', 'error')
          setLoading(false)
        }
      }
    }

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
        // 중복 pending 이 있을 경우 .single() 이 throw 하므로 limit(1) + maybeSingle() 로 방어
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

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
          const { error: delItemsError } = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', existingOrder.id)
          if (delItemsError) {
            addToast('기존 주문 상품 정리에 실패했습니다. 다시 시도해주세요.', 'error')
            router.replace('/cart')
            return
          }
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
        const { error: insertItemsError } = await supabase.from('order_items').insert(orderItems)
        if (insertItemsError) {
          addToast('주문 상품 등록에 실패했습니다. 다시 시도해주세요.', 'error')
          router.replace('/cart')
          return
        }

        const tossOrderId = `presales_${order.id}_${Date.now()}`

        if (cancelled) return

        setDbOrderId(order.id)
        setOrderId(tossOrderId)

        // 가상계좌 SMS/이메일 발송용 고객 정보 캐시
        const { data: prof } = await supabase
          .from('profiles')
          .select('name, email, phone')
          .eq('id', user.id)
          .maybeSingle()
        customerRef.current = {
          name: prof?.name ?? undefined,
          email: prof?.email ?? user.email ?? undefined,
          phone: prof?.phone ?? undefined,
        }

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

    if (isChatPayment) {
      initChatPayment()
    } else {
      init()
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCardPayment() {
    if (!widgetsRef.current || !orderId) return

    setPaying(true)
    try {
      const successBase = `${window.location.origin}/checkout/success`
      const successUrl = isChatPayment && chatPaymentId
        ? `${successBase}?chat_payment_id=${encodeURIComponent(chatPaymentId)}`
        : successBase

      const orderName = isChatPayment
        ? (chatDescription ?? '채팅 결제')
        : paidItems.length === 1
          ? paidItems[0].title
          : `${paidItems[0].title} 외 ${paidItems.length - 1}건`

      const customer = customerRef.current
      await widgetsRef.current.requestPayment({
        orderId,
        orderName,
        successUrl,
        failUrl: `${window.location.origin}/checkout/fail`,
        // 가상계좌 선택 시 입금 안내 SMS/이메일, 현금영수증 자동 발급에 사용
        customerName: customer.name,
        customerEmail: customer.email,
        customerMobilePhone: customer.phone?.replace(/[^0-9]/g, '') || undefined,
      })
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string }
      if (error.code === 'USER_CANCEL') {
        setPaying(false)
        return
      }
      console.error('[결제 요청 실패]', error)
      addToast(error.message || '결제 요청에 실패했습니다.', 'error')

      // pending 주문 취소 (실패 시 서버 로그로만 남김 — 사용자 에러 토스트 이미 표시됨)
      if (dbOrderId) {
        const supabase = createClient()
        const { error: cancelErr } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', dbOrderId)
        if (cancelErr) {
          console.error('[checkout] pending 주문 취소 실패:', cancelErr)
        }
      }
      setPaying(false)
    }
  }

  async function handleBankTransferPayment() {
    if (!dbOrderId) return

    setPaying(true)
    try {
      const res = await fetch('/api/payment/bank-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: dbOrderId }),
      })
      const data = await res.json() as {
        success?: boolean
        orderId?: number
        orderNumber?: string
        totalAmount?: number
        bankAccount?: { bank: string; account: string; holder: string }
        error?: string
      }

      if (!res.ok || !data.success) {
        addToast(data.error || '무통장 주문 처리에 실패했습니다.', 'error')
        setPaying(false)
        return
      }

      clearCart()
      // 입금 안내 페이지로 이동
      const params = new URLSearchParams({
        orderId: String(data.orderId),
        orderNumber: data.orderNumber || '',
        amount: String(data.totalAmount),
        bank: data.bankAccount?.bank || '',
        account: data.bankAccount?.account || '',
        holder: data.bankAccount?.holder || '',
      })
      router.push(`/checkout/bank-transfer?${params.toString()}`)
    } catch (err) {
      console.error('[무통장 결제 오류]', err)
      addToast('무통장 주문 처리 중 오류가 발생했습니다.', 'error')
      setPaying(false)
    }
  }

  function handlePayment() {
    if (selectedMethod === 'bank_transfer') {
      handleBankTransferPayment()
    } else {
      handleCardPayment()
    }
  }

  const formatPrice = (price: number) => {
    if (price === 0) return '무료'
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      {isChatPayment ? (
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> 뒤로가기
        </button>
      ) : (
        <Link href="/cart" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> 장바구니로 돌아가기
        </Link>
      )}

      <h1 className="text-2xl font-bold mb-8">결제하기</h1>

      {/* 주문 요약 */}
      <div className="bg-muted/30 rounded-xl p-5 mb-6 space-y-3">
        {isChatPayment ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-blue-700" />
              <h2 className="font-semibold text-sm text-blue-800">채팅 결제 요청</h2>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex-1 mr-4">{chatDescription}</span>
              <span className="font-medium shrink-0">{formatPrice(chatAmount ?? 0)}</span>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
        <div className="border-t pt-3 flex justify-between font-bold text-lg">
          <span>결제 금액</span>
          <span className="text-primary">{formatPrice(finalAmount)}</span>
        </div>
      </div>

      {/* 추가정보 (세금계산서 / 메모) */}
      {!isChatPayment && (
        <div className="mb-6 border border-border/50 rounded-xl overflow-hidden">
          <button onClick={() => setShowExtraInfo(!showExtraInfo)} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <span className="text-sm font-medium">세금계산서 / 추가정보</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showExtraInfo ? 'rotate-180' : ''}`} />
          </button>
          {showExtraInfo && (
            <div className="px-4 pb-4 space-y-4 border-t border-border/50">
              {/* 세금계산서 담당자 정보 */}
              <div className="pt-4">
                <label className="block text-sm font-medium text-foreground mb-1">
                  세금계산서 필요 시 아래 내용 입력 필수
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">담당자 성명, 전화번호, 이메일 주소</p>
                <textarea
                  value={taxContactInfo}
                  onChange={(e) => setTaxContactInfo(e.target.value)}
                  placeholder="예) 홍길동 / 010-1234-5678 / hong@example.com"
                  rows={3}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* 사업자등록증 업로드 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  세금계산서 필요 시 사업자등록증 업로드 필수
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">PDF, JPG, PNG 형식 · 10MB 이하</p>

                <input
                  ref={certInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                  onChange={handleCertUpload}
                  className="hidden"
                />

                {businessCertName ? (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-blue-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{businessCertName}</p>
                        <p className="text-[11px] text-blue-700">업로드 완료</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeCert}
                      className="text-xs text-muted-foreground hover:text-red-500 cursor-pointer shrink-0"
                    >
                      삭제
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => certInputRef.current?.click()}
                    disabled={uploadingCert}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {uploadingCert ? (
                      <>
                        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                        <span className="text-sm text-muted-foreground">업로드 중...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">파일 올리기</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* 무통장 입금 메모 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  무통장 입금 후 빠른 확인을 원하시면 &apos;우측 하단 채널톡&apos; 문의 부탁드립니다.
                </label>
                <input
                  type="text"
                  value={depositMemo}
                  onChange={(e) => setDepositMemo(e.target.value)}
                  placeholder="입금자명 또는 입금 시점을 입력해주세요"
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                />
              </div>

              {/* 카드 결제 메모 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  신용카드 결제의 경우 세금계산서 발행되지 않습니다. 매출전표를 활용하시면 됩니다.
                </label>
                <input
                  type="text"
                  value={cardMemo}
                  onChange={(e) => setCardMemo(e.target.value)}
                  placeholder="메모할 내용이 있으면 입력해주세요 (선택)"
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 결제 수단 선택 (채팅 결제는 카드 결제만 지원) */}
      {!isChatPayment && (
        <div className="mb-6">
          <h2 className="font-semibold text-sm mb-3">결제 수단 선택</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedMethod('card')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors cursor-pointer text-left ${
                selectedMethod === 'card'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <CreditCard className={`w-5 h-5 shrink-0 ${selectedMethod === 'card' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <p className={`text-sm font-semibold ${selectedMethod === 'card' ? 'text-primary' : 'text-foreground'}`}>카드·가상계좌·간편결제</p>
                <p className="text-[11px] text-muted-foreground">가상계좌 선택 시 현금영수증 자동 발급</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMethod('bank_transfer')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors cursor-pointer text-left ${
                selectedMethod === 'bank_transfer'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <Building2 className={`w-5 h-5 shrink-0 ${selectedMethod === 'bank_transfer' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <p className={`text-sm font-semibold ${selectedMethod === 'bank_transfer' ? 'text-primary' : 'text-foreground'}`}>무통장 입금</p>
                <p className="text-[11px] text-muted-foreground">계좌이체·세금계산서</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 무통장 입금 안내 */}
      {!isChatPayment && selectedMethod === 'bank_transfer' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-blue-900 mb-2">무통장 입금 안내</p>
          <ul className="space-y-1 text-xs text-blue-800">
            <li>• 주문 완료 후 안내 이메일로 계좌 정보가 발송됩니다</li>
            <li>• 입금 확인 후 영업일 기준 1~2일 내 파일 이용이 가능합니다</li>
            <li>• 세금계산서 발행이 필요하신 경우 장바구니에서 사업자등록증을 업로드해 주세요</li>
          </ul>
        </div>
      )}

      {/* 토스 결제 위젯 (카드 선택 시 또는 채팅 결제 시 표시) */}
      {(isChatPayment || selectedMethod === 'card') && (
        <>
          {loading && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              결제 수단을 불러오는 중...
            </div>
          )}
          <div id="payment-method" className="mb-4" />
          <div id="agreement" className="mb-6" />
        </>
      )}

      {/* 결제 버튼 */}
      {((!isChatPayment && selectedMethod === 'bank_transfer') || ready) && (
        <button
          onClick={handlePayment}
          disabled={paying}
          className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {paying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              처리 중...
            </>
          ) : !isChatPayment && selectedMethod === 'bank_transfer' ? (
            <>
              <Building2 className="w-5 h-5" />
              {formatPrice(finalAmount)} 무통장 입금 신청
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
        {!isChatPayment && selectedMethod === 'bank_transfer'
          ? '무통장 입금은 입금 확인 후 파일이 제공됩니다'
          : '결제는 토스페이먼츠를 통해 안전하게 처리됩니다'}
      </p>
    </div>
  )
}
