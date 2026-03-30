'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Search, ShoppingCart, Check } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import Link from 'next/link'
import { type DbProduct, type DbCategory, formatPrice, allTiers } from '@/lib/types'

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
  // Normalize: PPTX -> PPT, XLSX -> XLS, DOCX -> DOC for display
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

function ProductCard({ product, onFileTypeClick }: { product: DbProduct; onFileTypeClick: (type: string) => void }) {
  const tierInfo = allTiers.find((t) => t.id === product.tier)
  const discount = product.original_price > 0
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0
  const { toggleItem, isInCart } = useCartStore()
  const inCart = isInCart(product.id)

  const handleCartToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      originalPrice: product.original_price,
      thumbnail: product.thumbnail_url || '',
      format: product.format || '',
    })
  }

  return (
    <Link href={`/store/${product.id}`} className="group">
      <div className="border border-border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {product.thumbnail_url ? (
            <img src={product.thumbnail_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
              <span className="text-4xl">📄</span>
            </div>
          )}
          {tierInfo && (
            <Badge className={`absolute top-3 left-3 ${tierInfo.color} border text-xs`}>{tierInfo.label}</Badge>
          )}
          {product.is_free && (
            <Badge className="absolute top-3 right-3 bg-emerald-500 text-white border-0 text-xs">무료</Badge>
          )}
          {!product.is_free && discount > 0 && (
            <Badge className="absolute top-3 right-3 bg-red-500 text-white border-0 text-xs">-{discount}%</Badge>
          )}
          <button
            onClick={handleCartToggle}
            className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md ${
              inCart ? 'bg-primary text-primary-foreground' : 'bg-white/90 text-gray-600 hover:bg-white hover:text-primary'
            }`}
          >
            {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          </button>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{product.categories?.name || '문서'}</p>
            <FileTypeBadges format={product.format} onClick={onFileTypeClick} />
          </div>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center gap-2">
            {product.is_free ? (
              <span className="text-base font-bold text-emerald-600">무료</span>
            ) : (
              <>
                <span className="text-base font-bold text-primary">{formatPrice(product.price)}</span>
                {product.original_price > product.price && (
                  <span className="text-xs text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                )}
              </>
            )}
          </div>
          {product.tags && product.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {product.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] text-blue-500">#{tag}</span>
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
  const [products, setProducts] = useState<DbProduct[]>([])
  const [categories, setCategories] = useState<DbCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [prodRes, catRes] = await Promise.all([
        supabase.from('products').select('*, categories(id, name, slug)').eq('is_published', true).order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('sort_order'),
      ])
      setProducts(prodRes.data || [])
      setCategories(catRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory && p.category_id !== selectedCategory) return false
      if (selectedTier && p.tier !== selectedTier) return false
      if (selectedFileType) {
        const types = extractFileTypes(p.format)
        if (!types.includes(selectedFileType)) return false
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          p.title.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)) ||
          p.categories?.name?.toLowerCase().includes(q) ||
          (p.format || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [products, selectedCategory, selectedTier, selectedFileType, searchQuery])

  const handleFileTypeClick = (type: string) => {
    setSelectedFileType(selectedFileType === type ? null : type)
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">템플릿 스토어</h1>
        <p className="text-muted-foreground mt-1">공공조달 입찰에 필요한 모든 문서 템플릿</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="템플릿 검색 (예: 기술제안서, IoT, 스마트시티...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <div className="space-y-3 mb-8">
        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !selectedCategory ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            }`}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === cat.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 파일 형태 필터 */}
        <div className="flex flex-wrap gap-2">
          {allFileTypes.map((ft) => (
            <button
              key={ft.id}
              onClick={() => setSelectedFileType(selectedFileType === ft.id ? null : ft.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                selectedFileType === ft.id ? ft.color : 'border-border hover:bg-muted text-muted-foreground'
              }`}
            >
              {ft.label}
            </button>
          ))}
        </div>

        {/* 티어 필터 */}
        <div className="flex flex-wrap gap-2">
          {allTiers.map((tier) => (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(selectedTier === tier.id ? null : tier.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedTier === tier.id ? tier.color : 'border-border hover:bg-muted'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {filteredProducts.length}개 상품
        {selectedFileType && <span className="ml-2 text-xs">· 파일형태: {selectedFileType}</span>}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden animate-pulse">
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
            <ProductCard key={product.id} product={product} onFileTypeClick={handleFileTypeClick} />
          ))}
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">검색 결과가 없습니다</p>
          <p className="text-sm mt-2">다른 키워드로 검색해보세요</p>
        </div>
      )}
    </div>
  )
}
