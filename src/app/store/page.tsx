'use client'

import { useState } from 'react'
import { ProductCard } from '@/components/ProductCard'
import { products, allCategories, allTiers } from '@/lib/data'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

export default function StorePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProducts = products.filter((p) => {
    if (selectedCategory && p.category !== selectedCategory) return false
    if (selectedTier && p.tier !== selectedTier) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        p.title.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">템플릿 스토어</h1>
        <p className="text-muted-foreground mt-1">
          공공조달 입찰에 필요한 모든 문서 템플릿
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="템플릿 검색 (예: 기술제안서, SI, 발표PT...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !selectedCategory
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            }`}
          >
            전체
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
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

      {/* Results */}
      <p className="text-sm text-muted-foreground mb-4">
        {filteredProducts.length}개 상품
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {filteredProducts.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">검색 결과가 없습니다</p>
          <p className="text-sm mt-2">다른 키워드로 검색해보세요</p>
        </div>
      )}
    </div>
  )
}
