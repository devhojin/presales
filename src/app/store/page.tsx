'use client'

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Search, ShoppingCart, Check, Star, RotateCcw, ChevronDown, FileText, Store } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { useToastStore } from '@/stores/toast-store'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { type DbProduct, type DbCategory, formatPrice, priceTypes } from '@/lib/types'

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
  const parts = text.split(regex)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-100 px-0.5 rounded">{part}</mark> : part
  )
}

function ProductCard({ product, onFileTypeClick, categoryNames, searchQuery }: { product: DbProduct; onFileTypeClick: (type: string) => void; categoryNames: string[]; searchQuery?: string }) {
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
    addToast(wasInCart ? '장바구니에서 제거되었습니다' : '장바구니에 추가되었습니다', wasInCart ? 'info' : 'success')
  }

  return (
    <Link href={`/store/${product.id}`} className="group">
      <div className="border border-border/50 rounded-2xl overflow-hidden bg-card hover:border-border hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {product.thumbnail_url ? (
            <Image src={product.thumbnail_url} alt={product.title} width={400} height={300} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-900 to-emerald-700 flex items-center justify-center">
              <FileText className="w-12 h-12 text-emerald-100 opacity-60" />
            </div>
          )}
          <Badge className={`absolute top-3 left-3 border text-xs font-semibold uppercase tracking-widest ${product.is_free ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
            {product.is_free ? 'FREE' : 'PREMIUM'}
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
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300">
            {searchQuery ? highlightText(product.title, searchQuery) : product.title}
          </h3>
          <div className="flex items-center gap-2">
            {product.is_free ? (
              <span className="text-base font-bold text-primary">FREE</span>
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
                <span key={tag} className="text-[10px] text-primary">#{tag}</span>
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

export default function StorePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [products, setProducts] = useState<DbProduct[]>([])
  const [categories, setCategories] = useState<DbCategory[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set())
  const [selectedPriceType, setSelectedPriceType] = useState<string | null>(null)
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null)
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'recommended' | 'price_asc' | 'price_desc' | 'newest'>('recommended')
  const [loading, setLoading] = useState(true)
  const [popularProducts, setPopularProducts] = useState<DbProduct[]>([])
  const [showDetailFilter, setShowDetailFilter] = useState(false)

  // Initialize from URL params
  useEffect(() => {
    const catParam = searchParams.get('category')
    if (catParam) {
      const catIds = catParam.split(',').map(Number).filter(Boolean)
      if (catIds.length > 0) setSelectedCategories(new Set(catIds))
    }
    const priceParam = searchParams.get('price')
    if (priceParam === 'free' || priceParam === 'paid') setSelectedPriceType(priceParam)
    const searchParam = searchParams.get('q')
    if (searchParam) setSearchQuery(searchParam)
    const sortParam = searchParams.get('sort')
    if (sortParam && ['recommended', 'price_asc', 'price_desc', 'newest'].includes(sortParam)) {
      setSortOrder(sortParam as typeof sortOrder)
    }
    const fileTypeParam = searchParams.get('fileType')
    if (fileTypeParam && ['PPT', 'PDF', 'XLS', 'DOC', 'HWP', 'ZIP'].includes(fileTypeParam)) {
      setSelectedFileType(fileTypeParam)
    }
  }, [searchParams])

  // Sync state to URL
  const updateURL = useCallback((cats: Set<number>, price: string | null, query: string, sort: string, fileType?: string | null) => {
    const params = new URLSearchParams()
    if (cats.size > 0) params.set('category', Array.from(cats).join(','))
    if (price) params.set('price', price)
    if (query) params.set('q', query)
    if (sort !== 'recommended') params.set('sort', sort)
    if (fileType) params.set('fileType', fileType)
    const qs = params.toString()
    router.replace(qs ? `/store?${qs}` : '/store', { scroll: false })
  }, [router])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [prodRes, catRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('is_published', true)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('sort_order'),
      ])
      if (prodRes.error) console.error('[Store] products error:', prodRes.error.message)
      if (catRes.error) console.error('[Store] categories error:', catRes.error.message)
      const allProducts = prodRes.data || []
      setProducts(allProducts)
      setCategories(catRes.data || [])
      // Popular products for empty state
      const popular = [...allProducts]
        .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
        .slice(0, 4)
      setPopularProducts(popular)
      setLoading(false)
    }
    load()
  }, [])

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>()
    categories.forEach((c) => map.set(c.id, c.name))
    return map
  }, [categories])

  const getCategoryNames = (product: DbProduct): string[] => {
    if (product.category_ids && product.category_ids.length > 0) {
      return product.category_ids.map((id) => categoryMap.get(id) || '').filter(Boolean)
    }
    if (product.categories?.name) return [product.categories.name]
    return ['문서']
  }

  const toggleCategory = (catId: number) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      updateURL(next, selectedPriceType, searchQuery, sortOrder, selectedFileType)
      return next
    })
  }

  const hasActiveFilters = selectedCategories.size > 0 || selectedPriceType !== null || selectedFileType !== null || selectedPriceRange !== null || searchQuery !== ''

  // Count detail filters (file type + price type + price range) for badge
  const detailFilterCount = (selectedFileType ? 1 : 0) + (selectedPriceType ? 1 : 0) + (selectedPriceRange ? 1 : 0)

  const resetFilters = () => {
    setSelectedCategories(new Set())
    setSelectedPriceType(null)
    setSelectedFileType(null)
    setSelectedPriceRange(null)
    setSearchQuery('')
    setSortOrder('recommended')
    router.replace('/store', { scroll: false })
  }

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      if (selectedCategories.size > 0) {
        const productCatIds = p.category_ids && p.category_ids.length > 0
          ? p.category_ids
          : p.category_id ? [p.category_id] : []
        const hasOverlap = productCatIds.some((id) => selectedCategories.has(id))
        if (!hasOverlap) return false
      }
      if (selectedPriceType === 'free' && !p.is_free) return false
      if (selectedPriceType === 'paid' && p.is_free) return false
      if (selectedPriceRange) {
        if (selectedPriceRange === 'free' && !p.is_free) return false
        if (selectedPriceRange === 'under50k' && (p.is_free || p.price > 50000)) return false
        if (selectedPriceRange === '50k_100k' && (p.price <= 50000 || p.price > 100000)) return false
        if (selectedPriceRange === 'over100k' && p.price <= 100000) return false
      }
      if (selectedFileType) {
        const types = extractFileTypes(p.format)
        if (!types.includes(selectedFileType)) return false
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          p.title.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)) ||
          (p.description || '').toLowerCase().includes(q)
        )
      }
      return true
    })

    if (sortOrder === 'price_asc') {
      return [...filtered].sort((a, b) => a.price - b.price)
    } else if (sortOrder === 'price_desc') {
      return [...filtered].sort((a, b) => b.price - a.price)
    } else if (sortOrder === 'newest') {
      return [...filtered].sort((a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      )
    }
    return filtered
  }, [products, selectedCategories, selectedPriceType, selectedFileType, selectedPriceRange, searchQuery, sortOrder, categoryMap])

  const handleFileTypeClick = (type: string) => {
    const newFileType = selectedFileType === type ? null : type
    setSelectedFileType(newFileType)
    updateURL(selectedCategories, selectedPriceType, searchQuery, sortOrder, newFileType)
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      <div className="py-8 md:py-12">
        <div className="flex items-center gap-3 mb-3">
          <Store className="w-7 h-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">문서 스토어</h1>
        </div>
        <p className="text-muted-foreground">공공조달 입찰에 필요한 모든 문서 템플릿</p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="템플릿 검색 (예: 기술제안서, IoT, 스마트시티...)"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            updateURL(selectedCategories, selectedPriceType, e.target.value, sortOrder)
          }}
          className="w-full pl-12 pr-6 py-3 border border-border/50 rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      <div className="space-y-4 mb-10">
        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedCategories(new Set())
              updateURL(new Set(), selectedPriceType, searchQuery, sortOrder)
            }}
            className={`px-4 py-2 min-h-[40px] rounded-full text-xs font-semibold uppercase tracking-widest border transition-all duration-300 ${
              selectedCategories.size === 0 ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 hover:border-border hover:bg-muted'
            }`}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`px-4 py-2 min-h-[40px] rounded-full text-xs font-semibold uppercase tracking-widest border transition-all duration-300 ${
                selectedCategories.has(cat.id) ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 hover:border-border hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 상세 필터 토글 */}
        <button
          onClick={() => setShowDetailFilter(!showDetailFilter)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest border border-border/50 hover:border-border hover:bg-muted transition-all duration-300 cursor-pointer"
        >
          상세 필터
          {detailFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
              {detailFilterCount}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showDetailFilter ? 'rotate-180' : ''}`} />
        </button>

        {showDetailFilter && (
          <div className="space-y-4 pl-4 border-l border-border/50">
            {/* 파일 형태 필터 */}
            <div className="flex flex-wrap gap-2">
              {allFileTypes.map((ft) => (
                <button
                  key={ft.id}
                  onClick={() => {
                    const newFileType = selectedFileType === ft.id ? null : ft.id
                    setSelectedFileType(newFileType)
                    updateURL(selectedCategories, selectedPriceType, searchQuery, sortOrder, newFileType)
                  }}
                  className={`px-4 py-2 min-h-[40px] rounded-full text-xs font-bold border transition-all duration-300 ${
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
                  onClick={() => {
                    const newRange = selectedPriceRange === pr.id ? null : pr.id
                    setSelectedPriceRange(newRange)
                  }}
                  className={`px-4 py-2 min-h-[40px] rounded-full text-xs font-semibold uppercase tracking-widest border transition-all duration-300 ${
                    selectedPriceRange === pr.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border/50 hover:border-border hover:bg-muted'
                  }`}
                >
                  {pr.label}
                </button>
              ))}
            </div>

            {/* 무료/유료 필터 */}
            <div className="flex flex-wrap gap-2">
              {priceTypes.map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => {
                    const newPrice = selectedPriceType === pt.id ? null : pt.id
                    setSelectedPriceType(newPrice)
                    updateURL(selectedCategories, newPrice, searchQuery, sortOrder, selectedFileType)
                  }}
                  className={`px-4 py-2 min-h-[40px] rounded-full text-xs font-semibold uppercase tracking-widest border transition-all duration-300 ${
                    selectedPriceType === pt.id ? pt.color : 'border-border/50 hover:border-border hover:bg-muted'
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length}개 상품
            {selectedFileType && <span className="ml-2 text-xs">· 파일형태: {selectedFileType}</span>}
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
          onChange={(e) => {
            const newSort = e.target.value as typeof sortOrder
            setSortOrder(newSort)
            updateURL(selectedCategories, selectedPriceType, searchQuery, newSort)
          }}
          className="text-xs border border-border/50 rounded-xl px-4 py-2.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
        >
          <option value="recommended">기본순</option>
          <option value="price_asc">가격 낮은순</option>
          <option value="price_desc">가격 높은순</option>
          <option value="newest">최신순</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onFileTypeClick={handleFileTypeClick} categoryNames={getCategoryNames(product)} searchQuery={searchQuery} />
          ))}
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
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
                  <ProductCard key={product.id} product={product} onFileTypeClick={handleFileTypeClick} categoryNames={getCategoryNames(product)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
