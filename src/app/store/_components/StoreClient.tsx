'use client'

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Search, ShoppingCart, Check, Star, RotateCcw, ChevronDown, FileText, Store, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { useToastStore } from '@/stores/toast-store'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { type DbProduct, type DbCategory, formatPrice, priceTypes } from '@/lib/types'
import { RecentlyViewed } from '@/components/RecentlyViewed'
import { normalizeProductSearchTerm } from '@/lib/product-tags'

const LIMIT = 20

const fileTypeColors: Record<string, string> = {
  PPT: 'bg-orange-500 text-white',
  PPTX: 'bg-orange-500 text-white',
  PDF: 'bg-red-500 text-white',
  XLS: 'bg-green-600 text-white',
  XLSX: 'bg-green-600 text-white',
  DOC: 'bg-blue-600 text-white',
  DOCX: 'bg-blue-600 text-white',
  HWP: 'bg-sky-500 text-white',
  ZIP: 'bg-gray-500 text-white',
}

function extractFileTypes(format: string | null): string[] {
  if (!format) return []
  const types = new Set<string>()
  const upper = format.toUpperCase()
  for (const ft of ['PPTX', 'PPT', 'PDF', 'XLSX', 'XLS', 'DOCX', 'DOC', 'HWP', 'ZIP']) {
    if (upper.includes(ft)) types.add(ft)
  }
  const normalized = new Set<string>()
  for (const t of types) {
    if (t === 'PPTX') normalized.add('PPT')
    else if (t === 'XLSX') normalized.add('XLS')
    else if (t === 'DOCX') normalized.add('DOC')
    else normalized.add(t)
  }
  return Array.from(normalized)
}

function FileTypeBadges({ format, onClick }: { format: string | null; onClick?: (type: string) => void }) {
  const types = extractFileTypes(format)
  return (
    <div className="flex gap-1 flex-wrap">
      {types.map((t) => (
        <span
          key={t}
          onClick={(e) => { if (onClick) { e.preventDefault(); e.stopPropagation(); onClick(t) } }}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${fileTypeColors[t] || 'bg-gray-400 text-white'} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
        >
          {t}
        </span>
      ))}
    </div>
  )
}

function highlightText(text: string, query: string): ReactNode {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const matcher = new RegExp(`^${escaped}$`, 'i')
  const parts = text.split(regex)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    matcher.test(part) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-100 px-0.5 rounded">{part}</mark> : part
  )
}

function ProductCard({
  product,
  onFileTypeClick,
  onTagClick,
  categoryNames,
  searchQuery,
}: {
  product: DbProduct
  onFileTypeClick: (type: string) => void
  onTagClick: (tag: string) => void
  categoryNames: string[]
  searchQuery?: string
}) {
  const discount = product.original_price > 0
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0
  const { toggleItem, isInCart } = useCartStore()
  const { addToast } = useToastStore()
  const inCart = isInCart(product.id)

  const handleCartToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const wasInCart = inCart
    toggleItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      originalPrice: product.original_price,
      thumbnail: product.thumbnail_url || '',
      format: product.format || '',
    })
    addToast(wasInCart ? '장바구니에서 제거되었습니다' : '장바구니에 추가되었습니다', wasInCart ? 'info' : 'success', wasInCart ? undefined : { label: '장바구니 보기', href: '/cart' })
  }

  return (
    <Link href={`/store/${product.id}`} className="group">
      <div className="border border-border/50 rounded-2xl overflow-hidden bg-card hover:border-border hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {product.thumbnail_url ? (
            <Image src={product.thumbnail_url} alt={product.title} width={400} height={300} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-950 to-blue-800 flex items-center justify-center">
              <FileText className="w-12 h-12 text-blue-100 opacity-60" />
            </div>
          )}
          <Badge className={`absolute top-3 left-3 border text-xs font-semibold uppercase tracking-widest ${product.is_free ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
            {product.is_free ? '무료' : '유료'}
          </Badge>
          {!product.is_free && discount > 0 && (
            <Badge className="absolute top-3 right-3 bg-red-500 text-white border-0 text-xs font-semibold">-{discount}%</Badge>
          )}
          <button
            onClick={handleCartToggle}
            aria-label={inCart ? '장바구니에서 빼기' : '장바구니에 담기'}
            className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md active:scale-[0.98] cursor-pointer ${
              inCart ? 'bg-primary text-primary-foreground' : 'bg-white/90 text-foreground hover:bg-white hover:text-primary'
            }`}
          >
            {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          </button>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 flex-wrap text-xs font-semibold uppercase tracking-widest">
              {categoryNames.map((name) => (
                <span key={name} className="text-muted-foreground">{name}</span>
              ))}
            </div>
            <FileTypeBadges format={product.format} onClick={onFileTypeClick} />
          </div>
          <h3 className="min-h-[3.65rem] font-semibold text-sm leading-snug line-clamp-3 group-hover:text-primary transition-colors duration-300">
            {searchQuery ? highlightText(product.title, searchQuery) : product.title}
          </h3>
          {product.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{product.description}</p>
          )}
          <div className="flex items-center gap-2">
            {product.is_free ? (
              <span className="text-base font-bold text-primary">무료</span>
            ) : (
              <>
                <span className="text-base font-bold text-primary">{formatPrice(product.price)}</span>
                {product.original_price > product.price && (
                  <span className="text-xs text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                )}
              </>
            )}
          </div>
          {product.review_count > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-foreground">{product.review_avg.toFixed(1)}</span>
              <span className="text-muted-foreground">({product.review_count})</span>
            </div>
          )}
          {product.tags && product.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {product.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  role="button"
                  tabIndex={0}
                  title={`태그 검색: ${tag}`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onTagClick(tag)
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    e.stopPropagation()
                    onTagClick(tag)
                  }}
                  className="text-[10px] text-primary hover:underline cursor-pointer"
                >
                  #{searchQuery ? highlightText(tag, searchQuery) : tag}
                </span>
              ))}
              {product.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{product.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

const allFileTypes = [
  { id: 'PPT', label: 'PPT', color: 'bg-orange-500 text-white border-orange-500' },
  { id: 'PDF', label: 'PDF', color: 'bg-red-500 text-white border-red-500' },
  { id: 'XLS', label: 'XLS', color: 'bg-green-600 text-white border-green-600' },
  { id: 'DOC', label: 'DOC', color: 'bg-blue-600 text-white border-blue-600' },
  { id: 'HWP', label: 'HWP', color: 'bg-sky-500 text-white border-sky-500' },
  { id: 'ZIP', label: 'ZIP', color: 'bg-gray-500 text-white border-gray-500' },
]

type SortOrder = 'recommended' | 'price_asc' | 'price_desc' | 'newest'

interface FilterState {
  cats: Set<number>
  price: string | null
  query: string
  sort: SortOrder
  fileType: string | null
  priceRange: string | null
  page: number
}

interface ProductsResponse {
  products: DbProduct[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-12 mb-20">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="w-9 h-9 rounded-lg flex items-center justify-center border border-border/50 hover:border-border hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        aria-label="이전 페이지"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-muted-foreground">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p as number)}
            className={`w-9 h-9 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
              p === page
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border/50 hover:border-border hover:bg-muted'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="w-9 h-9 rounded-lg flex items-center justify-center border border-border/50 hover:border-border hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        aria-label="다음 페이지"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function parseURLFilters(searchParams: ReturnType<typeof useSearchParams>): FilterState {
  const catParam = searchParams.get('category')
  const cats = catParam
    ? new Set(catParam.split(',').map(Number).filter((n) => !isNaN(n) && n > 0))
    : new Set<number>()
  const rawPrice = searchParams.get('price')
  const price = rawPrice === 'free' || rawPrice === 'paid' ? rawPrice : null
  const query = searchParams.get('q') || ''
  const rawSort = searchParams.get('sort')
  const validSorts: SortOrder[] = ['recommended', 'price_asc', 'price_desc', 'newest']
  const sort: SortOrder = validSorts.includes(rawSort as SortOrder) ? (rawSort as SortOrder) : 'recommended'
  const rawFileType = searchParams.get('fileType')
  const fileType = rawFileType && ['PPT', 'PDF', 'XLS', 'DOC', 'HWP', 'ZIP'].includes(rawFileType) ? rawFileType : null
  const rawPriceRange = searchParams.get('priceRange')
  const priceRange = rawPriceRange && ['free', 'under50k', '50k_100k', 'over100k'].includes(rawPriceRange) ? rawPriceRange : null
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  return { cats, price, query, sort, fileType, priceRange, page }
}

function filtersToURLParams(f: FilterState): string {
  const params = new URLSearchParams()
  if (f.cats.size > 0) params.set('category', Array.from(f.cats).join(','))
  if (f.price) params.set('price', f.price)
  if (f.query) params.set('q', f.query)
  if (f.sort !== 'recommended') params.set('sort', f.sort)
  if (f.fileType) params.set('fileType', f.fileType)
  if (f.priceRange) params.set('priceRange', f.priceRange)
  if (f.page > 1) params.set('page', String(f.page))
  return params.toString()
}

function filtersToAPIParams(f: FilterState): string {
  const params = new URLSearchParams()
  params.set('page', String(f.page))
  params.set('limit', String(LIMIT))
  if (f.cats.size > 0) params.set('category', Array.from(f.cats).join(','))
  if (f.price) params.set('price', f.price)
  if (f.query) params.set('q', f.query)
  if (f.sort !== 'recommended') params.set('sort', f.sort)
  if (f.fileType) params.set('fileType', f.fileType)
  if (f.priceRange) params.set('priceRange', f.priceRange)
  return params.toString()
}

export default function StoreClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Single source of truth for all filters
  const filtersRef = useRef<FilterState>(parseURLFilters(searchParams))

  // UI state (mirrors filtersRef for rendering)
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(filtersRef.current.cats)
  const [selectedPriceType, setSelectedPriceType] = useState<string | null>(filtersRef.current.price)
  const [selectedFileType, setSelectedFileType] = useState<string | null>(filtersRef.current.fileType)
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(filtersRef.current.priceRange)
  const [searchQuery, setSearchQuery] = useState(filtersRef.current.query)
  const [sortOrder, setSortOrder] = useState<SortOrder>(filtersRef.current.sort)
  const [currentPage, setCurrentPage] = useState(filtersRef.current.page)
  const [showDetailFilter, setShowDetailFilter] = useState(false)

  // Data state
  const [products, setProducts] = useState<DbProduct[]>([])
  const [categories, setCategories] = useState<DbCategory[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [popularProducts, setPopularProducts] = useState<DbProduct[]>([])

  // Search debounce ref
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch products from /api/products
  const fetchProducts = useCallback(async (f: FilterState) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/products?${filtersToAPIParams(f)}`)
      if (!res.ok) throw new Error('fetch failed')
      const json: ProductsResponse = await res.json()
      setProducts(json.products)
      setTotal(json.total)
      setTotalPages(json.totalPages)
    } catch (err) {
      console.error('[Store] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Apply a partial filter update: merge into filtersRef, sync UI state, update URL, fetch
  const applyFilters = useCallback((patch: Partial<FilterState> & { resetPage?: boolean }) => {
    const { resetPage, ...rest } = patch
    const next: FilterState = {
      ...filtersRef.current,
      ...rest,
      page: rest.page !== undefined ? rest.page : (resetPage !== false ? 1 : filtersRef.current.page),
    }
    filtersRef.current = next

    // Sync UI state
    setSelectedCategories(next.cats)
    setSelectedPriceType(next.price)
    setSearchQuery(next.query)
    setSortOrder(next.sort)
    setSelectedFileType(next.fileType)
    setSelectedPriceRange(next.priceRange)
    setCurrentPage(next.page)

    // Update URL
    const qs = filtersToURLParams(next)
    router.replace(qs ? `/store?${qs}` : '/store', { scroll: false })

    // Fetch
    fetchProducts(next)
  }, [fetchProducts, router])

  // Load categories once
  useEffect(() => {
    const supabase = createClient()
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  // Initial product fetch
  useEffect(() => {
    fetchProducts(filtersRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Popular products for empty state
  useEffect(() => {
    fetch('/api/products?page=1&limit=4&sort=recommended')
      .then((r) => r.json())
      .then((json: ProductsResponse) => {
        if (json.products) setPopularProducts(json.products)
      })
      .catch(() => {})
  }, [])

  // Category name lookup
  const categoryMap = new Map<number, string>()
  categories.forEach((c) => categoryMap.set(c.id, c.name))

  const getCategoryNames = (product: DbProduct): string[] => {
    if (product.category_ids && product.category_ids.length > 0) {
      return product.category_ids.map((id) => categoryMap.get(id) || '').filter(Boolean)
    }
    if (product.categories?.name) return [product.categories.name]
    return ['문서']
  }

  const toggleCategory = (catId: number) => {
    const next = new Set(filtersRef.current.cats)
    if (next.has(catId)) next.delete(catId)
    else next.add(catId)
    applyFilters({ cats: next })
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    filtersRef.current = { ...filtersRef.current, query: value }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      applyFilters({ query: value })
    }, 400)
  }

  const handlePageChange = (page: number) => {
    applyFilters({ page, resetPage: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleFileTypeClick = (type: string) => {
    const newFileType = filtersRef.current.fileType === type ? null : type
    applyFilters({ fileType: newFileType })
  }

  const handleTagClick = (tag: string) => {
    const query = normalizeProductSearchTerm(tag)
    if (!query) return
    applyFilters({ query })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetFilters = () => {
    applyFilters({
      cats: new Set(),
      price: null,
      query: '',
      sort: 'recommended',
      fileType: null,
      priceRange: null,
      page: 1,
      resetPage: false,
    })
  }

  const hasActiveFilters =
    selectedCategories.size > 0 ||
    selectedPriceType !== null ||
    selectedFileType !== null ||
    selectedPriceRange !== null ||
    searchQuery !== ''
  const detailFilterCount = (selectedFileType ? 1 : 0) + (selectedPriceRange ? 1 : 0)

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      <div className="pt-5 pb-4 md:pt-7 md:pb-5">
        <div className="flex items-center gap-3 mb-3">
          <Store className="w-7 h-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">문서 스토어</h1>
        </div>
        <p className="text-muted-foreground">낙찰 기록이 검증된 제안서 — 지금 바로 검색하세요</p>
        <p className="text-xs text-blue-600 mt-2">PDF 구매 후 PPT 원본 구매 시 PDF 구매금액이 자동 차감됩니다</p>
      </div>

      {/* 최근 본 상품 — 우측 날개 배너 */}
      <RecentlyViewed />

      <div className="mb-7 border-y border-border/50 py-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start">
          <div className="space-y-3">
            {/* 카테고리 필터 */}
            <div className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
              <p className="text-xs font-semibold text-muted-foreground">문서 유형</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => applyFilters({ cats: new Set() })}
                  className={`px-4 py-2 min-h-[38px] rounded-full text-xs font-semibold border transition-all duration-300 cursor-pointer active:scale-[0.98] ${
                    selectedCategories.size === 0 ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 hover:border-border hover:bg-muted'
                  }`}
                >
                  전체
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-4 py-2 min-h-[38px] rounded-full text-xs font-semibold border transition-all duration-300 cursor-pointer active:scale-[0.98] ${
                      selectedCategories.has(cat.id) ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 hover:border-border hover:bg-muted'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 무료/유료 필터 */}
            <div className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
              <p className="text-xs font-semibold text-muted-foreground">가격</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => applyFilters({ price: null })}
                  className={`px-4 py-2 min-h-[38px] rounded-full text-xs font-semibold border transition-all duration-300 cursor-pointer active:scale-[0.98] ${
                    selectedPriceType === null ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 hover:border-border hover:bg-muted'
                  }`}
                >
                  전체
                </button>
                {priceTypes.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => applyFilters({ price: pt.id })}
                    className={`px-4 py-2 min-h-[38px] rounded-full text-xs font-semibold border transition-all duration-300 cursor-pointer active:scale-[0.98] ${
                      selectedPriceType === pt.id ? pt.color : 'border-border/50 hover:border-border hover:bg-muted'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 상세 필터 토글 */}
            <div className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
              <span className="hidden sm:block" aria-hidden="true" />
              <button
                onClick={() => setShowDetailFilter(!showDetailFilter)}
                className="inline-flex w-fit items-center gap-1.5 px-4 py-2 min-h-[38px] rounded-full text-xs font-semibold border border-border/50 hover:border-border hover:bg-muted transition-all duration-300 cursor-pointer active:scale-[0.98]"
              >
                상세 필터
                {detailFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                    {detailFilterCount}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showDetailFilter ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          <div className="lg:pt-0.5">
            <label htmlFor="store-search" className="mb-2 block text-xs font-semibold text-muted-foreground">
              검색
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="store-search"
                type="text"
                placeholder="기술제안서, IoT, 스마트시티"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-border/50 rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {showDetailFilter && (
          <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
            {/* 파일 형태 필터 */}
            <div className="flex flex-wrap gap-2">
              {allFileTypes.map((ft) => (
                <button
                  key={ft.id}
                  onClick={() => applyFilters({ fileType: selectedFileType === ft.id ? null : ft.id })}
                  className={`px-4 py-2 min-h-[40px] rounded-full text-xs font-bold border transition-all duration-300 cursor-pointer ${
                    selectedFileType === ft.id ? ft.color : 'border-border/50 hover:border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>

            {/* 가격대 필터 */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: null, label: '전체' },
                { id: 'free', label: '무료' },
                { id: 'under50k', label: '5만원 이하' },
                { id: '50k_100k', label: '5~10만원' },
                { id: 'over100k', label: '10만원 이상' },
              ].map((pr) => (
                <button
                  key={pr.id ?? 'all'}
                  onClick={() => applyFilters({ priceRange: selectedPriceRange === pr.id ? null : pr.id })}
                  className={`px-4 py-2 min-h-[40px] rounded-full text-xs font-semibold uppercase tracking-widest border transition-all duration-300 cursor-pointer ${
                    selectedPriceRange === pr.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border/50 hover:border-border hover:bg-muted'
                  }`}
                >
                  {pr.label}
                </button>
              ))}
            </div>

          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {loading ? '검색 중...' : (
              <>
                {total}개 상품
                {selectedFileType && <span className="ml-2 text-xs">· 파일형태: {selectedFileType}</span>}
                {totalPages > 1 && <span className="ml-2 text-xs">· {currentPage}/{totalPages} 페이지</span>}
              </>
            )}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest border border-border/50 hover:border-border hover:bg-muted transition-all duration-300 cursor-pointer active:scale-[0.98]"
            >
              <RotateCcw className="w-3 h-3" />
              필터 초기화
            </button>
          )}
        </div>
        <select
          value={sortOrder}
          title="정렬 기준"
          aria-label="정렬 기준"
          onChange={(e) => applyFilters({ sort: e.target.value as SortOrder })}
          className="w-full sm:w-auto text-xs border border-border/50 rounded-xl px-4 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
        >
          <option value="recommended">추천순</option>
          <option value="price_asc">가격 낮은순</option>
          <option value="price_desc">가격 높은순</option>
          <option value="newest">최신순</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: LIMIT }).map((_, i) => (
            <div key={i} className="border border-border/50 rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <>
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${totalPages <= 1 ? 'mb-20 md:mb-24' : ''}`}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onFileTypeClick={handleFileTypeClick}
                onTagClick={handleTagClick}
                categoryNames={getCategoryNames(product)}
                searchQuery={searchQuery}
              />
            ))}
          </div>
          <Pagination page={currentPage} totalPages={totalPages} onPage={handlePageChange} />
        </>
      ) : (
        <div className="text-center py-24">
          <p className="text-lg font-semibold text-foreground mb-2">검색 결과가 없습니다</p>
          <p className="text-sm text-muted-foreground mb-8">다른 키워드로 검색하거나 필터를 초기화해보세요</p>
          <div className="flex items-center justify-center gap-3 mb-12">
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full border border-border/50 hover:border-border hover:bg-muted text-sm font-semibold uppercase tracking-widest transition-all duration-300 cursor-pointer active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              필터 초기화
            </button>
            <Link
              href="/consulting"
              className="inline-flex items-center px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold uppercase tracking-widest hover:bg-primary/90 transition-all duration-300 active:scale-[0.98]"
            >
              컨설팅 문의
            </Link>
          </div>
          {popularProducts.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-6">인기 상품을 확인해보세요</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {popularProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onFileTypeClick={handleFileTypeClick}
                    onTagClick={handleTagClick}
                    categoryNames={getCategoryNames(product)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
