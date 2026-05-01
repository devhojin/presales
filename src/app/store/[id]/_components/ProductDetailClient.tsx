'use client'

import { useState, useEffect, use } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import DOMPurify from 'dompurify'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { type DbProduct, type DbCategory } from '@/lib/types'
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
import { shareToKakao } from '@/lib/kakao-share'
import { buildProductTagSearchHref } from '@/lib/product-tags'
import { formatProductFileSize, formatProductFileTypes, normalizeProductFileSizeBytes, summarizeProductFiles } from '@/lib/product-file-metadata'

type TabId = 'info' | 'video' | 'review'

interface ProductFile {
  id: number
  product_id: number
  file_name: string
  file_url: string
  file_size: number | string | null
  created_at: string
}

interface FeatureItem {
  title: string
  description?: string
}

interface SpecItem {
  label: string
  value: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStringList(value: unknown, objectKey = 'items'): string[] {
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean)
  }

  if (isRecord(value)) {
    const items = value[objectKey] ?? value.items ?? value.points
    if (Array.isArray(items)) return items.map(cleanText).filter(Boolean)
  }

  return []
}

function normalizeFeatures(value: unknown): FeatureItem[] {
  const source = isRecord(value) && Array.isArray(value.items) ? value.items : value
  if (!Array.isArray(source)) return []

  return source
    .map((item): FeatureItem | null => {
      if (typeof item === 'string') {
        const title = item.trim()
        return title ? { title } : null
      }
      if (!isRecord(item)) return null
      const title = cleanText(item.title)
      const description = cleanText(item.description)
      return title ? { title, ...(description ? { description } : {}) } : null
    })
    .filter((item): item is FeatureItem => item !== null)
}

function normalizeSpecs(value: unknown): SpecItem[] {
  const source = isRecord(value) && Array.isArray(value.items) ? value.items : value
  if (!Array.isArray(source)) return []

  return source
    .map((item): SpecItem | null => {
      if (typeof item === 'string') {
        const [label, ...rest] = item.split(':')
        const value = rest.join(':').trim()
        return label.trim() && value ? { label: label.trim(), value } : null
      }
      if (!isRecord(item)) return null
      const label = cleanText(item.label)
      const value = cleanText(item.value)
      return label && value ? { label, value } : null
    })
    .filter((item): item is SpecItem => item !== null)
}

function normalizeOverview(value: unknown, fallbackSummary: string | null) {
  const points = normalizeStringList(value, 'points')
  const summary = isRecord(value) ? cleanText(value.summary) : ''
  return {
    summary: summary || cleanText(fallbackSummary),
    points,
  }
}

function normalizeFileTypes(value: unknown, format: string | null): string[] {
  const fromField = normalizeStringList(value)
  if (fromField.length > 0) return fromField
  if (!format) return []

  const found = new Set<string>()
  const upper = format.toUpperCase()
  for (const type of ['PPTX', 'PPT', 'PDF', 'XLSX', 'XLS', 'DOCX', 'DOC', 'HWP', 'ZIP']) {
    if (upper.includes(type)) {
      found.add(type)
    }
  }
  return Array.from(found)
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
  const [sharingKakao, setSharingKakao] = useState(false)
  const [showFreeUpsell, setShowFreeUpsell] = useState(false)
  const [matchDiscount, setMatchDiscount] = useState<{
    sourceProductId: number
    sourceTitle: string
    discountAmount: number
  } | null>(null)
  const { toggleItem, isInCart } = useCartStore()
  const { addToast } = useToastStore()
  const { addItem: addRecentlyViewed } = useRecentlyViewed()

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (tab === 'review') setActiveTab('review')
  }, [])

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
              .in('status', ['paid', 'completed'])
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
            // 사용자의 결제 이력 (쿠폰 안분용으로 주문 전체 아이템·coupon_discount 조회)
            const sourceIds = matches.map(m => m.source_product_id)
            const { data: paidOrders } = await supabase
              .from('orders')
              .select('id, coupon_discount, order_items(product_id, price)')
              .eq('user_id', user.id)
              .in('status', ['paid', 'completed'])

            // source_product_id → 사용자가 실제 낸 최대 금액 (쿠폰 안분 반영)
            const sourceEffectivePaid = new Map<number, number>()
            for (const o of (paidOrders ?? []) as Array<{
              coupon_discount: number | null
              order_items: Array<{ product_id: number; price: number }> | null
            }>) {
              const items = o.order_items ?? []
              if (items.length === 0) continue
              const sumPrice = items.reduce((acc, it) => acc + Number(it.price ?? 0), 0)
              const coupon = Math.max(0, Number(o.coupon_discount ?? 0))
              for (const it of items) {
                const p = Number(it.price ?? 0)
                if (p <= 0) continue
                const share = sumPrice > 0 ? Math.floor((coupon * p) / sumPrice) : 0
                const effective = Math.max(0, p - share)
                const prev = sourceEffectivePaid.get(it.product_id) ?? 0
                if (effective > prev) sourceEffectivePaid.set(it.product_id, effective)
              }
            }

            // 매칭되는 소스 상품 중 가장 큰 할인 제공 매치 찾기
            let bestMatch: { source_product_id: number; discount: number } | null = null
            for (const m of matches) {
              if (!sourceEffectivePaid.has(m.source_product_id)) continue
              if (!sourceIds.includes(m.source_product_id)) continue
              const discount = m.discount_type === 'auto'
                ? (sourceEffectivePaid.get(m.source_product_id) ?? 0)
                : Number(m.discount_amount ?? 0)
              if (!bestMatch || discount > bestMatch.discount) {
                bestMatch = { source_product_id: m.source_product_id, discount }
              }
            }

            if (bestMatch && !hasPurchasedThisProduct && bestMatch.discount > 0) {
              // 소스 상품 이름 조회 (표기용)
              const { data: sourceProduct } = await supabase
                .from('products')
                .select('title')
                .eq('id', bestMatch.source_product_id)
                .single()
              setMatchDiscount({
                sourceProductId: bestMatch.source_product_id,
                sourceTitle: sourceProduct?.title || '',
                discountAmount: Math.min(bestMatch.discount, data.price), // 상품 가격 초과 방지
              })
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
  }, [id, addRecentlyViewed])

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
      const ext = (summarizeProductFiles(productFiles).format || product.format || 'file').toLowerCase()
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

  async function copyShareUrl(pageUrl: string) {
    try {
      await navigator.clipboard.writeText(pageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return true
    } catch {
      return false
    }
  }

  function getAbsoluteUrl(value: string | null | undefined, baseUrl: string) {
    if (!value) return undefined
    try {
      return new URL(value, baseUrl).toString()
    } catch {
      return undefined
    }
  }

  async function handleKakaoShare(pageUrl: string) {
    if (!product || sharingKakao) return

    setSharingKakao(true)
    try {
      const result = await shareToKakao({
        javascriptKey: process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY,
        url: pageUrl,
        title: product.title,
        description: overview.summary || product.description || '프리세일즈 공공조달 제안서 상품을 확인해보세요.',
        imageUrl: getAbsoluteUrl(product.thumbnail_url, pageUrl),
      })

      if (result === 'missing-key') {
        const copiedLink = await copyShareUrl(pageUrl)
        addToast(
          copiedLink
            ? '카카오 공유 설정이 없어 링크를 복사했습니다'
            : '카카오 공유 설정이 필요합니다',
          copiedLink ? 'info' : 'error'
        )
      }
    } catch {
      const copiedLink = await copyShareUrl(pageUrl)
      addToast(
        copiedLink
          ? '카카오톡 공유를 열지 못해 링크를 복사했습니다'
          : '카카오톡 공유를 열지 못했습니다',
        copiedLink ? 'info' : 'error'
      )
    } finally {
      setSharingKakao(false)
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

  const inCart = isInCart(product.id)
  const categoryNames = getCategoryNames(product)
  const overview = normalizeOverview(product.overview, product.description)
  const featureItems = normalizeFeatures(product.features)
  const specItems = normalizeSpecs(product.specs)
  const fileSummary = summarizeProductFiles(productFiles)
  const savedFileTypeItems = normalizeFileTypes(product.file_types, product.format)
  const fileTypeItems = savedFileTypeItems.length > 0 ? savedFileTypeItems : fileSummary.fileTypes
  const displayFormat = formatProductFileTypes(fileTypeItems) || fileSummary.format || product.format || ''
  const displayFileSize = fileSummary.fileSize || product.file_size || ''
  const hasPageCountCandidate = fileSummary.fileTypes.some((type) => type === 'PDF' || type === 'PPTX' || type === 'PPT')
  const displayPages = product.pages && (product.preview_pdf_url || productFiles.length === 0 || hasPageCountCandidate)
    ? product.pages
    : null
  const hasDetailContent =
    Boolean(overview.summary) ||
    overview.points.length > 0 ||
    featureItems.length > 0 ||
    specItems.length > 0 ||
    fileTypeItems.length > 0 ||
    Boolean(product.description_html || product.description)
  const productSerial = String(product.id).padStart(3, '0')
  const productIntroImageUrl = Array.isArray(product.preview_images)
    ? product.preview_images.find((url) => url.includes('/preview-images/original-intros/')) ?? null
    : null

  const tabs: { id: TabId; label: string }[] = [
    { id: 'info', label: '상품정보' },
    ...(product.youtube_id ? [{ id: 'video' as TabId, label: '동영상 보기' }] : []),
    { id: 'review', label: '리뷰' },
  ]

  return (
    <div className="bg-[linear-gradient(180deg,#FAFAF9_0%,#F7F8FA_46%,#FAFAF9_100%)]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-12">
      <Link href="/store" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-white/80 text-sm text-muted-foreground shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur hover:text-foreground hover:bg-white transition-all duration-300 mb-8 active:scale-[0.98]">
        <ArrowLeft className="w-4 h-4" /> 스토어로 돌아가기
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.35fr)] gap-8 lg:gap-12 items-start">
        {/* Left: Image + Preview */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#101827] p-3 shadow-[0_32px_80px_-42px_rgba(15,23,42,0.55)]">
            <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative rounded-[1.25rem] overflow-hidden bg-muted flex items-center justify-center">
            {product.thumbnail_url ? (
              <Image src={product.thumbnail_url} alt={product.title} width={800} height={600} className="w-full h-auto object-contain max-h-[500px]" priority />
            ) : (
              <div className="w-full aspect-[4/3] bg-gradient-to-br from-blue-950 to-blue-800 flex items-center justify-center">
                <FileText className="w-16 h-16 text-blue-200" />
              </div>
            )}
            <Badge className={`absolute top-4 left-4 border font-bold tracking-tight shadow-sm ${product.is_free ? 'bg-blue-600 text-white border-blue-600' : 'bg-zinc-950 text-white border-zinc-900'}`}>
              {product.is_free ? '무료' : '유료'}
            </Badge>
            </div>
          </div>

          {/* PDF Preview Button */}
          {product.preview_pdf_url ? (
            <button
              onClick={() => setShowPdfPreview(true)}
            className="w-full bg-white border border-border/60 rounded-2xl py-3 hover:shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium text-foreground active:scale-[0.98]"
            >
              <BookOpen className="w-4 h-4" />
              문서 미리보기
            </button>
          ) : (product.preview_note || displayFormat) && (
            <div className="w-full bg-white border border-border/60 rounded-2xl py-3 px-4 text-center">
              <p className="text-sm text-muted-foreground">
                {product.preview_note || (product.is_free ? '무료 다운로드 후 바로 사용 가능합니다' : '구매 후 원본 파일을 다운로드할 수 있습니다')}
              </p>
              {displayFormat && <p className="text-xs text-muted-foreground/60 mt-1">파일 형식: {displayFormat}</p>}
            </div>
          )}

          {/* Image Preview Button */}
          {product.preview_images && product.preview_images.length > 0 && (
            <button
              onClick={() => setShowImagePreview(true)}
              className="w-full bg-white border border-border/60 rounded-2xl py-3 hover:shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium text-foreground active:scale-[0.98]"
            >
              <ImageIcon className="w-4 h-4" />
              이미지 미리보기
              <span className="text-xs text-muted-foreground">({product.preview_images.length}장)</span>
            </button>
          )}
        </div>

        {/* Right: Info */}
        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-border/60 bg-white/88 p-6 sm:p-8 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.5)] backdrop-blur">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">PRESALES DOC {productSerial}</p>
                <div className="flex gap-2 flex-wrap mt-3">
                  {categoryNames.map((name) => (
                    <span key={name} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{name}</span>
                  ))}
                  {fileTypeItems.slice(0, 4).map((type) => (
                    <span key={type} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{type}</span>
                  ))}
                </div>
              </div>
              <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0C1220] text-white shadow-[0_18px_45px_-30px_rgba(12,18,32,0.9)]">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mb-2">
              {categoryNames.map((name) => (
                <span key={name} className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">{name}</span>
              ))}
            </div>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.08] text-zinc-950 text-balance">{product.title}</h1>
            {overview.summary && (
              <p className="mt-5 max-w-[68ch] text-[15px] leading-7 text-zinc-600">{overview.summary}</p>
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
              <p className="text-sm font-semibold text-blue-900 mt-1">장바구니에서 구매 이력 할인이 자동 적용됩니다.</p>
            </div>
          )}

          {!product.is_free && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800">검증된 제안서 구조와 산출물 흐름을 바탕으로 제안 준비 시간을 줄이세요.</p>
            </div>
          )}

          <Separator className="my-6" />

          <div className="space-y-2 text-sm divide-y divide-border/50">
            {displayFormat && (
              <div className="py-2 flex justify-between">
                <p className="text-muted-foreground">파일 형식</p>
                <p className="font-medium">{displayFormat}</p>
              </div>
            )}
            {displayPages && (
              <div className="py-2 flex justify-between">
                <p className="text-muted-foreground">페이지 수</p>
                <p className="font-medium">{product.preview_pdf_url ? `PDF 기준 ${displayPages}p` : `${displayPages}p`}</p>
              </div>
            )}
            {displayFileSize && (
              <div className="py-2 flex justify-between">
                <p className="text-muted-foreground">파일 크기</p>
                <p className="font-medium">{displayFileSize}</p>
              </div>
            )}
            <div className="py-2 flex justify-between">
              <p className="text-muted-foreground">카테고리</p>
              <p className="font-medium">{categoryNames.join(', ') || '-'}</p>
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
                <Link key={tag} href={buildProductTagSearchHref(tag)}>
                  <Badge variant="outline" className="text-xs hover:border-primary hover:text-primary transition-colors cursor-pointer">
                    #{tag}
                  </Badge>
                </Link>
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
                    format: displayFormat,
                    ...(matchDiscount ? {
                      discountSourceProductId: matchDiscount.sourceProductId,
                      discountSourceTitle: matchDiscount.sourceTitle,
                      discountAmount: matchDiscount.discountAmount,
                    } : {}),
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
          {displayFormat.toLowerCase().includes('pdf') && !product.is_free && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded-xl px-4 py-2.5 text-center leading-relaxed">
              PDF 상품 구매 후 PPT 원본 구매 시 구매 이력 할인이 자동 적용됩니다
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
                    {normalizeProductFileSizeBytes(file.file_size) > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({formatProductFileSize(normalizeProductFileSizeBytes(file.file_size))})
                      </span>
                    )}
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
                  onClick={() => void copyShareUrl(pageUrl)}
                  title="링크 복사"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 text-xs font-medium hover:bg-muted transition-all duration-300 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? '복사됨!' : '링크 복사'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleKakaoShare(pageUrl)}
                  disabled={sharingKakao}
                  title="카카오톡 공유"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 text-xs font-medium hover:bg-muted disabled:opacity-60 transition-all duration-300 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {sharingKakao ? '여는 중...' : '카카오톡'}
                </button>
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
        <div className="border-b border-border/50 sticky top-0 bg-background/90 z-10 backdrop-blur">
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
              {productIntroImageUrl && (
                <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.6)]">
                  <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">사업 한눈 이미지</p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">이 상품의 사업 구조를 빠르게 파악하세요</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowImagePreview(true)}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition-all duration-300 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98]"
                    >
                      크게 보기
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowImagePreview(true)}
                    className="group relative block w-full overflow-hidden bg-slate-950 text-left"
                  >
                    <Image
                      src={productIntroImageUrl}
                      alt={`${product.title} 사업 소개 이미지`}
                      width={1600}
                      height={900}
                      className="aspect-video w-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
                      sizes="(min-width: 1024px) 900px, 100vw"
                    />
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
                  </button>
                </section>
              )}

              {(overview.summary || overview.points.length > 0) && (
                <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white p-6 sm:p-8 shadow-[0_22px_55px_-42px_rgba(37,99,235,0.55)]">
                  <div className="absolute inset-x-0 top-0 h-1 bg-blue-600" />
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">핵심 요약</p>
                  {overview.summary && <p className="max-w-[72ch] text-[15px] leading-8 text-slate-700">{overview.summary}</p>}
                  {overview.points.length > 0 && (
                    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                      {overview.points.map((point, i) => (
                        <li key={i} className="flex items-start gap-3 rounded-2xl bg-slate-50/80 p-4 text-[14px] leading-6 text-slate-700">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {featureItems.length > 0 && (
                <section>
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">구매 전 확인</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">무엇을 바로 쓸 수 있나</h3>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {featureItems.map((feature, i) => (
                      <article
                        key={`${feature.title}-${i}`}
                        className="rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200"
                      >
                        <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <p className="font-semibold text-slate-950">{feature.title}</p>
                        {feature.description && <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {product.description_html ? (
                <div
                  className="product-description text-[15px]"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description_html) }}
                />
              ) : product.description ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              ) : null}

              {(specItems.length > 0 || fileTypeItems.length > 0) && (
                <section className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
                  {specItems.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-xl font-semibold tracking-tight text-zinc-950">상세 스펙</h3>
                      <dl className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
                        {specItems.map((spec, i) => (
                          <div key={`${spec.label}-${i}`} className={`grid grid-cols-[118px_1fr] text-sm sm:grid-cols-[160px_1fr] ${i !== specItems.length - 1 ? 'border-b border-slate-100' : ''}`}>
                            <dt className="bg-slate-50 px-4 py-3 font-medium text-slate-600">{spec.label}</dt>
                            <dd className="px-4 py-3 text-slate-900">{spec.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  {fileTypeItems.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-xl font-semibold tracking-tight text-zinc-950">포함 파일</h3>
                      <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap gap-2">
                          {fileTypeItems.map((type, i) => (
                            <span key={`${type}-${i}`} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                              <FileText className="h-3.5 w-3.5" />
                              {type}
                            </span>
                          ))}
                        </div>
                        {displayPages && (
                          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            <span className="font-medium text-slate-950">페이지 수</span>
                            <span className="ml-2">{product.preview_pdf_url ? `PDF 미리보기 기준 ${displayPages}p` : `${displayPages}p`}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {!hasDetailContent && (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 py-16 text-center text-muted-foreground">
                  <p>등록된 상품 상세 정보가 없습니다.</p>
                </div>
              )}
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
          previewPages={product.preview_clear_pages || Math.min(15, Math.max(3, Math.ceil((displayPages || 30) * 0.3)))}
          productTitle={product.title}
          purchaseLabel={inCart ? '장바구니로 이동' : '장바구니 담기'}
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
                format: displayFormat,
                ...(matchDiscount ? {
                  discountSourceProductId: matchDiscount.sourceProductId,
                  discountSourceTitle: matchDiscount.sourceTitle,
                  discountAmount: matchDiscount.discountAmount,
                } : {}),
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
                  format: displayFormat,
                  ...(matchDiscount ? {
                    discountSourceProductId: matchDiscount.sourceProductId,
                    discountSourceTitle: matchDiscount.sourceTitle,
                    discountAmount: matchDiscount.discountAmount,
                  } : {}),
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
          {displayFormat.toLowerCase().includes('pdf') && !product.is_free && (
            <p className="text-[10px] text-blue-600 text-center mt-1">PDF 구매 후 PPT 원본 구매 시 구매 이력 할인 적용</p>
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
    </div>
  )
}
