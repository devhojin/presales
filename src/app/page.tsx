'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { type DbProduct, formatPrice } from '@/lib/types'
import { useCartStore } from '@/stores/cart-store'
import { useToastStore } from '@/stores/toast-store'
import { FileText, Download, Globe, Handshake, ArrowRight, ShoppingCart, Check, Star, Quote, ChevronRight } from 'lucide-react'

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

const CATEGORY_ICONS: Record<number, typeof FileText> = {
  1: FileText,
  2: FileText,
  3: FileText,
  4: FileText,
  5: FileText,
  6: FileText,
}

const CATEGORY_SLUGS: Record<number, string> = {
  1: 'technical-proposal',
  2: 'bidding-guide',
  3: 'presentation',
  4: 'price-proposal',
  5: 'full-package',
  6: 'business-plan',
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
            {product.is_free ? 'FREE' : 'PREMIUM'}
          </Badge>
          {!product.is_free && discount > 0 && <Badge className="absolute top-3 right-3 bg-red-500 text-white border-0 text-[10px]">-{discount}%</Badge>}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); const wasInCart = inCart; toggleItem({ productId: product.id, title: product.title, price: product.price, originalPrice: product.original_price, thumbnail: product.thumbnail_url || '', format: product.format || '' }); addToast(wasInCart ? '장바구니에서 제거되었습니다' : '장바구니에 추가되었습니다', wasInCart ? 'info' : 'success') }}
            className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 active:scale-[0.92] ${inCart ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white/95 text-zinc-500 hover:text-primary shadow-md'}`}
          >
            {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          </button>
        </div>
        <div className="p-5 space-y-2.5">
          <div className="flex gap-1.5 flex-wrap">
            {categoryNames.map((name) => (
              <span key={name} className="text-[11px] text-muted-foreground font-medium">{name}</span>
            ))}
          </div>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300">{product.title}</h3>
          <div className="flex items-center gap-2">
            {product.is_free ? <span className="text-base font-bold text-primary">무료</span> : (
              <>
                <span className="text-base font-bold text-foreground">{formatPrice(product.price)}</span>
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
      const dynamicCats: CategoryCount[] = (catData || []).map((c: { id: number; name: string }) => ({
        id: c.id,
        name: c.name,
        icon: CATEGORY_ICONS[c.id] || FileText,
        slug: CATEGORY_SLUGS[c.id] || '',
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

      const featured = [...allProducts]
        .filter(p => !p.is_free && p.price > 0)
        .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
        .slice(0, 6)

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

  return (
    <div>
      {/* Hero — Asymmetric Split Layout */}
      <section className="relative min-h-[100dvh] flex items-center bg-[#0C1220] text-white overflow-hidden">
        {/* Subtle gradient orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-30%] left-[-10%] w-[500px] h-[500px] bg-blue-700/5 rounded-full blur-[100px]" />

        <div className="max-w-[1400px] mx-auto px-4 md:px-8 w-full py-20 md:py-0 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
            {/* Left: Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] font-medium tracking-wide text-blue-300 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                실제 낙찰된 제안서만 판매합니다
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-[1.08]">
                낙찰받은 기업들의<br />
                제안서가
                <span className="block text-blue-400 mt-1">여기 있습니다</span>
              </h1>

              <p className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-[480px]">
                나라장터·조달청 실제 낙찰 기업이 사용한 기술제안서, 가격제안서, 발표PT 템플릿.
                처음부터 다시 쓰지 마세요.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/store"
                  className="inline-flex items-center justify-center h-12 px-7 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-medium text-sm transition-all duration-300 active:scale-[0.98] shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                >
                  낙찰 제안서 보러가기
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
                <Link
                  href="/consulting"
                  className="inline-flex items-center justify-center h-12 px-7 rounded-full border border-white/[0.12] text-zinc-300 hover:bg-white/[0.06] font-medium text-sm transition-all duration-300"
                >
                  입찰 전략 무료 상담
                </Link>
              </div>
            </div>

            {/* Right: Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: '실전 검증', label: '낙찰 기록 보유', accent: false },
                { value: '6개 분야', label: '실전 제안서 보유', accent: true },
                { value: '1:1', label: '낙찰 전략 컨설팅', accent: true },
                { value: '100%', label: '수정 가능한 원본 제공', accent: false },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl p-6 md:p-8 ${
                    stat.accent
                      ? 'bg-blue-500/[0.08] border border-blue-500/[0.12]'
                      : 'bg-white/[0.04] border border-white/[0.06]'
                  }`}
                >
                  <p className="text-2xl md:text-3xl font-bold tracking-tight text-white">{stat.value}</p>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Value Props — Horizontal scroll on mobile, grid on desktop */}
      <section className="py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: FileText, title: '실전 제안서', desc: '실제 수주에 성공한 제안서 그대로. 어떤 구조로, 어떤 말로 평가위원을 설득했는지 확인하세요.' },
              { icon: Download, title: '즉시 다운로드', desc: '결제 후 5초 안에 PPT/HWP 원본 파일을 받습니다. 폰트·구조 전부 수정 가능.' },
              { icon: Globe, title: '나라장터 최적화', desc: '나라장터 평가표 항목별로 점수를 챙기는 구조. 감점 포인트를 미리 막습니다.' },
              { icon: Handshake, title: '전문가 컨설팅', desc: '공고 분석부터 발표 리허설까지. 공공조달 전문가가 낙찰 전략을 함께 짭니다.' },
            ].map((item) => (
              <div key={item.title} className="group p-6 md:p-8 rounded-2xl border border-border/50 bg-card hover:border-primary/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-500">
                <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center mb-5 group-hover:bg-primary/12 transition-colors duration-500">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2 tracking-tight">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Showcase */}
      <section className="py-24 md:py-32 bg-card border-y border-border/50">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">CATEGORIES</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">카테고리별 탐색</h2>
            </div>
            <Link href="/store" className="hidden md:inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
              전체보기
              <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categoryCounts.map((cat) => (
              <Link
                key={cat.id}
                href={`/store?category=${cat.id}`}
                aria-label={`${cat.name} 카테고리 보기`}
                className="group flex flex-col items-center justify-center p-6 rounded-2xl border border-border/50 bg-background hover:border-primary/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-500 text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-3 group-hover:bg-primary/12 transition-colors duration-500">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <span className="font-semibold text-sm tracking-tight group-hover:text-primary transition-colors duration-300">{cat.name}</span>
                <span className="text-xs text-muted-foreground mt-1">{cat.count}개</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-semibold text-primary uppercase tracking-widest">BEST SELLERS</p>
                <Badge className="bg-amber-50 text-amber-700 border-amber-200/50 text-[10px] font-semibold">TOP</Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">인기 상품</h2>
              <p className="text-muted-foreground mt-2">실제 낙찰 후기가 달린 인기 제안서</p>
            </div>
            <Link
              href="/store"
              className="hidden md:inline-flex items-center h-10 px-5 rounded-full border border-border bg-card hover:bg-muted text-sm font-medium transition-all duration-300 group"
            >
              전체보기
              <ArrowRight className="ml-1.5 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {loadingProducts
              ? Array.from({ length: 6 }).map((_, i) => <FeaturedCardSkeleton key={i} />)
              : products.slice(0, 6).map((product) => (
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
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">TESTIMONIALS</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">낙찰 후기</h2>
              <p className="text-muted-foreground mt-2">"이 제안서로 실제 수주했습니다"</p>
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
