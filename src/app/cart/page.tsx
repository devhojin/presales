'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cart-store'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, Trash2, X, ArrowLeft, Gift, Sparkles, FileText, Upload, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useToastStore } from '@/stores/toast-store'
import * as gtag from '@/lib/gtag'

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
  const { items, removeItem, clearCart, getTotal, getDiscountTotal } = useCartStore()
  const { addToast } = useToastStore()
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

  // 세금계산서/추가정보 입력 상태
  const [taxContactInfo, setTaxContactInfo] = useState('')
  const [businessCertUrl, setBusinessCertUrl] = useState<string | null>(null)
  const [businessCertName, setBusinessCertName] = useState<string | null>(null)
  const [businessCertPath, setBusinessCertPath] = useState<string | null>(null)
  const [depositMemo, setDepositMemo] = useState('')
  const [cardMemo, setCardMemo] = useState('')
  const [uploadingCert, setUploadingCert] = useState(false)
  const certInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()

  // 세션 복원
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
  useEffect(() => {
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

  function getCouponDiscount() {
    if (!appliedCoupon) return 0
    const cartTotal = getTotal()
    if (appliedCoupon.discount_type === 'percentage') {
      return Math.floor((cartTotal * appliedCoupon.discount_value) / 100)
    }
    return Math.min(appliedCoupon.discount_value, cartTotal)
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
      if (!user) {
        addToast('로그인이 필요합니다.', 'error')
        return
      }
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadError } = await supabase.storage
        .from('business-certs')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        addToast(`업로드 실패: ${uploadError.message}`, 'error')
        return
      }

      // 60초 서명 URL (관리자는 언제든 새로 생성)
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

  function applyOwnedCoupon(coupon: OwnedCoupon) {
    const cartTotal = getTotal()
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
      const cartTotal = getTotal()
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
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-medium">
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

          {/* 쿠폰 선택/입력 */}
          <div className="border border-border/50 rounded-2xl p-5 bg-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">쿠폰 사용</h3>
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
                  const cartTotal = getTotal()
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

          {/* 추가정보 입력 (세금계산서/사업자등록증/무통장/카드 메모) */}
          <div className="border border-border/50 rounded-2xl p-5 bg-card">
            <h3 className="text-sm font-semibold mb-3">추가정보 입력</h3>

            <div className="border-l-4 border-blue-400 bg-blue-50/50 px-4 py-2 rounded-r-lg mb-5">
              <p className="text-xs text-foreground">아래 내용 해당 시 확인 바랍니다</p>
            </div>

            {/* 세금계산서 담당자 정보 */}
            <div className="mb-5">
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
            <div className="mb-5">
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
            <div className="mb-5">
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
                <div className="flex justify-between text-blue-700 font-medium">
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
                        addToast('주문이 완료되었습니다! 나의콘솔에서 다운로드하세요.', 'success')
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
