'use client'

import { useState, useEffect, use } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import DOMPurify from 'dompurify'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { type DbProduct, type DbCategory, formatPrice } from '@/lib/types'
import { useCartStore } from '@/stores/cart-store'
import { useToastStore } from '@/stores/toast-store'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, ArrowRight, ShoppingCart, Check, CheckCircle, Download, Play, BookOpen, FileDown, Copy, Share2, Mail, FileText, AlertTriangle, Lightbulb, ShieldCheck, Image as ImageIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { PdfPreviewModal } from '@/components/pdf-preview-modal'
import { ProductReviews } from '@/components/reviews/ProductReviews'
import { FreeToProUpsell } from '@/components/FreeToProUpsell'
import { RecentlyViewed } from '@/components/RecentlyViewed'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import * as gtag from '@/lib/gtag'
import { SITE_URL } from '@/lib/constants'

type TabId = 'info' | 'video' | 'review'

interface ProductFile {
  id: number
  product_id: number
  file_name: string
  file_url: string
  file_size: string | null
  created_at: string
}

function ImagePreviewModal({ images, onClose }: { images: string[]; onClose: () => void }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setCurrent(c => Math.max(0, c - 1))
      if (e.key === 'ArrowRight') setCurrent(c => Math.min(images.length - 1, c + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [images.length, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="relative max-w-5xl w-full mx-4">
        {/* 닫기 */}
        <button onClick={onClose} className="absolute -top-12 right-0 text-white/70 hover:text-white cursor-pointer">
          <X className="w-6 h-6" />
        </button>
        {/* 이미지 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[current]} alt={`미리보기 ${current + 1}`} className="w-full max-h-[80vh] object-contain rounded-lg" />
        {/* 네비게이션 */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setCurrent(c => Math.max(0, c - 1))}
              disabled={current === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrent(c => Math.min(images.length - 1, c + 1))}
              disabled={current === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
              {current + 1} / {images.length}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ProductDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [product, setProduct] = useState<DbProduct | null>(null)
  const [categories, setCategories] = useState<DbCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [related, setRelated] = useState<DbProduct[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('info')
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [hasPurchased, setHasPurchased] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [productFiles, setProductFiles] = useState<ProductFile[]>([])
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showFreeUpsell, setShowFreeUpsell] = useState(false)
  const [matchDiscount, setMatchDiscount] = useState<{
    sourceTitle: string
    discountAmount: number
  } | null>(null)
  const { toggleItem, isInCart } = useCartStore()
  const { addToast } = useToastStore()
  const { addItem: addRecentlyViewed } = useRecentlyViewed()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data }, { data: catData }] = await Promise.all([
        supabase
          .from('products')
          .select('*, categories!products_category_id_fkey(id, name, slug)')
          .eq('id', Number(id))
          .eq('is_published', true)
          .single(),
        supabase.from('categories').select('*').order('sort_order'),
      ])
      setCategories(catData || [])

      if (data) {
        setProduct(data)
        // GA4: product view
        gtag.trackProductView(String(data.id), data.title, data.price ?? undefined)
        // 최근 본 상품 기록
        addRecentlyViewed({ id: data.id, title: data.title, thumbnail_url: data.thumbnail_url, price: data.price })

        // Load product files
        const { data: filesData } = await supabase
          .from('product_files')
          .select('*')
          .eq('product_id', data.id)
          .order('created_at', { ascending: true })
        setProductFiles(filesData || [])

        // Check purchase status (무료 = 로그인만 하면 다운로드, 유료 = 결제 필요)
        const { data: { user } } = await supabase.auth.getUser()
        setIsLoggedIn(!!user)
        if (user) {
          let hasPurchasedThisProduct = false
          if (data.is_free) {
            // 무료 상품: 로그인만 하면 다운로드 가능
            hasPurchasedThisProduct = true
            setHasPurchased(true)
          } else {
            const { data: paidOrders } = await supabase
              .from('orders')
              .select('id, order_items!inner(product_id)')
              .eq('user_id', user.id)
              .eq('status', 'paid')
              .eq('order_items.product_id', data.id)
            hasPurchasedThisProduct = (paidOrders && paidOrders.length > 0) || false
            setHasPurchased(hasPurchasedThisProduct)
          }

          // 할인 매칭 조회: 이 상품이 타겟인 매칭 찾기
          const { data: matches } = await supabase
            .from('product_discount_matches')
            .select('source_product_id, discount_type, discount_amount')
            .eq('target_product_id', Number(id))
            .eq('is_active', true)

          if (matches && matches.length > 0) {
            // 사용자의 구매 이력에서 소스 상품 확인
            const sourceIds = matches.map(m => m.source_product_id)
            const { data: purchasedSources } = await supabase
              .from('orders')
              .select('id, order_items!inner(product_id)')
              .eq('user_id', user.id)
              .eq('status', 'paid')
              .in('order_items.product_id', sourceIds)

            if (purchasedSources && purchasedSources.length > 0) {
              // 매칭되는 소스 상품 찾기
              const purchasedSourceIds = purchasedSources.flatMap(o =>
                o.order_items.map((oi: { product_id: number }) => oi.product_id)
              )
              const applicableMatch = matches.find(m => purchasedSourceIds.includes(m.source_product_id))

              if (applicableMatch) {
                // 소스 상품 이름 조회
                const { data: sourceProduct } = await supabase
                  .from('products')
                  .select('title, price')
                  .eq('id', applicableMatch.source_product_id)
                  .single()

                const discountAmt = applicableMatch.discount_type === 'auto'
                  ? (sourceProduct?.price || 0)
                  : applicableMatch.discount_amount

                // 타겟 상품을 이미 구매했으면 할인 표시 안함
                if (!hasPurchasedThisProduct && discountAmt > 0) {
                  setMatchDiscount({
                    sourceTitle: sourceProduct?.title || '',
                    discountAmount: Math.min(discountAmt, data.price) // 상품 가격 초과 방지
                  })
                }
              }
            }
          }
        }

        // Load related: use related_product_ids if set, otherwise fall back to category matching
        const relatedIds = Array.isArray(data.related_product_ids) && data.related_product_ids.length > 0
          ? data.related_product_ids
          : null

        if (relatedIds) {
          const { data: relatedData } = await supabase
            .from('products')
            .select('*, categories(id, name, slug)')
            .in('id', relatedIds)
            .eq('is_published', true)
          // Preserve the order from related_product_ids
          const relatedMap = new Map((relatedData || []).map(p => [p.id, p]))
          setRelated(relatedIds.map((rid: number) => relatedMap.get(rid)).filter(Boolean) as DbProduct[])
        } else {
          const productCatIds = data.category_ids && data.category_ids.length > 0
            ? data.category_ids
            : data.category_id ? [data.category_id] : []

          if (productCatIds.length > 0) {
            const { data: allPublished } = await supabase
              .from('products')
              .select('*, categories(id, name, slug)')
              .eq('is_published', true)
              .neq('id', data.id)

            const relatedProducts = (allPublished || []).filter((p) => {
              const pCatIds = p.category_ids && p.category_ids.length > 0
                ? p.category_ids
                : p.category_id ? [p.category_id] : []
              return pCatIds.some((cid: number) => productCatIds.includes(cid))
            }).slice(0, 10)
            setRelated(relatedProducts)
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  const canDownload = hasPurchased // 무료든 유료든 로그인+조건 충족 시 true

  async function handleDownload(fileId?: number) {
    if (!product) return
    setDownloading(true)
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, fileId }),
      })
      if (!res.ok) {
        const data = await res.json()
        addToast(data.error || '다운로드 실패', 'error')
        return
      }
      const { url } = await res.json()
      window.open(url, '_blank')
      // GA4: download event
      const ext = (product.format || 'file').toLowerCase()
      gtag.trackDownload(product.title, ext)
      // 로컬 다운로드 카운트 반영 (서버에서 실제 증가 처리됨)
      setProduct(prev => prev ? { ...prev, download_count: (prev.download_count || 0) + 1 } : prev)
      // 무료 상품 다운로드 후 유료 업셀 표시
      if (product.is_free) {
        setTimeout(() => setShowFreeUpsell(true), 1500)
      }
    } catch {
      addToast('다운로드 중 오류가 발생했습니다', 'error')
    } finally {
      setDownloading(false)
    }
  }

  const categoryMap = new Map<number, string>()
  categories.forEach((c) => categoryMap.set(c.id, c.name))

  const getCategoryNames = (p: DbProduct): string[] => {
    if (p.category_ids && p.category_ids.length > 0) {
      return p.category_ids.map((cid) => categoryMap.get(cid) || '').filter(Boolean)
    }
    if (p.categories?.name) return [p.categories.name]
    return ['문서']
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-muted rounded w-40" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="aspect-[4/3] bg-muted rounded-xl" />
            <div className="space-y-4">
              <div className="h-3 bg-muted rounded w-20" />
              <div className="h-8 bg-muted rounded w-full" />
              <div className="h-6 bg-muted rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground text-lg">상품을 찾을 수 없습니다</p>
        <Link href="/store" className="text-primary mt-4 inline-block">스토어로 돌아가기</Link>
      </div>
    )
  }

  const discount = product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0
  const inCart = isInCart(product.id)

  const tabs: { id: TabId; label: string }[] = [
    { id: 'info', label: '상품정보' },
    ...(product.youtube_id ? [{ id: 'video' as TabId, label: '동영상 보기' }] : []),
    { id: 'review', label: '리뷰' },
  ]

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-10">
      <Link href="/store" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-300 mb-8">
        <ArrowLeft className="w-4 h-4" /> 스토어로 돌아가기
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-8 lg:gap-12">
        {/* Left: Image + Preview */}
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-muted flex items-center justify-center border border-border/50 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            {product.thumbnail_url ? (
              <Image src={product.thumbnail_url} alt={product.title} width={400} height={300} className="w-full h-auto object-contain max-h-[500px]" />
            ) : (
              <div className="w-full aspect-[4/3] bg-gradient-to-br from-blue-950 to-blue-800 flex items-center justify-center">
                <FileText className="w-16 h-16 text-blue-200" />
              </div>
            )}
            <Badge className={`absolute top-4 left-4 border font-bold tracking-tight ${product.is_free ? 'bg-primary text-white border-primary' : 'bg-zinc-900 text-white border-zinc-900'}`}>
              {product.is_free ? '무료' : '유료'}
            </Badge>
          </div>

          {/* PDF Preview Button */}
          {product.preview_pdf_url ? (
            <button
              onClick={() => setShowPdfPreview(true)}
              className="w-full bg-card border border-border/50 rounded-2xl py-3 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium text-foreground"
            >
              <BookOpen className="w-4 h-4" />
              문서 미리보기
            </button>
          ) : (product.preview_note || product.format) && (
            <div className="w-full bg-card border border-border/50 rounded-2xl py-3 px-4 text-center">
              <p className="text-sm text-muted-foreground">
                {product.preview_note || (product.is_free ? '무료 다운로드 후 바로 사용 가능합니다' : '구매 후 원본 파일을 다운로드할 수 있습니다')}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">파일 형식: {product.format}</p>
            </div>
          )}

          {/* Image Preview Button */}
          {product.preview_images && product.preview_images.length > 0 && (
            <button
              onClick={() => setShowImagePreview(true)}
              className="w-full bg-card border border-border/50 rounded-2xl py-3 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium text-foreground"
            >
              <ImageIcon className="w-4 h-4" />
              이미지 미리보기
              <span className="text-xs text-muted-foreground">({product.preview_images.length}장)</span>
            </button>
          )}
        </div>

        {/* Right: Info */}
        <div className="space-y-6">
          <div>
            <div className="flex gap-2 flex-wrap mb-2">
              {getCategoryNames(product).map((name) => (
                <span key={name} className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">{name}</span>
              ))}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{product.title}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            {product.is_free ? (
              <span className="text-4xl font-bold text-primary">무료</span>
            ) : (
              <>
                <span className="text-4xl font-bold text-primary">{formatPrice(product.price)}</span>
                {product.original_price > product.price && (
                  <span className="text-xl text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                )}
                {discount > 0 && <Badge className="bg-red-500 text-white border-0 font-bold">-{discount}%</Badge>}
              </>
            )}
          </div>

          {matchDiscount && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                구매 이력 할인 적용 가능!
              </p>
              <p className="text-sm text-blue-800">
                <span className="font-medium">{matchDiscount.sourceTitle}</span>을 이미 구매하셨으므로
              </p>
              <p className="text-lg font-bold text-blue-900 mt-1">
                {formatPrice(matchDiscount.discountAmount)} 할인 → 최종가 {formatPrice(Math.max(0, product.price - matchDiscount.discountAmount))}
              </p>
            </div>
          )}

          {!product.is_free && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800">컨설팅 외주 대비 <span className="font-semibold">1/10 이하 비용</span>으로 동일한 품질의 출발점을 확보하세요.</p>
            </div>
          )}

          <Separator className="my-6" />

          <div className="space-y-2 text-sm divide-y divide-border/50">
            {product.format && (
              <div className="py-2 flex justify-between">
                <p className="text-muted-foreground">파일 형식</p>
                <p className="font-medium">{product.format}</p>
              </div>
            )}
            {product.pages && (
              <div className="py-2 flex justify-between">
                <p className="text-muted-foreground">페이지 수</p>
                <p className="font-medium">{product.pages}p</p>
              </div>
            )}
            {product.file_size && (
              <div className="py-2 flex justify-between">
                <p className="text-muted-foreground">파일 크기</p>
                <p className="font-medium">{product.file_size}</p>
              </div>
            )}
            <div className="py-2 flex justify-between">
              <p className="text-muted-foreground">카테고리</p>
              <p className="font-medium">{getCategoryNames(product).join(', ') || '-'}</p>
            </div>
            <div className="py-2 flex justify-between">
              <p className="text-muted-foreground">다운로드</p>
              <p className="font-medium">{product.download_count}회</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>100% 편집 가능한 원본 파일 · 즉시 다운로드</span>
          </div>

          <Separator className="my-6" />

          {product.description && !product.description_html && (
            <div>
              <h3 className="font-semibold mb-3 tracking-tight">상품 설명</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )}

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
              ))}
            </div>
          )}

          {/* Desktop CTA */}
          <div className="hidden sm:flex gap-3 pt-2">
            {canDownload ? (
              <button
                onClick={() => productFiles.length > 0 ? handleDownload(productFiles[0]?.id) : undefined}
                disabled={downloading || productFiles.length === 0}
                className={`flex-1 h-13 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] disabled:opacity-60 ${productFiles.length === 0 ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-white hover:shadow-[0_8px_30px_rgba(5,150,105,0.3)]'}`}
              >
                <Download className="w-4 h-4" />
                {downloading ? '다운로드 중...' : productFiles.length === 0 ? '파일 준비중' : '다운로드'}
              </button>
            ) : !isLoggedIn && product.is_free ? (
              <Link
                href={`/auth/login?redirect=/store/${id}`}
                className="flex-1 h-13 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 bg-primary text-white hover:shadow-[0_8px_30px_rgba(5,150,105,0.3)] active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                로그인 후 무료 다운로드
              </Link>
            ) : !isLoggedIn && !product.is_free ? (
              <Link
                href={`/auth/login?redirect=/store/${id}`}
                className="flex-1 h-13 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 bg-primary text-white hover:shadow-[0_8px_30px_rgba(5,150,105,0.3)] active:scale-[0.98]"
              >
                <ShoppingCart className="w-4 h-4" />
                로그인 후 구매하기
              </Link>
            ) : (
              <button
                onClick={() => {
                  const wasInCart = inCart
                  const discountedPrice = matchDiscount
                    ? Math.max(0, product.price - matchDiscount.discountAmount)
                    : product.price
                  toggleItem({
                    productId: product.id,
                    title: product.title,
                    price: discountedPrice,
                    originalPrice: product.original_price > 0 ? product.original_price : product.price,
                    thumbnail: product.thumbnail_url || '',
                    format: product.format || '',
                  })
                  addToast(wasInCart ? '장바구니에서 제거되었습니다' : '장바구니에 추가되었습니다', wasInCart ? 'info' : 'success', wasInCart ? undefined : { label: '장바구니 보기', href: '/cart' })
                }}
                className={`flex-1 h-13 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] ${
                  inCart
                    ? 'bg-muted text-muted-foreground border border-border/50'
                    : 'bg-primary text-white hover:shadow-[0_8px_30px_rgba(5,150,105,0.3)]'
                }`}
              >
                {inCart ? <><Check className="w-4 h-4" /> 장바구니에서 빼기</> :
                  <><ShoppingCart className="w-4 h-4" /> 장바구니 담기</>}
              </button>
            )}
          </div>

          {/* PDF 상품 안내 */}
          {product.format?.toLowerCase().includes('pdf') && !product.is_free && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded-xl px-4 py-2.5 text-center leading-relaxed">
              PDF 상품 구매 후 PPT 원본 구매 시 구매금액이 자동 차감됩니다
            </p>
          )}

          {/* Product Files List */}
          {canDownload && productFiles.length > 1 && (
            <div className="border border-border/50 rounded-2xl p-4 space-y-2">
              <h3 className="text-sm font-semibold mb-3 tracking-tight">첨부 파일</h3>
              {productFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-muted/50 transition-colors duration-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{file.file_name}</span>
                    {file.file_size && <span className="text-xs text-muted-foreground shrink-0">({file.file_size})</span>}
                  </div>
                  <button
                    onClick={() => handleDownload(file.id)}
                    disabled={downloading}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-300 shrink-0 ml-2 font-medium"
                  >
                    다운로드
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">디지털 상품 특성상 다운로드 후 환불이 제한될 수 있습니다.</p>
          </div>

          {/* Share buttons */}
          {(() => {
            const pageUrl = typeof window !== 'undefined' ? window.location.href : `${SITE_URL}/store/${id}`
            return (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <span className="text-xs text-muted-foreground font-medium">공유:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pageUrl).then(() => {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    })
                  }}
                  title="링크 복사"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 text-xs font-medium hover:bg-muted transition-all duration-300 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? '복사됨!' : '링크 복사'}
                </button>
                <a
                  href={`https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(pageUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="카카오톡 공유"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 text-xs font-medium hover:bg-muted transition-all duration-300 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  카카오톡
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(product.title)}&body=${encodeURIComponent(pageUrl)}`}
                  title="이메일 공유"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 text-xs font-medium hover:bg-muted transition-all duration-300 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  이메일
                </a>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-14">
        <div className="border-b border-border/50 sticky top-0 bg-background z-10">
          <nav className="flex gap-0 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-6 py-4 min-h-[44px] text-sm font-medium transition-all duration-300 border-b-2 tracking-tight ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="py-8">
          {/* 상품정보 Tab */}
          {activeTab === 'info' && (
            <div className="space-y-10">
              {/* Overview: 핵심 요약 */}
              {(() => {
                const ov = (product.overview ?? {}) as { points?: string[]; summary?: string }
                const points = Array.isArray(ov.points) ? ov.points.filter((p): p is string => typeof p === 'string' && p.trim().length > 0) : []
                const summary = typeof ov.summary === 'string' ? ov.summary.trim() : ''
                if (!summary && points.length === 0) return null
                return (
                  <section className="rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-6">
                    <h3 className="text-sm font-semibold tracking-widest text-blue-600 mb-3">핵심 요약</h3>
                    {summary && <p className="text-[15px] text-slate-700 leading-relaxed mb-4">{summary}</p>}
                    {points.length > 0 && (
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {points.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-[14px] text-slate-700">
                            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })()}

              {/* Features: 주요 특징 */}
              {(() => {
                const ft = (product.features ?? {}) as { items?: { title: string; description?: string }[] }
                const items = Array.isArray(ft.items) ? ft.items.filter((f) => f && typeof f.title === 'string' && f.title.trim().length > 0) : []
                if (items.length === 0) return null
                return (
                  <section>
                    <h3 className="text-lg font-bold tracking-tight mb-4">주요 특징</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {items.map((f, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow">
                          <p className="font-semibold text-slate-900 mb-1">{f.title}</p>
                          {f.description && <p className="text-sm text-slate-600 leading-relaxed">{f.description}</p>}
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })()}

              {product.description_html ? (
                <div
                  className="product-description text-[15px]"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description_html) }}
                />
              ) : product.description ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              ) : null}

              {/* Specs: 상세 스펙 */}
              {(() => {
                const sp = (product.specs ?? {}) as { items?: { label: string; value: string }[] }
                const items = Array.isArray(sp.items) ? sp.items.filter((s) => s && typeof s.label === 'string' && s.label.trim().length > 0) : []
                if (items.length === 0) return null
                return (
                  <section>
                    <h3 className="text-lg font-bold tracking-tight mb-4">상세 스펙</h3>
                    <dl className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                      {items.map((s, i) => (
                        <div key={i} className={`grid grid-cols-[140px_1fr] text-sm ${i !== items.length - 1 ? 'border-b border-slate-100' : ''}`}>
                          <dt className="bg-slate-50 px-4 py-3 font-medium text-slate-600">{s.label}</dt>
                          <dd className="px-4 py-3 text-slate-900">{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )
              })()}

              {/* File Types: 포함 파일 */}
              {(() => {
                const ft = (product.file_types ?? {}) as { items?: string[] }
                const items = Array.isArray(ft.items) ? ft.items.filter((t): t is string => typeof t === 'string' && t.trim().length > 0) : []
                if (items.length === 0) return null
                return (
                  <section>
                    <h3 className="text-lg font-bold tracking-tight mb-3">포함 파일</h3>
                    <div className="flex flex-wrap gap-2">
                      {items.map((t, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">
                          <FileText className="w-3.5 h-3.5" />
                          {t}
                        </span>
                      ))}
                    </div>
                  </section>
                )
              })()}

              {/* 아무것도 없을 때 */}
              {!product.description_html && !product.description && (() => {
                const anyExtra =
                  (product.overview && Object.keys(product.overview).length > 0) ||
                  (product.features && Object.keys(product.features).length > 0) ||
                  (product.specs && Object.keys(product.specs).length > 0) ||
                  (product.file_types && Object.keys(product.file_types).length > 0)
                return anyExtra ? null : (
                  <div className="text-center py-16 text-muted-foreground">
                    <p>등록된 상품 상세 정보가 없습니다.</p>
                  </div>
                )
              })()}
            </div>
          )}

          {/* 동영상 보기 Tab */}
          {activeTab === 'video' && (
            <div>
              {product.youtube_id ? (
                <div className="max-w-3xl mx-auto">
                  <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)]" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${product.youtube_id}`}
                      className="absolute inset-0 w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                    <Play className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">등록된 동영상이 없습니다.</p>
                </div>
              )}
            </div>
          )}

          {/* 리뷰 Tab */}
          {activeTab === 'review' && (
            <ProductReviews productId={product.id} />
          )}
        </div>
      </div>

      {/* 컨설팅 업셀 CTA 배너 — 유료 상품에만 표시 */}
      {product && !product.is_free && (
        <div className="mt-12 rounded-2xl border border-white/20 bg-[#0C1220] p-6 flex flex-col sm:flex-row sm:items-center gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <div className="flex-1 flex gap-4">
            <div className="shrink-0">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="font-semibold text-white mb-1 tracking-tight">이 문서만으로 부족하신가요?</p>
              <p className="text-sm text-white/70">전문 컨설턴트가 귀사에 맞는 맞춤 제안서를 함께 만들어 드립니다.</p>
            </div>
          </div>
          <Link
            href="/consulting"
            className="shrink-0 inline-flex items-center justify-center h-11 px-6 rounded-full bg-primary text-white text-sm font-semibold hover:shadow-[0_8px_30px_rgba(5,150,105,0.4)] transition-all duration-300 active:scale-[0.98]"
          >
            전문가에게 맞춤 제안서 받기 <ArrowRight className="ml-1.5 w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">함께 보면 좋은 상품</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-8">같은 분야의 인기 템플릿</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.slice(0, 4).map((p) => (
              <Link key={p.id} href={`/store/${p.id}`} className="group">
                <div className="border border-border/50 rounded-2xl overflow-hidden bg-card hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500">
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {p.thumbnail_url ? (
                      <Image src={p.thumbnail_url} alt={p.title} width={400} height={300} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-950 to-blue-800 flex items-center justify-center">
                        <FileText className="w-10 h-10 text-blue-200" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2 tracking-tight">{p.title}</h3>
                    <p className={`font-bold mt-2 ${p.is_free ? 'text-primary' : 'text-foreground'}`}>
                      {p.is_free ? '무료' : formatPrice(p.price)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {product.preview_pdf_url && (
        <PdfPreviewModal
          isOpen={showPdfPreview}
          onClose={() => setShowPdfPreview(false)}
          pdfUrl={product.preview_pdf_url}
          previewPages={product.preview_clear_pages || Math.min(15, Math.max(3, Math.ceil((product.pages || 30) * 0.3)))}
          productTitle={product.title}
          price={product.price}
          purchaseLabel={inCart ? '장바구니로 이동' : `장바구니 담기 ${formatPrice(product.price)}`}
          onPurchaseClick={() => {
            setShowPdfPreview(false)
            if (inCart) {
              router.push('/cart')
            } else {
              const discountedPrice = matchDiscount
                ? Math.max(0, product.price - matchDiscount.discountAmount)
                : product.price
              toggleItem({
                productId: product.id,
                title: product.title,
                price: discountedPrice,
                originalPrice: product.original_price > 0 ? product.original_price : product.price,
                thumbnail: product.thumbnail_url || '',
                format: product.format || '',
              })
              addToast('장바구니에 추가되었습니다', 'success', { label: '장바구니 보기', href: '/cart' })
            }
          }}
        />
      )}

      {/* Image Preview Modal */}
      {showImagePreview && product.preview_images && product.preview_images.length > 0 && (
        <ImagePreviewModal
          images={product.preview_images}
          onClose={() => setShowImagePreview(false)}
        />
      )}

      {/* Mobile Sticky CTA */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border/50 p-3 safe-area-pb">
        <div className="flex gap-2">
          {canDownload ? (
            <button
              onClick={() => productFiles.length > 0 ? handleDownload(productFiles[0]?.id) : undefined}
              disabled={downloading || productFiles.length === 0}
              className={`flex-1 h-13 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] disabled:opacity-60 ${productFiles.length === 0 ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-white'}`}
            >
              <Download className="w-4 h-4" />
              {downloading ? '다운로드 중...' : productFiles.length === 0 ? '파일 준비중' : '다운로드'}
            </button>
          ) : !isLoggedIn && product.is_free ? (
            <Link
              href={`/auth/login?redirect=/store/${id}`}
              className="flex-1 h-13 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 bg-primary text-white active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              로그인 후 무료 다운로드
            </Link>
          ) : !isLoggedIn && !product.is_free ? (
            <Link
              href={`/auth/login?redirect=/store/${id}`}
              className="flex-1 h-13 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 bg-primary text-white active:scale-[0.98]"
            >
              <ShoppingCart className="w-4 h-4" />
              로그인 후 구매하기
            </Link>
          ) : (
            <button
              onClick={() => {
                const wasInCart = inCart
                const discountedPrice = matchDiscount
                  ? Math.max(0, product.price - matchDiscount.discountAmount)
                  : product.price
                toggleItem({
                  productId: product.id,
                  title: product.title,
                  price: discountedPrice,
                  originalPrice: product.original_price > 0 ? product.original_price : product.price,
                  thumbnail: product.thumbnail_url || '',
                  format: product.format || '',
                })
                addToast(wasInCart ? '장바구니에서 제거되었습니다' : '장바구니에 추가되었습니다', wasInCart ? 'info' : 'success')
              }}
              className={`flex-1 h-13 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] ${
                inCart
                  ? 'bg-muted text-muted-foreground border border-border/50'
                  : 'bg-primary text-white'
              }`}
            >
              {inCart ? <><Check className="w-4 h-4" /> 장바구니에서 빼기</> :
                <><ShoppingCart className="w-4 h-4" /> {product.is_free ? '무료 받기' : `장바구니 담기`}</>}
            </button>
          )}
          {product.format?.toLowerCase().includes('pdf') && !product.is_free && (
            <p className="text-[10px] text-blue-600 text-center mt-1">PDF 구매 후 PPT 원본 구매 시 금액 자동 차감</p>
          )}
        </div>
      </div>
      {/* Spacer for mobile sticky CTA */}
      <div className="sm:hidden h-24" />

      {/* 최근 본 상품 */}
      <RecentlyViewed />

      {/* 무료→유료 업셀 모달 */}
      {product.is_free && (
        <FreeToProUpsell
          productId={product.id}
          categoryId={product.category_id}
          isOpen={showFreeUpsell}
          onClose={() => setShowFreeUpsell(false)}
        />
      )}
    </div>
  )
}
