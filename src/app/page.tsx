'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { type DbProduct, formatPrice } from '@/lib/types'
import { useCartStore } from '@/stores/cart-store'
import { useToastStore } from '@/stores/toast-store'
import { FileText, Download, Globe, Handshake, ArrowRight, ShoppingCart, Check, Star, Quote, ChevronRight, Search, BookOpen, Presentation, Briefcase, TrendingUp, Wrench, AlertTriangle } from 'lucide-react'

interface StatsData {
  productCount: number
  downloadCount: number
  reviewAvg: number | null
}

interface ReviewData {
  text: string
  author: string
  role: string
  rating: number
}

interface CategoryCount {
  id: number
  name: string
  slug: string
  count: number
  icon: typeof FileText
}

/**
 * 카테고리 아이콘 매핑 — DB slug 기반 (id 고정 의존 제거)
 * 새 카테고리 추가 시 여기에 slug 만 추가하면 되고, 미등록 slug 는 FileText fallback
 */
const CATEGORY_ICON_BY_SLUG: Record<string, typeof FileText> = {
  'technical-proposal': FileText,
  'proposal': FileText,
  'bidding-guide': BookOpen,
  'guide': BookOpen,
  'presentation': Presentation,
  'price-proposal': TrendingUp,
  'full-package': Briefcase,
  'business-plan': Wrench,
}

function FeaturedCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse bg-card border border-border/50">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    </div>
  )
}

function FeaturedCard({ product, categoryNames }: { product: DbProduct; categoryNames: string[] }) {
  const discount = product.original_price > 0 ? Math.round((1 - product.price / product.original_price) * 100) : 0
  const { toggleItem, isInCart } = useCartStore()
  const { addToast } = useToastStore()
  const inCart = isInCart(product.id)

  return (
    <Link href={`/store/${product.id}`} className="group">
      <div className="rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-border hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-500">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {product.thumbnail_url ? (
            <Image src={product.thumbnail_url} alt={product.title} width={400} height={300} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-600 flex items-center justify-center">
              <FileText className="w-10 h-10 text-zinc-400" />
            </div>
          )}
          <Badge className={`absolute top-3 left-3 text-[10px] font-semibold tracking-wide ${product.is_free ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
            {product.is_free ? '무료' : '유료'}
          </Badge>
          {!product.is_free && discount > 0 && <Badge className="absolute top-3 right-3 bg-red-500 text-white border-0 text-[10px]">-{discount}%</Badge>}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); const wasInCart = inCart; toggleItem({ productId: product.id, title: product.title, price: product.price, originalPrice: product.original_price, thumbnail: product.thumbnail_url || '', format: product.format || '' }); addToast(wasInCart ? '장바구니에서 제거되었습니다' : '장바구니에 추가되었습니다', wasInCart ? 'info' : 'success', wasInCart ? undefined : { label: '장바구니 보기', href: '/cart' }) }}
            className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 active:scale-[0.92] ${inCart ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white/95 text-zinc-500 hover:text-primary shadow-md'}`}
          >
            {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          </button>
        </div>
        <div className="p-3.5 space-y-1.5">
          <div className="flex gap-1.5 flex-wrap">
            {categoryNames.map((name) => (
              <span key={name} className="text-[10px] text-muted-foreground font-medium">{name}</span>
            ))}
          </div>
          <h3 className="font-semibold text-xs leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300">{product.title}</h3>
          <div className="flex items-center gap-1.5">
            {product.is_free ? <span className="text-sm font-bold text-primary">무료</span> : (
              <>
                <span className="text-sm font-bold text-foreground">{formatPrice(product.price)}</span>
                {product.original_price > product.price && <span className="text-[10px] text-muted-foreground line-through">{formatPrice(product.original_price)}</span>}
              </>
            )}
          </div>
          {product.review_count > 0 && (
            <div className="flex items-center gap-1 text-[10px]">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">{product.review_avg.toFixed(1)}</span>
              <span className="text-muted-foreground">({product.review_count})</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

const heroFeaturePanels = [
  {
    label: '문서 스토어',
    title: '검증된 제안서',
    caption: 'PPT, PDF, HWP 원본 파일',
    href: '/store',
    image: '/images/hero-document-store.webp',
  },
  {
    label: '컨설팅',
    title: '입찰 전략 리뷰',
    caption: '공고 분석부터 발표 준비까지',
    href: '/consulting',
    image: '/images/hero-consulting-panel.webp',
  },
] as const

function ProductRailItem({ product, categoryNames }: { product: DbProduct; categoryNames: string[] }) {
  return (
    <Link
      href={`/store/${product.id}`}
      className="presales-product-rail-card group inline-flex min-h-[132px] w-[340px] shrink-0 items-center gap-4 rounded-2xl border border-gray-200/80 bg-white/92 p-4 text-left shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_16px_36px_rgba(37,99,235,0.13)] active:scale-[0.99]"
    >
      <div className="relative h-24 w-[120px] shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {product.thumbnail_url ? (
          <Image
            src={product.thumbnail_url}
            alt={product.title}
            fill
            sizes="120px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-900">
            <FileText className="h-5 w-5 text-white/60" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${product.is_free ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
            {product.is_free ? '무료' : '유료'}
          </span>
          <span className="truncate text-[10px] font-medium text-gray-400">{categoryNames[0] || '문서'}</span>
        </div>
        <p className="line-clamp-3 text-sm font-bold leading-snug text-gray-950 group-hover:text-blue-700">{product.title}</p>
        <p className="mt-2 text-xs font-semibold text-blue-600">{product.is_free ? '무료 다운로드' : formatPrice(product.price)}</p>
      </div>
    </Link>
  )
}

function ProductRail({
  products,
  loading,
  getCategoryNames,
}: {
  products: DbProduct[]
  loading: boolean
  getCategoryNames: (product: DbProduct) => string[]
}) {
  const railProducts = products.slice(0, 10)
  if (loading || railProducts.length === 0) {
    return (
      <div className="mt-12 overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white/70 p-4">
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-[132px] w-[340px] shrink-0 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  const rowA = [...railProducts, ...railProducts]
  const rowB = [...railProducts.slice().reverse(), ...railProducts.slice().reverse()]

  return (
    <div className="presales-product-rail-wrap mt-12 space-y-3 overflow-hidden py-1">
      <div className="presales-product-rail">
        {rowA.map((product, index) => (
          <ProductRailItem key={`rail-a-${product.id}-${index}`} product={product} categoryNames={getCategoryNames(product)} />
        ))}
      </div>
      <div className="presales-product-rail presales-product-rail-reverse">
        {rowB.map((product, index) => (
          <ProductRailItem key={`rail-b-${product.id}-${index}`} product={product} categoryNames={getCategoryNames(product)} />
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const [products, setProducts] = useState<DbProduct[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([])
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [newProducts, setNewProducts] = useState<DbProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [
        { data: allData },
        { data: catData },
        { count: productCount },
        { data: reviewsData },
      ] = await Promise.all([
        supabase
          .from('products')
          .select('*, categories(id, name, slug)')
          .eq('is_published', true),
        supabase.from('categories').select('id, name, slug').order('sort_order'),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase
          .from('reviews')
          .select('content, rating, reviewer_name')
          .gte('rating', 4)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      setCategories(catData || [])

      const allProducts = allData || []
      const totalDownloads = allProducts.reduce((sum, p) => sum + (p.download_count || 0), 0)

      const productsWithReviews = allProducts.filter(p => p.review_count > 0)
      let reviewAvg: number | null = null
      if (productsWithReviews.length > 0) {
        const totalWeighted = productsWithReviews.reduce((sum, p) => sum + p.review_avg * p.review_count, 0)
        const totalReviewCount = productsWithReviews.reduce((sum, p) => sum + p.review_count, 0)
        reviewAvg = totalReviewCount > 0 ? totalWeighted / totalReviewCount : null
      }

      setStats({
        productCount: productCount || allProducts.length,
        downloadCount: totalDownloads,
        reviewAvg,
      })

      const catCountMap = new Map<number, number>()
      allProducts.forEach(p => {
        const catIds = p.category_ids && p.category_ids.length > 0
          ? p.category_ids
          : p.category_id ? [p.category_id] : []
        catIds.forEach((cid: number) => catCountMap.set(cid, (catCountMap.get(cid) || 0) + 1))
      })
      const dynamicCats: CategoryCount[] = (catData || []).map((c: { id: number; name: string; slug: string | null }) => ({
        id: c.id,
        name: c.name,
        icon: (c.slug && CATEGORY_ICON_BY_SLUG[c.slug]) || FileText,
        slug: c.slug || '',
        count: catCountMap.get(c.id) || 0,
      }))
      setCategoryCounts(dynamicCats)

      if (reviewsData && reviewsData.length > 0) {
        const mapped: ReviewData[] = reviewsData.map((r: Record<string, unknown>) => {
          const name = (r.reviewer_name as string | null) || '익명'
          return {
            text: (r.content as string) || '',
            author: name.length > 1 ? name[0] + 'OO' : name,
            role: '고객',
            rating: r.rating as number,
          }
        }).filter((r: ReviewData) => r.text.length > 0)
        setReviews(mapped)
      }

      const newArrivals = [...allProducts]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4)
      setNewProducts(newArrivals)

      const featured = [...allProducts]
        .filter(p => !p.is_free && p.price > 0)
        .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
        .slice(0, 15)

      if (featured.length < 15) {
        const freeOnes = allProducts
          .filter(p => p.is_free && !featured.some(f => f.id === p.id))
          .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
        featured.push(...freeOnes.slice(0, 15 - featured.length))
      }

      setProducts(featured)
      setLoadingProducts(false)
    }
    load()
  }, [])

  const categoryMap = new Map<number, string>()
  categories.forEach((c) => categoryMap.set(c.id, c.name))

  const getCategoryNames = (p: DbProduct): string[] => {
    if (p.category_ids && p.category_ids.length > 0) {
      return p.category_ids.map((cid) => categoryMap.get(cid) || '').filter(Boolean)
    }
    if (p.categories?.name) return [p.categories.name]
    return ['문서']
  }

  return (
    <div>
      <div className="border-y border-amber-200 bg-amber-50 text-amber-950">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 overflow-hidden px-4 py-2 md:px-8">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="presales-payment-ticker flex min-w-0 flex-1 gap-10 whitespace-nowrap text-sm font-semibold">
            <span>PG사 연결 진행중이오니 현재 카드결제는 이용할 수 없습니다. 무통장입금만 가능합니다.</span>
            <span aria-hidden="true">무통장 입금 후 관리자가 승인하면 나의콘솔에서 다운로드가 열립니다.</span>
            <span aria-hidden="true">PG사 연결 진행중이오니 현재 카드결제는 이용할 수 없습니다. 무통장입금만 가능합니다.</span>
          </div>
        </div>
      </div>

      {/* Hero — interactive proposal cockpit */}
      <section className="relative overflow-hidden bg-[#F7F8FA]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.09),transparent_34%),linear-gradient(90deg,rgba(255,255,255,0.78),rgba(255,255,255,0))]" />
        <div className="relative mx-auto w-full max-w-[1400px] px-4 py-14 md:px-8 md:py-20 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:gap-12">
            <div className="relative z-[1] min-w-0 w-full max-w-[620px] space-y-7">
              <div className="presales-reveal inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/82 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700 shadow-[0_12px_34px_rgba(37,99,235,0.08)] backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                공공조달 제안서 전문
              </div>

              <h1 className="presales-reveal presales-delay-1 break-keep text-[30px] font-extrabold leading-[1.12] tracking-tight text-gray-950 sm:text-[36px] md:text-[42px] lg:text-[44px] xl:text-[46px]">
                제안서 작성 시간을 줄이고,<br />
                <span className="text-blue-600">수주 가능성에 집중하세요.</span>
              </h1>

              <p className="presales-reveal presales-delay-2 max-w-full text-base leading-relaxed text-gray-600 md:max-w-[540px] md:text-lg">
                검증된 제안서 구조와 입찰 자료로 공고 분석부터 초안 작성까지 빠르게 시작하세요.
              </p>

              <div className="presales-reveal presales-delay-3 flex w-full max-w-[500px] flex-col gap-3 sm:flex-row">
                <Link
                  href="/store"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-600 px-7 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 active:scale-[0.98] sm:w-auto"
                >
                  제안서 템플릿 보기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/consulting"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full border border-gray-200 bg-white px-7 text-sm font-semibold text-gray-900 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-700 active:scale-[0.98] sm:w-auto"
                >
                  무료 상담 받기
                </Link>
              </div>

              <div className="presales-hero-search presales-reveal presales-delay-4 w-full max-w-[500px]">
                <form onSubmit={(e) => { e.preventDefault(); const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value; if (q.trim()) window.location.href = `/store?q=${encodeURIComponent(q.trim())}` }} className="relative">
                  <input name="q" type="text" placeholder="예: IoT, 스마트시티, 기술제안서" className="h-12 w-full rounded-full border border-gray-200 bg-white/92 pl-5 pr-12 text-sm text-gray-950 shadow-[0_18px_50px_rgba(15,23,42,0.08)] outline-none backdrop-blur transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                  <button type="submit" className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-blue-600 transition-colors hover:bg-blue-700" aria-label="스토어 검색">
                    <Search className="h-4 w-4 text-white" />
                  </button>
                </form>
              </div>
            </div>

            <div className="presales-reveal presales-delay-2 relative">
              <div className="presales-hero-stage grid min-h-[420px] grid-cols-1 gap-3 md:min-h-[520px] lg:grid-cols-[minmax(0,1.55fr)_0.46fr_0.46fr]">
                <div className="presales-hero-main group relative min-h-[420px] overflow-hidden rounded-[1.75rem] bg-slate-900 shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
                  <Image
                    src="/images/hero-ai-readiness.webp"
                    alt="AI readiness 진단 화면을 보며 공공조달 제안서를 검토하는 컨설턴트"
                    fill
                    sizes="(min-width: 1024px) 52vw, 100vw"
                    className="object-cover object-center transition-transform duration-[1400ms] group-hover:scale-[1.035]"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/72 via-slate-950/10 to-transparent" />
                  <div className="presales-hero-main-copy absolute bottom-0 left-0 right-0 p-5 md:p-7">
                    <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/12 px-3 py-1 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur">
                      AI readiness · 제안서 검토
                    </div>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="break-keep text-2xl font-bold tracking-tight text-white md:text-3xl">공고를 읽고 문서로 바꾸는 시간</p>
                        <p className="mt-2 max-w-[440px] break-keep text-sm leading-relaxed text-white/75">템플릿, 공고, IT피드, 모닝브리프가 연결된 입찰 준비 흐름입니다.</p>
                      </div>
                      <Link href="/brief" className="hidden h-11 shrink-0 items-center rounded-full bg-white px-4 text-sm font-bold text-slate-950 transition-transform hover:-translate-y-0.5 md:inline-flex">
                        브리프 보기
                      </Link>
                    </div>
                  </div>
                </div>

                {heroFeaturePanels.map((panel, index) => (
                  <Link
                    key={panel.label}
                    href={panel.href}
                    data-panel-index={index}
                    className={`presales-hero-strip group relative hidden overflow-hidden rounded-[1.75rem] bg-slate-900 shadow-[0_22px_70px_rgba(15,23,42,0.13)] transition-transform duration-500 hover:-translate-y-1 lg:block ${index === 1 ? 'presales-strip-late' : ''}`}
                  >
                    <Image
                      src={panel.image}
                      alt={`${panel.label} 이미지`}
                      fill
                      sizes="(min-width: 1024px) 18vw, 0vw"
                      className="object-cover transition-transform duration-[1400ms] group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/86 via-slate-950/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="presales-vertical-label text-3xl font-bold text-white/92">{panel.label}</p>
                      <div className="mt-4 translate-y-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                        <p className="text-sm font-bold text-white">{panel.title}</p>
                        <p className="mt-1 text-xs leading-snug text-white/70">{panel.caption}</p>
                      </div>
                    </div>
                  </Link>
                ))}

                <div className="presales-floating-note absolute -right-2 top-7 hidden rounded-2xl border border-white/70 bg-white/84 p-4 shadow-[0_18px_54px_rgba(15,23,42,0.15)] backdrop-blur md:block">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Today</p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">{stats?.productCount || 0}+</p>
                  <p className="text-xs text-gray-500">등록 문서</p>
                </div>

                <div className="presales-floating-note presales-floating-note-slow absolute -left-5 top-10 hidden rounded-2xl border border-white/70 bg-white/86 p-4 shadow-[0_18px_54px_rgba(15,23,42,0.14)] backdrop-blur md:block">
                  <p className="text-xs font-bold text-gray-950">공고 · 피드 · 브리프</p>
                  <p className="mt-1 text-xs text-gray-500">매일 업데이트되는 제안 근거</p>
                </div>
              </div>
            </div>
          </div>

          <ProductRail products={products} loading={loadingProducts} getCategoryNames={getCategoryNames} />

          <div className="mt-14 grid grid-cols-3 gap-6 border-t border-gray-200 pt-10 md:grid-cols-4 md:gap-10">
            {[
              { value: `${stats?.productCount || 0}+`, label: '검증 템플릿' },
              { value: '6', label: '전문 분야' },
              { value: '100%', label: '원본 파일 제공' },
              { value: '5분', label: '결제 후 즉시 다운로드', hideOnMobile: true },
            ].map((s, index) => (
              <div key={s.label} className={`${s.hideOnMobile ? 'hidden md:block' : ''} presales-reveal`} style={{ animationDelay: `${120 + index * 70}ms` }}>
                <p className="text-3xl font-extrabold tracking-tight text-gray-950 md:text-4xl">{s.value}</p>
                <p className="mt-1.5 text-xs text-gray-500 md:text-sm">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
            {categoryCounts.map((cat, index) => {
              const Icon = cat.icon || FileText
              return (
                <Link
                  key={cat.id}
                  href={`/store?category=${cat.id}`}
                  aria-label={`${cat.name} 카테고리 보기`}
                  className="presales-reveal group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-[0_8px_28px_rgba(15,23,42,0.035)] transition-all duration-500 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_14px_42px_rgba(37,99,235,0.1)]"
                  style={{ animationDelay: `${180 + index * 55}ms` }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 transition-colors duration-500 group-hover:bg-blue-100">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-bold tracking-tight text-gray-950 transition-colors duration-300 group-hover:text-blue-600">{cat.name}</span>
                    <span className="mt-1 block text-xs text-gray-400">{cat.count}개 문서</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Value Props — Editorial bento: 1 blue primary + 3 white */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="mb-12 md:mb-16 max-w-2xl">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">왜 프리세일즈</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 leading-tight">
              전문가들이 고민하여 수주한 제안서,<br />
              문서 스토어에서 만나보세요.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {[
              {
                icon: FileText,
                title: '실전 제안서',
                desc: '실제 수주에 성공한 제안서 그대로. 어떤 구조로, 어떤 말로 평가위원을 설득했는지 확인하세요.',
                primary: true,
              },
              {
                icon: Download,
                title: '즉시 다운로드',
                desc: '결제 후 5초 안에 PPT/HWP 원본 파일을 받습니다. 폰트·구조 전부 수정 가능.',
              },
              {
                icon: Globe,
                title: '나라장터 최적화',
                desc: '나라장터 평가표 항목별로 점수를 챙기는 구조. 감점 포인트를 미리 막습니다.',
              },
              {
                icon: Handshake,
                title: '전문가 컨설팅',
                desc: '공고 분석부터 발표 리허설까지. 공공조달 전문가가 낙찰 전략을 함께 짭니다.',
              },
            ].map((item) =>
              item.primary ? (
                <div
                  key={item.title}
                  className="rounded-2xl bg-blue-600 text-white p-8 md:p-10 flex flex-col justify-between min-h-[280px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl md:text-2xl mb-3 tracking-tight">{item.title}</h3>
                    <p className="text-sm md:text-[15px] text-blue-50 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  key={item.title}
                  className="group rounded-2xl bg-gray-50 border border-gray-100 p-8 md:p-10 flex flex-col justify-between min-h-[280px] hover:border-blue-200 hover:bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-500"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-500">
                    <item.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl md:text-2xl mb-3 tracking-tight text-gray-900">{item.title}</h3>
                    <p className="text-sm md:text-[15px] text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      {!loadingProducts && newProducts.length > 0 && (
        <section className="py-16 md:py-20 bg-gray-50">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">신규 등록</p>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">새로 등록된 템플릿</h2>
              </div>
              <Link href="/store?sort=latest" className="hidden md:inline-flex items-center h-10 px-5 rounded-full border border-border bg-card hover:bg-muted text-sm font-medium transition-all duration-300 group">
                전체보기 <ArrowRight className="ml-1.5 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {newProducts.map((product) => (
                <FeaturedCard key={product.id} product={product} categoryNames={getCategoryNames(product)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-widest">인기 제안서</p>
                <Badge className="bg-amber-50 text-amber-700 border-amber-200/50 text-[10px] font-semibold">TOP</Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">인기 상품</h2>
              <p className="text-muted-foreground mt-2">실제 낙찰 후기가 달린 인기 제안서</p>
            </div>
            <Link
              href="/store"
              className="hidden md:inline-flex items-center h-10 px-5 rounded-full border border-border bg-card hover:bg-muted text-sm font-medium transition-all duration-300 group"
            >
              {stats?.productCount || 0}개+ 전체 템플릿 보기
              <ArrowRight className="ml-1.5 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {loadingProducts
              ? Array.from({ length: 15 }).map((_, i) => <FeaturedCardSkeleton key={i} />)
              : products.slice(0, 15).map((product) => (
                  <FeaturedCard key={product.id} product={product} categoryNames={getCategoryNames(product)} />
                ))
            }
          </div>

          {/* Upsell Banner */}
          {!loadingProducts && (
            <div className="mt-10 rounded-2xl bg-[#0C1220] p-8 md:p-10 flex flex-col sm:flex-row sm:items-center gap-6 text-white">
              <div className="flex-1">
                <p className="font-bold text-lg tracking-tight mb-1.5">낙찰받은 기업들이 실제로 쓴 유료 버전</p>
                <p className="text-zinc-400 text-sm leading-relaxed">무료 템플릿으로 방향을 잡았다면, 이제 실제 낙찰 기록이 있는 유료 버전을 써보세요.</p>
              </div>
              <Link
                href="/store?price=paid"
                className="shrink-0 inline-flex items-center justify-center h-11 px-6 rounded-full bg-blue-500 text-white text-sm font-medium hover:bg-blue-400 transition-all duration-300 active:scale-[0.98]"
              >
                낙찰 검증 템플릿 보기 <ArrowRight className="ml-1.5 w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Customer Reviews */}
      {reviews.length > 0 && (
        <section className="py-24 md:py-32 bg-card border-y border-border/50">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">낙찰 후기</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">낙찰 후기</h2>
              <p className="text-muted-foreground mt-2">&quot;이 제안서로 실제 수주했습니다&quot;</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {reviews.map((t, i) => (
                <div key={i} className="relative bg-background border border-border/50 rounded-2xl p-7 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-500">
                  <Quote className="w-8 h-8 text-primary/10 mb-5" />
                  <p className="text-sm leading-relaxed text-foreground mb-6">{t.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/8 flex items-center justify-center text-sm font-bold text-primary">
                      {t.author[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.author}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-0.5">
                      {[...Array(5)].map((_, si) => (
                        <Star key={si} className={`w-3.5 h-3.5 ${si < t.rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Post-Review CTA */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">검증된 제안서로 다음 입찰을 준비하세요</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">실제 낙찰 기록이 있는 제안서 {stats?.productCount || 0}개+를 지금 확인하세요.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/store" className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all duration-300 active:scale-[0.98] shadow-lg shadow-blue-600/25">
              제안서 템플릿 보기 <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link href="/store?price=free" className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-white border border-gray-200 text-gray-800 hover:border-blue-300 hover:text-blue-700 font-semibold text-sm transition-all duration-300">
              무료 샘플 먼저 받기
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 bg-[#0C1220] text-white relative overflow-hidden">
        <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/8 rounded-full blur-[120px]" />
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 text-center relative z-10">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tighter mb-4">
            입찰 준비, 뭐부터 해야 할지<br className="md:hidden" /> 막막하신가요?
          </h2>
          <p className="text-zinc-400 mb-10 max-w-md mx-auto leading-relaxed">
            공고 검토, 제안서 구조, 가격 전략까지.
            공공조달 전문가와 1:1로 점검받으세요.
          </p>
          <Link
            href="/consulting"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-blue-500 text-white hover:bg-blue-400 font-medium text-sm transition-all duration-300 active:scale-[0.98] shadow-[0_0_30px_rgba(37,99,235,0.2)]"
          >
            무료 입찰 상담 받기
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
