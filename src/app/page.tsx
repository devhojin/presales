'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { type DbProduct, formatPrice } from '@/lib/types'
import { useCartStore } from '@/stores/cart-store'
import { FileText, Download, Globe, Handshake, ArrowRight, ShoppingCart, Check } from 'lucide-react'

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
      const [{ data }, { data: catData }] = await Promise.all([
        supabase
          .from('products')
          .select('*, categories(id, name, slug)')
          .eq('is_published', true)
          .order('download_count', { ascending: false })
          .limit(8),
        supabase.from('categories').select('id, name').order('sort_order'),
      ])
      setProducts(data || [])
      setCategories(catData || [])
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

      {/* Featured Products */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold">인기 템플릿</h2>
              <p className="text-muted-foreground mt-1">가장 많이 찾는 공공조달 문서 템플릿</p>
            </div>
            <Link href="/store" className="inline-flex items-center h-9 px-4 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium transition-colors">
              전체보기 <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.slice(0, 4).map((product) => (
              <FeaturedCard key={product.id} product={product} categoryNames={getCategoryNames(product)} />
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
