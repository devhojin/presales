'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { type DbProduct, formatPrice } from '@/lib/types'
import { useCartStore } from '@/stores/cart-store'
import { useToastStore } from '@/stores/toast-store'
import { FileText, Download, Globe, Handshake, ArrowRight, ShoppingCart, Check, Star, Quote } from 'lucide-react'

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
  emoji: string
  slug: string
  count: number
}

const CATEGORY_META: Record<number, { emoji: string; slug: string }> = {
  1: { emoji: '📋', slug: 'technical-proposal' },
  2: { emoji: '📖', slug: 'bidding-guide' },
  3: { emoji: '🎤', slug: 'presentation' },
  4: { emoji: '💰', slug: 'price-proposal' },
  5: { emoji: '📦', slug: 'full-package' },
  6: { emoji: '📊', slug: 'business-plan' },
}

function FeaturedCardSkeleton() {
  return (
    <div className="border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-4 space-y-3">
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
      <div className="border border-border rounded-xl overflow-hidden bg-card hover:shadow-md transition-all duration-300 hover:-translate-y-1">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {product.thumbnail_url ? (
            <img src={product.thumbnail_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center"><span className="text-4xl">📄</span></div>
          )}
          <Badge className={`absolute top-3 left-3 border text-xs ${product.is_free ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
            {product.is_free ? '무료' : '유료'}
          </Badge>
          {!product.is_free && discount > 0 && <Badge className="absolute top-3 right-3 bg-red-500 text-white border-0 text-xs">-{discount}%</Badge>}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); const wasInCart = inCart; toggleItem({ productId: product.id, title: product.title, price: product.price, originalPrice: product.original_price, thumbnail: product.thumbnail_url || '', format: product.format || '' }); addToast(wasInCart ? '장바구니에서 제거되었습니다' : '장바구니에 추가되었습니다', wasInCart ? 'info' : 'success') }}
            className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md ${inCart ? 'bg-primary text-primary-foreground' : 'bg-white/90 text-gray-600 hover:bg-white hover:text-primary'}`}
          >
            {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          </button>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex gap-1 flex-wrap">
            {categoryNames.map((name) => (
              <span key={name} className="text-xs text-muted-foreground">{name}</span>
            ))}
          </div>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">{product.title}</h3>
          <div className="flex items-center gap-2">
            {product.is_free ? <span className="text-base font-bold text-emerald-600">무료</span> : (
              <>
                <span className="text-base font-bold text-primary">{formatPrice(product.price)}</span>
                {product.original_price > product.price && <span className="text-xs text-muted-foreground line-through">{formatPrice(product.original_price)}</span>}
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
        </div>
      </div>
    </Link>
  )
}

export default function Home() {
  const [products, setProducts] = useState<DbProduct[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([])
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // Parallel fetch: products, categories, stats, reviews
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
        supabase.from('categories').select('id, name').order('sort_order'),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase
          .from('reviews')
          .select('comment, rating, profiles(name)')
          .gte('rating', 4)
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      setCategories(catData || [])

      // Stats: product count, download sum, review avg
      const allProducts = allData || []
      const totalDownloads = allProducts.reduce((sum, p) => sum + (p.download_count || 0), 0)

      // Calculate review average from all products that have reviews
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

      // Category counts
      const catCountMap = new Map<number, number>()
      allProducts.forEach(p => {
        const catIds = p.category_ids && p.category_ids.length > 0
          ? p.category_ids
          : p.category_id ? [p.category_id] : []
        catIds.forEach((cid: number) => catCountMap.set(cid, (catCountMap.get(cid) || 0) + 1))
      })
      const dynamicCats: CategoryCount[] = (catData || []).map((c: { id: number; name: string }) => ({
        id: c.id,
        name: c.name,
        emoji: CATEGORY_META[c.id]?.emoji || '📁',
        slug: CATEGORY_META[c.id]?.slug || '',
        count: catCountMap.get(c.id) || 0,
      }))
      setCategoryCounts(dynamicCats)

      // Reviews from DB
      if (reviewsData && reviewsData.length > 0) {
        const mapped: ReviewData[] = reviewsData.map((r: Record<string, unknown>) => {
          const profiles = r.profiles as { name?: string } | null
          const name = profiles?.name || '익명'
          return {
            text: (r.comment as string) || '',
            author: name.length > 1 ? name[0] + 'OO' : name,
            role: '고객',
            rating: r.rating as number,
          }
        }).filter((r: ReviewData) => r.text.length > 0)
        setReviews(mapped)
      }

      // Featured products: is_published, price > 0, top 6 by download_count
      const featured = [...allProducts]
        .filter(p => !p.is_free && p.price > 0)
        .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
        .slice(0, 6)

      // If not enough paid products, fill with free ones
      if (featured.length < 6) {
        const freeOnes = allProducts
          .filter(p => p.is_free && !featured.some(f => f.id === p.id))
          .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
        featured.push(...freeOnes.slice(0, 6 - featured.length))
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

  // Build dynamic stats display
  const statsDisplay = []
  if (stats) {
    statsDisplay.push({ emoji: '📄', value: `${stats.productCount}종`, label: '전문 템플릿' })
    statsDisplay.push({ emoji: '📥', value: stats.downloadCount > 0 ? `${stats.downloadCount.toLocaleString()}+` : '0', label: '누적 다운로드' })
    if (stats.reviewAvg !== null) {
      statsDisplay.push({ emoji: '⭐', value: `${(stats.reviewAvg * 20).toFixed(0)}%`, label: '고객 만족도' })
    }
    statsDisplay.push({ emoji: '🏛️', value: '17년', label: '공공조달 전문' })
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0B1629] via-[#132744] to-[#1a3a5c] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-3xl">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 mb-6">공공조달 제안서 전문 플랫폼</Badge>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
              공공조달의 복잡함을<br /><span className="text-blue-400">문서로 단순하게</span>
            </h1>
            <p className="text-lg text-blue-100/80 mb-8 max-w-xl leading-relaxed">
              나라장터·조달청 입찰에 최적화된 기술제안서, 가격제안서, 발표PT 템플릿. 실전 경험이 녹아든 문서로 수주 확률을 높이세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/store" className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-colors">
                문서 스토어 둘러보기 <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link href="/consulting" className="inline-flex items-center justify-center h-11 px-6 rounded-lg border border-blue-400/30 text-blue-200 hover:bg-blue-500/10 font-medium text-sm transition-colors">
                전문가 컨설팅 알아보기
              </Link>
            </div>
          </div>
        </div>

        {/* 실적 카운터 */}
        {statsDisplay.length > 0 && (
          <div className="relative z-10 bg-white shadow-sm">
            <div className="container mx-auto px-4 py-6">
              <div className={`grid grid-cols-2 ${statsDisplay.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-6 md:gap-0 md:divide-x md:divide-gray-200`}>
                {statsDisplay.map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center text-center py-2">
                    <span className="text-2xl mb-1">{stat.emoji}</span>
                    <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                    <span className="text-xs text-gray-500 mt-0.5">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Value Props */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: FileText, title: '실전 제안서', desc: '실제 수주 성공한 제안서 기반 템플릿' },
              { icon: Download, title: '즉시 다운로드', desc: '결제 즉시 원본 파일 다운로드' },
              { icon: Globe, title: '나라장터 최적화', desc: '공공조달 평가기준에 맞춘 구조' },
              { icon: Handshake, title: '전문가 컨설팅', desc: '입찰 전략부터 발표까지 1:1 코칭' },
            ].map((item, i) => (
              <div key={i} className="text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 카테고리 쇼케이스 */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">카테고리별 탐색</h2>
            <p className="text-muted-foreground">필요한 문서 유형을 빠르게 찾아보세요</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categoryCounts.map((cat) => (
              <Link
                key={cat.id}
                href={`/store?category=${cat.id}`}
                className="group flex flex-col items-center justify-center p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-md transition-all duration-200 text-center cursor-pointer"
              >
                <span className="text-3xl mb-2">{cat.emoji}</span>
                <span className="font-semibold text-sm group-hover:text-primary transition-colors">{cat.name}</span>
                <span className="text-xs text-muted-foreground mt-1">{cat.count}개</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 에디터 추천 상품 */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">BEST</Badge>
                <h2 className="text-2xl font-bold">인기 상품</h2>
              </div>
              <p className="text-muted-foreground">다운로드 수 기준 가장 인기 있는 템플릿</p>
            </div>
            <Link href="/store" className="inline-flex items-center h-10 min-h-[44px] px-4 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium transition-colors">
              전체보기 <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingProducts
              ? Array.from({ length: 6 }).map((_, i) => <FeaturedCardSkeleton key={i} />)
              : products.slice(0, 6).map((product) => (
                  <FeaturedCard key={product.id} product={product} categoryNames={getCategoryNames(product)} />
                ))
            }
          </div>
        </div>
      </section>

      {/* 고객 후기 — DB에 리뷰가 있을 때만 표시 */}
      {reviews.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold mb-2">고객 후기</h2>
              <p className="text-muted-foreground">실제 고객들의 성공 경험을 확인하세요</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.map((t, i) => (
                <div key={i} className="relative bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <Quote className="w-8 h-8 text-primary/20 mb-4" />
                  <p className="text-sm leading-relaxed text-foreground/80 mb-5">{t.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
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

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">첫 입찰, 어디서부터 시작해야 할지 모르겠다면?</h2>
          <p className="text-blue-100/80 mb-8 max-w-lg mx-auto">무료 입찰 가이드부터 전문가 1:1 컨설팅까지. 프리세일즈가 함께합니다.</p>
          <Link href="/consulting" className="inline-flex items-center justify-center h-11 px-8 rounded-lg bg-white text-blue-700 hover:bg-blue-50 font-medium text-sm transition-colors">컨설팅 상담 신청</Link>
        </div>
      </section>
    </div>
  )
}
