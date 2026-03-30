'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { type DbProduct, formatPrice, allTiers } from '@/lib/types'
import { useCartStore } from '@/stores/cart-store'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, ShoppingCart, Heart, Check, Download } from 'lucide-react'

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [product, setProduct] = useState<DbProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [related, setRelated] = useState<DbProduct[]>([])
  const { toggleItem, isInCart } = useCartStore()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select('*, categories(id, name, slug)')
        .eq('id', Number(id))
        .single()

      if (data) {
        setProduct(data)
        // Load related
        const { data: rel } = await supabase
          .from('products')
          .select('*, categories(id, name, slug)')
          .eq('is_published', true)
          .eq('category_id', data.category_id)
          .neq('id', data.id)
          .limit(3)
        setRelated(rel || [])
      }
      setLoading(false)
    }
    load()
  }, [id])

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

  const tierInfo = allTiers.find((t) => t.id === product.tier)
  const discount = product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0
  const inCart = isInCart(product.id)

  return (
    <div className="container mx-auto px-4 py-10">
      <Link href="/store" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> 스토어로 돌아가기
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image */}
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
          {product.thumbnail_url ? (
            <img src={product.thumbnail_url} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
              <span className="text-6xl">📄</span>
            </div>
          )}
          {tierInfo && (
            <Badge className={`absolute top-4 left-4 ${tierInfo.color} border`}>{tierInfo.label}</Badge>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{product.categories?.name || '문서'}</p>
            <h1 className="text-2xl font-bold">{product.title}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            {product.is_free ? (
              <span className="text-3xl font-bold text-emerald-600">무료</span>
            ) : (
              <>
                <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
                {product.original_price > product.price && (
                  <span className="text-lg text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                )}
                {discount > 0 && <Badge className="bg-red-500 text-white border-0">-{discount}%</Badge>}
              </>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            {product.format && (
              <div>
                <p className="text-muted-foreground">파일 형식</p>
                <p className="font-medium">{product.format}</p>
              </div>
            )}
            {product.pages && (
              <div>
                <p className="text-muted-foreground">페이지 수</p>
                <p className="font-medium">{product.pages}p</p>
              </div>
            )}
            {product.file_size && (
              <div>
                <p className="text-muted-foreground">파일 크기</p>
                <p className="font-medium">{product.file_size}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">카테고리</p>
              <p className="font-medium">{product.categories?.name || '-'}</p>
            </div>
          </div>

          <Separator />

          {product.description && !product.description_html && (
            <div>
              <h3 className="font-semibold mb-2">상품 설명</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )}

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => toggleItem({
                productId: product.id,
                title: product.title,
                price: product.price,
                originalPrice: product.original_price,
                thumbnail: product.thumbnail_url || '',
                format: product.format || '',
              })}
              className={`flex-1 h-12 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                inCart
                  ? 'bg-muted text-muted-foreground border border-border'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {inCart ? <><Check className="w-4 h-4" /> 장바구니에 담김</> :
                product.is_free ? <><Download className="w-4 h-4" /> 무료 다운로드</> :
                <><ShoppingCart className="w-4 h-4" /> 장바구니 담기</>}
            </button>
            <button className="h-12 px-4 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">⚠️ 디지털 상품 특성상 다운로드 후 환불이 제한될 수 있습니다.</p>
          </div>
        </div>
      </div>

      {/* Rich Description HTML */}
      {product.description_html && (
        <div className="mt-12 border border-border rounded-xl overflow-hidden">
          <div className="bg-muted/50 px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold">상품 상세 설명</h2>
          </div>
          <div
            className="p-6 sm:p-8 prose prose-base max-w-none prose-headings:text-foreground prose-headings:mt-8 prose-headings:mb-4 prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4 prose-li:text-muted-foreground prose-li:leading-relaxed prose-strong:text-foreground prose-ul:my-4 prose-ol:my-4 prose-hr:my-8"
            dangerouslySetInnerHTML={{ __html: product.description_html }}
          />
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="text-xl font-bold mb-6">관련 템플릿</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((p) => (
              <Link key={p.id} href={`/store/${p.id}`} className="group">
                <div className="border border-border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all">
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
                        <span className="text-4xl">📄</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2">{p.title}</h3>
                    <p className="text-primary font-bold mt-2">
                      {p.is_free ? '무료' : formatPrice(p.price)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
