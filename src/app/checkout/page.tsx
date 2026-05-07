'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCartStore } from '@/stores/cart-store'
import { createClient } from '@/lib/supabase'
import { useToastStore } from '@/stores/toast-store'
import { ArrowLeft, ShieldCheck, Loader2, CreditCard, Building2, MessageCircle, Upload, Check, Coins, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import {
  clampRewardUseAmount,
  loadRewardBalance,
  loadRewardSettings,
} from '@/lib/reward-points'
import { generateOrderNumber } from '@/lib/utils'

const PURCHASE_HISTORY_DISCOUNT_REASON = '구매 이력 할인'

type PaymentMethod = 'card' | 'bank_transfer'

type DanalClientConfig = {
  enabled: boolean
  provider?: string
}

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
  const [, setLoading] = useState(true)
  const [dbOrderId, setDbOrderId] = useState<number | null>(null)
  const [paying, setPaying] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('bank_transfer')
  const [danalConfig, setDanalConfig] = useState<DanalClientConfig | null>(null)
  const [danalConfigLoaded, setDanalConfigLoaded] = useState(false)
  const cardPaymentsDisabled = !danalConfig?.enabled
  // 다날 가상계좌/현금영수증 SMS/이메일 발송에 필요
  const customerRef = useRef<{ name?: string; email?: string; phone?: string }>({})
  const currentUserIdRef = useRef<string | null>(null)

  // 세금계산서/추가정보
  const [taxInvoiceRequested, setTaxInvoiceRequested] = useState(false)
  const [taxContactInfo, setTaxContactInfo] = useState('')
  const [businessCertUrl, setBusinessCertUrl] = useState<string | null>(null)
  const [businessCertName, setBusinessCertName] = useState<string | null>(null)
  const [businessCertPath, setBusinessCertPath] = useState<string | null>(null)
  const [depositMemo, setDepositMemo] = useState('')
  const [cardMemo, setCardMemo] = useState('')
  const [uploadingCert, setUploadingCert] = useState(false)
  const certInputRef = useRef<HTMLInputElement>(null)

  const paidItems = items.filter((item) => item.price > 0)
  const cartTotal = getTotal()
  const [finalAmount, setFinalAmount] = useState<number>(isChatPayment ? (chatAmount ?? 0) : cartTotal)
  const [couponDiscount, setCouponDiscount] = useState<number>(0)
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [rewardBalance, setRewardBalance] = useState<number>(0)
  const [rewardDiscount, setRewardDiscount] = useState<number>(0)
  const isZeroAmountOrder = !isChatPayment && finalAmount <= 0

  useEffect(() => {
    let cancelled = false

    async function loadDanalConfig() {
      try {
        const res = await fetch('/api/payment/danal/config', { cache: 'no-store' })
        const config = await res.json() as DanalClientConfig
        if (cancelled) return
        setDanalConfig(config)
        setSelectedMethod(config.enabled ? 'card' : 'bank_transfer')
      } catch (err) {
        console.error('[checkout] Danal config load failed', err)
        if (!cancelled) {
          setDanalConfig({ enabled: false })
          setSelectedMethod('bank_transfer')
        }
      } finally {
        if (!cancelled) setDanalConfigLoaded(true)
      }
    }

    loadDanalConfig()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (cardPaymentsDisabled && selectedMethod === 'card') {
      setSelectedMethod('bank_transfer')
    }
  }, [cardPaymentsDisabled, selectedMethod])

  useEffect(() => {
    if (isZeroAmountOrder && taxInvoiceRequested) {
      setTaxInvoiceRequested(false)
    }
  }, [isZeroAmountOrder, taxInvoiceRequested])

  // 세션 복원 (세금계산서 정보)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('presales-tax-info')
      if (raw) {
        const data = JSON.parse(raw)
        setTaxInvoiceRequested(Boolean(data.tax_invoice_requested || data.tax_contact_info || data.business_cert_path))
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
      tax_invoice_requested: taxInvoiceRequested,
      business_cert_url: businessCertUrl,
      business_cert_name: businessCertName,
      business_cert_path: businessCertPath,
      deposit_memo: depositMemo,
      card_memo: cardMemo,
    }
    sessionStorage.setItem('presales-tax-info', JSON.stringify(data))
  }, [taxContactInfo, taxInvoiceRequested, businessCertUrl, businessCertName, businessCertPath, depositMemo, cardMemo])

  useEffect(() => {
    saveTaxInfo()
  }, [saveTaxInfo])

  function getAdditionalInfoPayload(method: PaymentMethod) {
    const hasPayableAmount = isChatPayment || finalAmount > 0
    const wantsTaxInvoice = hasPayableAmount && method === 'bank_transfer' && taxInvoiceRequested
    return {
      tax_contact_info: wantsTaxInvoice ? taxContactInfo.trim() : null,
      business_cert_url: wantsTaxInvoice ? businessCertPath : null,
      business_cert_name: wantsTaxInvoice ? businessCertName : null,
      deposit_memo: hasPayableAmount && method === 'bank_transfer' ? depositMemo.trim() || null : null,
      card_memo: hasPayableAmount && method === 'card' ? cardMemo.trim() || null : null,
    }
  }

  function validateAdditionalInfo(method: PaymentMethod) {
    const hasPayableAmount = isChatPayment || finalAmount > 0
    if (!hasPayableAmount) return true

    if (method === 'card' && taxInvoiceRequested) {
      addToast('신용카드 결제는 세금계산서가 발행되지 않습니다. 세금계산서가 필요하면 무통장 입금을 선택해주세요.', 'error')
      return false
    }
    if (method === 'bank_transfer' && taxInvoiceRequested) {
      if (!taxContactInfo.trim()) {
        addToast('세금계산서 담당자 성명, 전화번호, 이메일 주소를 입력해주세요.', 'error')
        return false
      }
      if (!businessCertPath) {
        addToast('세금계산서 발행을 위해 사업자등록증을 업로드해주세요.', 'error')
        return false
      }
    }
    return true
  }

  async function persistAdditionalInfo(method: PaymentMethod) {
    if (!dbOrderId) return true
    if (!validateAdditionalInfo(method)) return false

    const supabase = createClient()
    let query = supabase
      .from('orders')
      .update(getAdditionalInfoPayload(method))
      .eq('id', dbOrderId)
    if (currentUserIdRef.current) query = query.eq('user_id', currentUserIdRef.current)
    const { error } = await query
    if (error) {
      addToast(`추가정보 저장 실패: ${error.message}`, 'error')
      return false
    }
    return true
  }

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

  useEffect(() => {
    if (!danalConfigLoaded) return

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
        currentUserIdRef.current = user.id

        if (cardPaymentsDisabled) {
          addToast('상담 결제는 메시지로 문의주세요.', 'error')
          setLoading(false)
          return
        }

        // 채팅 결제: pending 주문 생성 (order_items 없음)
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: generateOrderNumber(),
            user_id: user.id,
            total_amount: chatAmount,
            status: 'pending',
            payment_method: 'card',
            coupon_discount: 0,
            reward_discount: 0,
          })
          .select('id')
          .single()

        if (orderError || !order) {
          addToast('주문 생성에 실패했습니다.', 'error')
          router.replace('/')
          return
        }

        if (cancelled) return

        setDbOrderId(order.id)
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
        currentUserIdRef.current = user.id

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

        // 할인 매칭 서버사이드 재검증 — 사용자가 실제 낸 금액 기반 (쿠폰 안분 반영)
        const { data: userPaidOrders } = await supabase
          .from('orders')
          .select('id, coupon_discount, order_items(product_id, price)')
          .eq('user_id', user.id)
          .in('status', ['paid', 'completed'])

        // source_product_id → 사용자가 실제로 낸 최대 금액
        //   order_items.price (번들할인 후·쿠폰 전) 에서
        //   orders.coupon_discount 를 아이템 가격 비율로 안분해 뺀 값
        const sourceEffectivePaid = new Map<number, number>()
        for (const o of (userPaidOrders ?? []) as Array<{
          coupon_discount: number | null
          order_items: Array<{ product_id: number; price: number }> | null
        }>) {
          const orderItems = o.order_items ?? []
          if (orderItems.length === 0) continue
          const sumPrice = orderItems.reduce((acc, it) => acc + Number(it.price ?? 0), 0)
          const coupon = Math.max(0, Number(o.coupon_discount ?? 0))
          for (const it of orderItems) {
            const p = Number(it.price ?? 0)
            if (p <= 0) continue
            const share = sumPrice > 0 ? Math.floor((coupon * p) / sumPrice) : 0
            const effective = Math.max(0, p - share)
            const prev = sourceEffectivePaid.get(it.product_id) ?? 0
            if (effective > prev) sourceEffectivePaid.set(it.product_id, effective)
          }
        }
        const userPurchasedIds = Array.from(sourceEffectivePaid.keys())

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
            // 각 상품별 할인 계산
            for (const item of paidItems) {
              const itemMatches = activeMatches.filter(m => m.target_product_id === item.productId)
              let applicableDiscount = 0
              let appliedSourceId: number | null = null

              for (const match of itemMatches) {
                const discount = match.discount_type === 'auto'
                  ? (sourceEffectivePaid.get(match.source_product_id) ?? 0)
                  : Number(match.discount_amount ?? 0)
                if (discount > applicableDiscount) {
                  applicableDiscount = discount
                  appliedSourceId = match.source_product_id
                }
              }

              const dbProduct = validProducts.find(p => p.id === item.productId)
              const originalPrice = dbProduct?.price || 0
              const discountedPrice = Math.max(0, originalPrice - applicableDiscount)
              expectedTotalAmount += discountedPrice

              if (applicableDiscount > 0 && appliedSourceId !== null) {
                itemDiscountMap.set(item.productId, {
                  originalPrice,
                  discountAmount: applicableDiscount,
                  discountReason: PURCHASE_HISTORY_DISCOUNT_REASON,
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

        // 2.6. 적립금 적용 (쿠폰까지 적용된 최종 할인 전 금액에서 차감)
        let appliedRewardDiscount = 0
        const rawReward = typeof window !== 'undefined' ? sessionStorage.getItem('presales-reward-use') : null
        if (rawReward) {
          const requestedReward = Math.max(0, Math.floor(Number(rawReward) || 0))
          if (requestedReward > 0) {
            const [rewardSettings, currentRewardBalance] = await Promise.all([
              loadRewardSettings(supabase),
              loadRewardBalance(supabase, user.id),
            ])
            appliedRewardDiscount = clampRewardUseAmount(
              requestedReward,
              currentRewardBalance,
              expectedTotalAmount,
              rewardSettings,
            )
            setRewardBalance(currentRewardBalance)
            expectedTotalAmount = Math.max(0, expectedTotalAmount - appliedRewardDiscount)
          }
        } else {
          const currentRewardBalance = await loadRewardBalance(supabase, user.id)
          setRewardBalance(currentRewardBalance)
        }

        // 서버 재계산이 최종 결제 금액. 클라이언트가 조작했더라도 무관.
        setFinalAmount(expectedTotalAmount)
        setCouponDiscount(appliedCouponInfo?.coupon_discount || 0)
        setCouponCode(appliedCouponInfo?.code || null)
        setRewardDiscount(appliedRewardDiscount)

        // 세금계산서/추가정보 (cart 에서 sessionStorage 에 저장됨)
        let taxInfo: {
          tax_contact_info?: string
          tax_invoice_requested?: boolean
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

        const hasPayableAmount = expectedTotalAmount > 0
        const wantsTaxInvoice = hasPayableAmount && Boolean(taxInfo.tax_invoice_requested)
        const draftPaymentMethod = hasPayableAmount
          ? (cardPaymentsDisabled ? 'bank_transfer' : 'card')
          : appliedRewardDiscount > 0
            ? 'reward'
            : 'discount'
        const orderUpdateFields = {
          total_amount: expectedTotalAmount,
          coupon_id: appliedCouponInfo?.id ?? null,
          coupon_code: appliedCouponInfo?.code ?? null,
          coupon_discount: appliedCouponInfo?.coupon_discount ?? 0,
          reward_discount: appliedRewardDiscount,
          tax_contact_info: wantsTaxInvoice ? taxInfo.tax_contact_info || null : null,
          business_cert_url: wantsTaxInvoice ? taxInfo.business_cert_path || null : null,
          business_cert_name: wantsTaxInvoice ? taxInfo.business_cert_name || null : null,
          deposit_memo: hasPayableAmount ? taxInfo.deposit_memo || null : null,
          card_memo: hasPayableAmount ? taxInfo.card_memo || null : null,
          payment_method: draftPaymentMethod,
        }

        // 2. 주문 생성 (pending 상태)
        // 기존 pending 주문의 order_items 삭제가 RLS로 no-op 될 수 있어 재사용하지 않는다.
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: generateOrderNumber(),
            user_id: user.id,
            ...orderUpdateFields,
            status: 'pending',
          })
          .select('id')
          .single()

        if (orderError || !order) {
          addToast('주문 생성에 실패했습니다.', 'error')
          router.replace('/cart')
          return
        }

        // 주문 상품 등록 (할인 메타 포함)
        const productPriceMap = new Map(validProducts.map((product) => [product.id, Number(product.price)]))
        const orderItems = paidItems.map((item) => {
          const discount = itemDiscountMap.get(item.productId)
          const originalPrice = discount?.originalPrice ?? productPriceMap.get(item.productId) ?? item.price
          const unitPrice = Math.max(0, originalPrice - (discount?.discountAmount ?? 0))
          return {
            order_id: order.id,
            product_id: item.productId,
            price: unitPrice,
            original_price: originalPrice,
            discount_amount: discount?.discountAmount ?? 0,
            discount_reason: discount?.discountReason ?? null,
            discount_source_product_id: discount?.discountSourceProductId ?? null,
          }
        })
        const { error: insertItemsError } = await supabase.from('order_items').insert(orderItems)
        if (insertItemsError) {
          console.error('[checkout] order_items insert failed', {
            code: insertItemsError.code,
            message: insertItemsError.message,
            details: insertItemsError.details,
            hint: insertItemsError.hint,
          })
          addToast('주문 상품 등록에 실패했습니다. 다시 시도해주세요.', 'error')
          router.replace('/cart')
          return
        }

        if (cancelled) return

        setDbOrderId(order.id)

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

        if (expectedTotalAmount <= 0) {
          setReady(true)
          setLoading(false)
          return
        }

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
  }, [danalConfigLoaded])

  async function handleCardPayment() {
    if (cardPaymentsDisabled) {
      addToast('현재 선택할 수 없는 결제 수단입니다. 무통장 입금을 선택해주세요.', 'error')
      setSelectedMethod('bank_transfer')
      return
    }
    if (finalAmount <= 0) {
      await handleZeroAmountPayment()
      return
    }
    if (!dbOrderId) return
    if (!(await persistAdditionalInfo('card'))) return

    setPaying(true)
    try {
      const res = await fetch('/api/payment/danal/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: dbOrderId, chatPaymentId }),
      })
      const data = await res.json() as {
        startUrl?: string
        startParams?: string
        error?: string
        code?: string
      }
      if (!res.ok || !data.startUrl || !data.startParams) {
        addToast(data.error || '다날 결제창 생성에 실패했습니다.', 'error')
        setPaying(false)
        return
      }

      const form = document.createElement('form')
      form.method = 'POST'
      form.action = data.startUrl
      form.acceptCharset = 'EUC-KR'
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'STARTPARAMS'
      input.value = data.startParams
      form.appendChild(input)
      document.body.appendChild(form)
      form.submit()
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string }
      console.error('[결제 요청 실패]', error)
      addToast(error.message || '결제 요청에 실패했습니다.', 'error')

      // pending 주문 취소 (실패 시 서버 로그로만 남김 — 사용자 에러 토스트 이미 표시됨)
      const currentUserId = currentUserIdRef.current
      if (dbOrderId && currentUserId) {
        const supabase = createClient()
        const { error: cancelErr } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', dbOrderId)
          .eq('user_id', currentUserId)
        if (cancelErr) {
          console.error('[checkout] pending 주문 취소 실패:', cancelErr)
        }
      }
      setPaying(false)
    }
  }

  async function handleBankTransferPayment() {
    if (!dbOrderId) return
    if (!(await persistAdditionalInfo('bank_transfer'))) return

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

  async function handleZeroAmountPayment() {
    if (!dbOrderId) return
    if (!(await persistAdditionalInfo('bank_transfer'))) return

    setPaying(true)
    try {
      const res = await fetch('/api/payment/reward-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: dbOrderId }),
      })
      const data = await res.json() as { success?: boolean; orderId?: number; error?: string }
      if (!res.ok || !data.success) {
        addToast(data.error || '적립금 주문 처리에 실패했습니다.', 'error')
        setPaying(false)
        return
      }
      clearCart()
      sessionStorage.removeItem('presales-applied-coupon')
      sessionStorage.removeItem('presales-reward-use')
      addToast('주문이 완료되었습니다. 나의콘솔에서 다운로드하세요.', 'success')
      router.push(`/checkout/success?orderId=${data.orderId}`)
    } catch (err) {
      console.error('[0원 주문 처리 오류]', err)
      addToast('0원 주문 처리 중 오류가 발생했습니다.', 'error')
      setPaying(false)
    }
  }

  function handlePayment() {
    if (!isChatPayment && finalAmount <= 0) {
      handleZeroAmountPayment()
    } else if (selectedMethod === 'bank_transfer') {
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
            {rewardDiscount > 0 && (
              <div className="flex justify-between text-sm text-blue-700">
                <span className="inline-flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" />
                  적립금 사용
                </span>
                <span>-{formatPrice(rewardDiscount)}</span>
              </div>
            )}
            {rewardBalance > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>남은 적립금</span>
                <span>{formatPrice(Math.max(0, rewardBalance - rewardDiscount))}</span>
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
        <section className="mb-6 rounded-2xl border border-border/50 bg-card p-5">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-foreground">추가정보 입력</h2>
            <div className="mt-4 border-l-4 border-primary bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              아래 내용 해당 시 확인 바랍니다
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm font-semibold text-foreground">
              <input
                type="checkbox"
                checked={!isZeroAmountOrder && taxInvoiceRequested}
                onChange={(event) => setTaxInvoiceRequested(event.target.checked)}
                disabled={isZeroAmountOrder}
                className="h-4 w-4 rounded border-border text-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              />
              세금계산서 발행 필요
              {isZeroAmountOrder ? (
                <span className="ml-auto text-xs font-medium text-muted-foreground">0원 주문 시 발행 대상 아님</span>
              ) : selectedMethod === 'card' && (
                <span className="ml-auto text-xs font-medium text-muted-foreground">카드 결제 시 선택 불가</span>
              )}
            </label>

            {isZeroAmountOrder ? (
              <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <Coins className="mt-0.5 h-4 w-4 shrink-0" />
                <p>할인 또는 적립금 적용으로 추가 결제금액이 없어 세금계산서 발행 대상이 아닙니다. 주문 완료 후 바로 다운로드할 수 있습니다.</p>
              </div>
            ) : selectedMethod === 'card' && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>신용카드 결제의 경우 세금계산서가 발행되지 않습니다. 매출전표를 활용하시면 됩니다.</p>
              </div>
            )}

            {/* 세금계산서 담당자 정보 */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  세금계산서 필요 시 아래 내용 입력 필수
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">담당자 성명, 전화번호, 이메일 주소</p>
                <textarea
                  value={taxContactInfo}
                  onChange={(e) => setTaxContactInfo(e.target.value)}
                  disabled={isZeroAmountOrder || !taxInvoiceRequested || selectedMethod === 'card'}
                  placeholder="내용을 입력해주세요."
                  rows={3}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all resize-none disabled:bg-muted/40 disabled:text-muted-foreground"
                />
              </div>

              {/* 사업자등록증 업로드 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  세금계산서 필요 시 사업자등록증 업로드 필수
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">사업자등록증 업로드 해주세요. PDF, JPG, PNG 형식 · 10MB 이하</p>

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
                    disabled={isZeroAmountOrder || uploadingCert || !taxInvoiceRequested || selectedMethod === 'card'}
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
              {selectedMethod === 'bank_transfer' && !isZeroAmountOrder && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  무통장 입금 후 빠른 확인을 원하시면 우측 하단 메시지로 문의주세요.
                </label>
                <input
                  type="text"
                  value={depositMemo}
                  onChange={(e) => setDepositMemo(e.target.value)}
                  placeholder="입금자명 또는 입금 시점을 입력해주세요"
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                />
              </div>
              )}

              {/* 카드 결제 메모 */}
              {selectedMethod === 'card' && !isZeroAmountOrder && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  카드 결제 메모
                </label>
                <input
                  type="text"
                  value={cardMemo}
                  onChange={(e) => setCardMemo(e.target.value)}
                  placeholder="메모할 내용이 있으면 입력해주세요 (선택)"
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                />
              </div>
              )}
            </div>
        </section>
      )}

      {/* 결제 수단 선택 (채팅 결제는 카드 결제만 지원) */}
      {!isChatPayment && !isZeroAmountOrder && (
        <div className="mb-6">
          <h2 className="font-semibold text-sm mb-3">결제 수단 선택</h2>
          <div className={`grid gap-3 ${cardPaymentsDisabled ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {!cardPaymentsDisabled && (
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
                  <p className={`text-sm font-semibold ${selectedMethod === 'card' ? 'text-primary' : 'text-foreground'}`}>카드·간편결제</p>
                  <p className="text-[11px] text-muted-foreground">다날페이 카드 결제창</p>
                </div>
              </button>
            )}
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
      {!isChatPayment && !isZeroAmountOrder && selectedMethod === 'bank_transfer' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-blue-900 mb-2">무통장 입금 안내</p>
          <ul className="space-y-1 text-xs text-blue-800">
            <li>• 주문 완료 후 안내 이메일로 계좌 정보가 발송됩니다</li>
            <li>• 입금 확인 후 관리자가 승인하면 나의콘솔에서 다운로드가 가능합니다</li>
            <li>• 세금계산서 발행이 필요하신 경우 위 추가정보에서 담당자 정보와 사업자등록증을 등록해 주세요</li>
          </ul>
        </div>
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
          ) : !isChatPayment && finalAmount <= 0 ? (
            <>
              <Coins className="w-5 h-5" />
              0원 주문 완료
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
        {isZeroAmountOrder
          ? '0원 주문은 주문 완료 후 바로 파일이 제공됩니다'
          : !isChatPayment && selectedMethod === 'bank_transfer'
          ? '무통장 입금은 입금 확인 후 파일이 제공됩니다'
          : '결제는 다날 PG를 통해 안전하게 처리됩니다'}
      </p>
    </div>
  )
}
