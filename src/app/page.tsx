'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { type DbProduct, formatPrice } from '@/lib/types'
import { useCartStore } from '@/stores/cart-store'
import { FileText, Download, Globe, Handshake, ArrowRight, ShoppingCart, Check, Star, Quote } from 'lucide-react'

// 추천 상품 ID (주력 유료 상품)
const FEATURED_IDS = [19, 40, 37, 44, 45, 43]

// 실적 수치 통계
const STATS = [
  { emoji: '📄', value: '51종', label: '전문 템플릿' },
  { emoji: '📥', value: '1,200+', label: '누적 다운로드' },
  { emoji: '⭐', value: '98%', label: '고객 만족도' },
  { emoji: '🏛️', value: '17년', label: '공공조달 전문' },
]

// 카테고리 쇼케이스 (id, name, emoji, count 하드코딩)
const CATEGORY_SHOWCASE = [
  { id: 1, name: '기술제안서', emoji: '📋', count: 28, slug: 'technical-proposal' },
  { id: 2, name: '입찰 가이드', emoji: '📖', count: 8, slug: 'bidding-guide' },
  { id: 3, name: '발표자료', emoji: '🎤', count: 4, slug: 'presentation' },
  { id: 4, name: '가격제안', emoji: '💰', count: 2, slug: 'price-proposal' },
  { id: 5, name: '풀 패키지', emoji: '📦', count: 1, slug: 'full-package' },
  { id: 6, name: '사업계획서', emoji: '📊', count: 3, slug: 'business-plan' },
]

// 고객 후기
const TESTIMONIALS = [
  {
    text: '나라장터 입찰 3번 만에 수주 성공! 제안서 구조를 참고한 것이 결정적이었습니다.',
    author: '김OO',
    role: 'IT 기업 PM',
  },
  {
    text: '예비창업패키지 사업계획서 합격! 구성과 흐름을 그대로 활용했습니다.',
    author: '이OO',
    role: '스타트업 대표',
  },
  {
    text: '산출물 템플릿 덕분에 프로젝트 착수 시간을 2주나 단축했습니다.',
    author: '박OO',
    role: 'PMO 컨설턴트',
  },
]

function FeaturedCard({ product, categoryNames }: { product: DbProduct; categoryNames: string[] }) {
  const discount = product.original_price > 0 ? Math.round((1 - product.price / product.original_price) * 100) : 0
  const { toggleItem, isInCart } = useCartStore()
  const inCart = isInCart(product.id)

  return (
    <Link href={`/store/${product.id}`} className="group">
      <div className="border border-border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
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
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleItem({ productId: product.id, title: product.title, price: product.price, originalPrice: product.original_price, thumbnail: product.thumbnail_url || '', format: product.format || '' }) }}
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
        </div>
      </div>
    </Link>
  )
}

export default function Home() {
  const [products, setProducts] = useState<DbProduct[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: allData }, { data: catData }] = await Promise.all([
        supabase
          .from('products')
          .select('*, categories(id, name, slug)')
          .eq('is_published', true),
        supabase.from('categories').select('id, name').order('sort_order'),
      ])
      setCategories(catData || [])

      // 추천 상품 ID 순서대로 정렬, 없으면 가격 높은 순 fallback
      const allProducts = allData || []
      const featuredMap = new Map(allProducts.map((p) => [p.id, p]))
      const featured = FEATURED_IDS.map((id) => featuredMap.get(id)).filter(Boolean) as DbProduct[]
      // fallback: 추천 상품이 부족하면 가격 높은 순으로 채움
      if (featured.length < 6) {
        const extra = allProducts
          .filter((p) => !FEATURED_IDS.includes(p.id) && !p.is_free)
          .sort((a, b) => b.price - a.price)
        featured.push(...extra.slice(0, 6 - featured.length))
      }
      setProducts(featured)
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
                템플릿 스토어 둘러보기 <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link href="/consulting" className="inline-flex items-center justify-center h-11 px-6 rounded-lg border border-blue-400/30 text-blue-200 hover:bg-blue-500/10 font-medium text-sm transition-colors">
                전문가 컨설팅 알아보기
              </Link>
            </div>
          </div>
        </div>

        {/* 실적 카운터 */}
        <div className="relative z-10 border-t border-blue-500/20 bg-white/5 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-blue-500/20">
              {STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center text-center py-2">
                  <span className="text-2xl mb-1">{stat.emoji}</span>
                  <span className="text-2xl font-bold text-white">{stat.value}</span>
                  <span className="text-xs text-blue-200/70 mt-0.5">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16 bg-muted/30">
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
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">카테고리별 탐색</h2>
            <p className="text-muted-foreground mt-1">필요한 문서 유형을 빠르게 찾아보세요</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORY_SHOWCASE.map((cat) => (
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
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">BEST</Badge>
                <h2 className="text-2xl font-bold">에디터 추천</h2>
              </div>
              <p className="text-muted-foreground">전문가가 엄선한 공공조달 핵심 문서 템플릿</p>
            </div>
            <Link href="/store" className="inline-flex items-center h-9 px-4 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium transition-colors">
              전체보기 <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.slice(0, 6).map((product) => (
              <FeaturedCard key={product.id} product={product} categoryNames={getCategoryNames(product)} />
            ))}
          </div>
        </div>
      </section>

      {/* 고객 후기 */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold">고객 후기</h2>
            <p className="text-muted-foreground mt-1">실제 고객들의 성공 경험을 확인하세요</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
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
                      <Star key={si} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">첫 입찰, 어디서부터 시작해야 할지 모르겠다면?</h2>
          <p className="text-blue-100/80 mb-8 max-w-lg mx-auto">무료 입찰 가이드부터 전문가 1:1 컨설팅까지. 프리세일즈가 함께합니다.</p>
          <Link href="/consulting" className="inline-flex items-center justify-center h-11 px-8 rounded-lg bg-white text-blue-700 hover:bg-blue-50 font-medium text-sm transition-colors">컨설팅 상담 신청</Link>
        </div>
      </section>
    </div>
  )
}
